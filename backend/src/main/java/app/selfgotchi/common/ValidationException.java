package app.selfgotchi.common;

import java.util.List;

import app.selfgotchi.state.TaskValidator.Violation;

/** A request failed validation; carries one entry per offending field. Maps to HTTP 400. */
public class ValidationException extends RuntimeException {

    private final List<Violation> violations;

    public ValidationException(List<Violation> violations) {
        super(violations.stream().map(v -> v.field() + ": " + v.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        this.violations = List.copyOf(violations);
    }

    public ValidationException(String field, String message) {
        this(List.of(new Violation(field, message)));
    }

    public List<Violation> violations() {
        return violations;
    }
}
