package app.selfgotchi.avatar;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param storageDir where photos and frames are kept, one folder per user and avatar
 * @param openai     the image model; generation is off while {@code apiKey} is empty
 */
@ConfigurationProperties("app.avatar")
public record AvatarProperties(String storageDir, OpenAi openai) {

    public record OpenAi(String apiKey, String model, String quality, String baseUrl) {
    }
}
