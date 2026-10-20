package app.selfgotchi.avatar;

/** The image model failed; the message is shown to the user on the avatar draft. */
public class ImageGenerationException extends RuntimeException {

    public ImageGenerationException(String message) {
        super(message);
    }
}
