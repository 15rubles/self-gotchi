package app.selfgotchi.common;

/**
 * Maps to HTTP 404. Also used when the row exists but belongs to another user,
 * so ids from other accounts are indistinguishable from missing ones.
 */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
