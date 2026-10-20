package app.selfgotchi.common;

/** A feature that needs server configuration that's missing (e.g. no image API key). HTTP 503. */
public class UnavailableException extends RuntimeException {

    public UnavailableException(String message) {
        super(message);
    }
}
