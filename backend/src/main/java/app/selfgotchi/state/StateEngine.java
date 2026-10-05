package app.selfgotchi.state;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import app.selfgotchi.state.model.CharacterState;
import app.selfgotchi.state.model.CheckSchedule;
import app.selfgotchi.state.model.CompletionLog;
import app.selfgotchi.state.model.FreshnessSchedule;
import app.selfgotchi.state.model.MeterSchedule;
import app.selfgotchi.state.model.QuotaSchedule;
import app.selfgotchi.state.model.TaskDef;
import app.selfgotchi.state.model.TaskEvaluation;

/**
 * Pure function from tasks + completion log + time to the character state.
 * No I/O, no randomness, no clock: the caller passes {@code now}. Completions after
 * {@code now} are ignored, so the same log can preview any past or future moment.
 */
public final class StateEngine {

    private final EngineConfig config;

    public StateEngine(EngineConfig config) {
        this.config = config;
    }

    public CharacterState computeState(List<TaskDef> tasks, List<CompletionLog> completionLogs, Instant now,
                                       ZoneId zoneId) {
        return evaluate(tasks, completionLogs, now, zoneId).character();
    }

    public Evaluation evaluate(List<TaskDef> tasks, List<CompletionLog> completionLogs, Instant now, ZoneId zoneId) {
        LogicalDay day = new LogicalDay(zoneId, config.dayResetHour());
        Map<Long, List<CompletionLog>> logsByTask = groupUpTo(completionLogs, now);

        List<TaskEvaluation> evaluations = new ArrayList<>(tasks.size());
        for (TaskDef task : tasks) {
            TaskContext context = new TaskContext(task, logsByTask.getOrDefault(task.id(), List.of()), day, now);
            evaluations.add(evaluateTask(context));
        }
        CharacterState character = LayerResolver.resolve(tasks, evaluations, config.streakMinLength());
        return new Evaluation(day.dateOf(now), character, evaluations);
    }

    private static TaskEvaluation evaluateTask(TaskContext c) {
        if (c.now.isBefore(c.task.createdAt())) {
            return c.off(0);
        }
        return switch (c.task.schedule()) {
            case CheckSchedule s -> CheckEvaluator.evaluate(c, s);
            case MeterSchedule s -> MeterEvaluator.evaluate(c, s);
            case QuotaSchedule s -> QuotaEvaluator.evaluate(c, s);
            case FreshnessSchedule s -> FreshnessEvaluator.evaluate(c, s);
        };
    }

    /** Completions at or before {@code now}, per task, oldest first (ties by id). */
    private static Map<Long, List<CompletionLog>> groupUpTo(List<CompletionLog> logs, Instant now) {
        Map<Long, List<CompletionLog>> byTask = new HashMap<>();
        logs.stream()
            .filter(log -> !log.completedAt().isAfter(now))
            .sorted(Comparator.comparing(CompletionLog::completedAt).thenComparingLong(CompletionLog::id))
            .forEach(log -> byTask.computeIfAbsent(log.taskId(), id -> new ArrayList<>()).add(log));
        return byTask;
    }
}
