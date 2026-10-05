package app.selfgotchi.task;

import java.util.List;

import app.selfgotchi.state.TaskValidator.Violation;

/** A task or schedule failed validation; carries one entry per offending field. */
public class InvalidTaskException extends RuntimeException {

    private final List<Violation> violations;

    public InvalidTaskException(List<Violation> violations) {
        super(violations.stream().map(v -> v.field() + ": " + v.message()).reduce((a, b) -> a + "; " + b).orElse(""));
        this.violations = List.copyOf(violations);
    }

    public InvalidTaskException(String field, String message) {
        this(List.of(new Violation(field, message)));
    }

    public List<Violation> violations() {
        return violations;
    }
}
