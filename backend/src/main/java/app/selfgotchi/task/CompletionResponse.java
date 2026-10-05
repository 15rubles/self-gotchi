package app.selfgotchi.task;

import java.time.Instant;

public record CompletionResponse(long id, long taskId, Instant completedAt, CompletionSource source) {

    public static CompletionResponse from(TaskCompletion completion) {
        return new CompletionResponse(completion.getId(), completion.getTaskId(), completion.getCompletedAt(),
            completion.getSource());
    }
}
