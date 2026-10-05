package app.selfgotchi.state;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

import app.selfgotchi.state.model.CompletionLog;
import app.selfgotchi.state.model.TaskDef;
import app.selfgotchi.state.model.TaskEvaluation;
import app.selfgotchi.state.model.TaskStatus;

/** One task, its completions up to {@code now} grouped by logical day, and the evaluation time. */
final class TaskContext {

    /** Streak walks stop after this many periods; keeps the engine bounded on bad input. */
    static final int MAX_LOOKBACK = 800;

    final TaskDef task;
    final LogicalDay day;
    final Instant now;
    final LocalDate today;
    final LocalDate createdDate;
    final List<CompletionLog> logs;
    private final TreeMap<LocalDate, List<CompletionLog>> byDate = new TreeMap<>();

    /** @param logs this task's completions at or before {@code now}, oldest first */
    TaskContext(TaskDef task, List<CompletionLog> logs, LogicalDay day, Instant now) {
        this.task = task;
        this.day = day;
        this.now = now;
        this.today = day.dateOf(now);
        this.createdDate = day.dateOf(task.createdAt());
        this.logs = logs;
        for (CompletionLog log : logs) {
            byDate.computeIfAbsent(day.dateOf(log.completedAt()), d -> new ArrayList<>()).add(log);
        }
    }

    /** Completions on a logical day, oldest first. */
    List<CompletionLog> on(LocalDate date) {
        return byDate.getOrDefault(date, List.of());
    }

    /** Number of completions on logical days in {@code [from, to]}. */
    int countBetween(LocalDate from, LocalDate to) {
        int count = 0;
        for (Map.Entry<LocalDate, List<CompletionLog>> entry : byDate.subMap(from, true, to, true).entrySet()) {
            count += entry.getValue().size();
        }
        return count;
    }

    Long latestIdOn(LocalDate date) {
        List<CompletionLog> logsOnDate = on(date);
        return logsOnDate.isEmpty() ? null : logsOnDate.getLast().id();
    }

    /** A deadline set before the task existed can't be missed. */
    boolean existedBefore(Instant deadline) {
        return !deadline.isBefore(task.createdAt());
    }

    TaskEvaluation off(int streak) {
        return new TaskEvaluation(task.id(), TaskStatus.OFF, 0, null, 0, 0, streak, null, null);
    }
}
