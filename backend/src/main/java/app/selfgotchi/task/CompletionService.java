package app.selfgotchi.task;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.selfgotchi.common.ConflictException;
import app.selfgotchi.common.NotFoundException;
import app.selfgotchi.common.ValidationException;
import app.selfgotchi.state.model.CompletionLog;
import app.selfgotchi.user.User;

/** The completion log: append on "done", delete on undo. */
@Service
@Transactional
public class CompletionService {

    /** Tolerates small clock differences between the phone and the server. */
    private static final Duration FUTURE_TOLERANCE = Duration.ofMinutes(1);

    private final TaskService tasks;
    private final TaskCompletionRepository completions;
    private final Clock clock;

    public CompletionService(TaskService tasks, TaskCompletionRepository completions, Clock clock) {
        this.tasks = tasks;
        this.completions = completions;
        this.clock = clock;
    }

    /** @param completedAt when it was done ("I did it earlier"); null means now */
    public TaskCompletion complete(User user, long taskId, Instant completedAt, CompletionSource source) {
        Task task = tasks.get(user, taskId);
        if (!task.isActive()) {
            throw new ConflictException("task " + taskId + " is archived");
        }
        Instant now = clock.instant();
        Instant at = (completedAt == null ? now : completedAt).truncatedTo(ChronoUnit.MICROS); // Postgres precision
        if (at.isAfter(now.plus(FUTURE_TOLERANCE))) {
            throw new ValidationException("completedAt", "cannot be in the future");
        }
        if (at.isBefore(task.getCreatedAt())) {
            throw new ValidationException("completedAt", "cannot be before the task was created");
        }
        return completions.save(new TaskCompletion(task.getId(), user.getId(), at, source, now));
    }

    public void undo(User user, long completionId) {
        TaskCompletion completion = completions.findByIdAndUserId(completionId, user.getId())
            .orElseThrow(() -> new NotFoundException("completion " + completionId + " not found"));
        completions.delete(completion);
    }

    /** The user's completions in {@code [from, to)}, oldest first (for the history day editor). */
    @Transactional(readOnly = true)
    public List<TaskCompletion> between(User user, Instant from, Instant toExclusive) {
        return completions
            .findByUserIdAndCompletedAtGreaterThanEqualAndCompletedAtLessThanEqualOrderByCompletedAtAsc(
                user.getId(), from, toExclusive.minusNanos(1))
            .stream()
            .filter(c -> c.getCompletedAt().isBefore(toExclusive))
            .toList();
    }

    /** Completions in {@code [from, to]} as engine log entries, oldest first. */
    @Transactional(readOnly = true)
    public List<CompletionLog> logs(User user, Instant from, Instant to) {
        return completions
            .findByUserIdAndCompletedAtGreaterThanEqualAndCompletedAtLessThanEqualOrderByCompletedAtAsc(
                user.getId(), from, to)
            .stream()
            .map(c -> new CompletionLog(c.getId(), c.getTaskId(), c.getCompletedAt()))
            .toList();
    }
}
