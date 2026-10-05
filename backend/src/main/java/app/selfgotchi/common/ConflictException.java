package app.selfgotchi.common;

/** The request is valid but the resource's state doesn't allow it (e.g. editing an archived task). HTTP 409. */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
