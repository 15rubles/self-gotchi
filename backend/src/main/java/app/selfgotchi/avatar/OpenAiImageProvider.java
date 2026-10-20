package app.selfgotchi.avatar;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * OpenAI's image edit endpoint ({@code POST /images/edits}), as {@code generate-avatar.mjs} uses it:
 * prompt + reference images in, one 1024x1024 transparent WebP out. Retries rate limits, 5xx and
 * network errors with backoff; an empty balance or a daily quota fails at once.
 */
@Component
public class OpenAiImageProvider implements ImageGenerationProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAiImageProvider.class);
    private static final int ATTEMPTS = 5;
    private static final Pattern PERMANENT = Pattern.compile("per day|insufficient_quota|billing", Pattern.CASE_INSENSITIVE);
    /** Only these models take input_fidelity; high keeps the reference's face closer. */
    private static final Pattern FIDELITY_MODELS = Pattern.compile("gpt-image-1(\\.5)?");

    private final AvatarProperties.OpenAi config;
    private final ObjectMapper json;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

    public OpenAiImageProvider(AvatarProperties properties, ObjectMapper json) {
        this.config = properties.openai();
        this.json = json;
    }

    @Override
    public boolean isConfigured() {
        return config.apiKey() != null && !config.apiKey().isBlank();
    }

    @Override
    public Image edit(String prompt, List<Image> references) {
        Multipart body = new Multipart();
        body.field("model", config.model());
        body.field("prompt", prompt);
        int i = 0;
        for (Image reference : references) {
            body.file("image[]", "reference-" + (i++) + "." + AvatarStorage.extension(reference.mediaType()), reference);
        }
        body.field("size", "1024x1024");
        body.field("quality", config.quality());
        body.field("background", "transparent");
        // WebP keeps the transparency at a tenth of the PNG size (the server can't convert PNG itself).
        body.field("output_format", "webp");
        body.field("output_compression", "90");
        if (FIDELITY_MODELS.matcher(config.model()).matches()) {
            body.field("input_fidelity", "high");
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create(config.baseUrl() + "/images/edits"))
            .timeout(Duration.ofMinutes(4))
            .header("Authorization", "Bearer " + config.apiKey())
            .header("Content-Type", "multipart/form-data; boundary=" + body.boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(body.finish()))
            .build();

        for (int attempt = 1; ; attempt++) {
            HttpResponse<String> response;
            try {
                response = client.send(request, HttpResponse.BodyHandlers.ofString());
            } catch (IOException e) {
                if (attempt >= ATTEMPTS) {
                    throw new ImageGenerationException("couldn't reach OpenAI (" + e.getClass().getSimpleName() + ")");
                }
                backoff(attempt, e.getClass().getSimpleName());
                continue;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ImageGenerationException("interrupted");
            }
            int status = response.statusCode();
            String text = response.body();
            boolean permanent = status == 429 && PERMANENT.matcher(text).find();
            if ((status == 429 || status >= 500) && !permanent && attempt < ATTEMPTS) {
                backoff(attempt, "HTTP " + status);
                continue;
            }
            if (status != 200) {
                throw new ImageGenerationException("OpenAI answered HTTP " + status + ": " + message(text));
            }
            return decode(text);
        }
    }

    private Image decode(String text) {
        JsonNode data;
        try {
            data = json.readTree(text).path("data").path(0).path("b64_json");
        } catch (IOException e) {
            throw new ImageGenerationException("OpenAI sent a response that isn't JSON");
        }
        if (!data.isTextual()) {
            throw new ImageGenerationException("OpenAI sent no image");
        }
        byte[] bytes = Base64.getDecoder().decode(data.asText());
        String type = AvatarStorage.sniff(bytes);
        if (type == null) {
            throw new ImageGenerationException("OpenAI sent an image in an unknown format");
        }
        return new Image(bytes, type);
    }

    /** The error message from an OpenAI error body, or the start of the body. */
    private String message(String text) {
        try {
            JsonNode message = json.readTree(text).path("error").path("message");
            if (message.isTextual()) {
                return message.asText();
            }
        } catch (IOException e) {
            // not JSON: fall through to the raw text
        }
        return text.length() > 300 ? text.substring(0, 300) : text;
    }

    private static void backoff(int attempt, String reason) {
        long wait = 2000L << attempt;
        log.warn("Image generation: {}, retrying in {}s", reason, wait / 1000);
        try {
            Thread.sleep(wait);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ImageGenerationException("interrupted");
        }
    }

    /** multipart/form-data, built by hand: java.net.http has no encoder for it. */
    private static final class Multipart {
        final String boundary = "sg-" + UUID.randomUUID();
        private final ByteArrayOutputStream out = new ByteArrayOutputStream();

        void field(String name, String value) {
            write("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name + "\"\r\n\r\n" + value + "\r\n");
        }

        void file(String name, String filename, Image image) {
            write("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name + "\"; filename=\"" + filename
                + "\"\r\nContent-Type: " + image.mediaType() + "\r\n\r\n");
            out.writeBytes(image.data());
            write("\r\n");
        }

        byte[] finish() {
            write("--" + boundary + "--\r\n");
            return out.toByteArray();
        }

        private void write(String text) {
            out.writeBytes(text.getBytes(StandardCharsets.UTF_8));
        }
    }
}
