package app.selfgotchi.avatar;

import java.util.List;

/**
 * Port to the image model (OpenAI today, see {@link OpenAiImageProvider}). One operation is
 * enough for the whole pipeline: every frame is an edit of reference images by a prompt.
 */
public interface ImageGenerationProvider {

    /** Image bytes plus their media type, e.g. {@code image/webp}. */
    record Image(byte[] data, String mediaType) {
    }

    /** False when no API key is set; uploads are then refused with a clear message. */
    boolean isConfigured();

    /** A new 1024x1024 image with a transparent background, drawn from the references by the prompt. */
    Image edit(String prompt, List<Image> references);
}
