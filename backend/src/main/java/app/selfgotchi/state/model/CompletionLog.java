package app.selfgotchi.state.model;

import java.time.Instant;
import java.util.Objects;

/** One completion event from the log. */
public record CompletionLog(long id, long taskId, Instant completedAt) {

    public CompletionLog {
        Objects.requireNonNull(completedAt, "completedAt");
    }
}
