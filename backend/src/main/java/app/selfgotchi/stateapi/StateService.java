package app.selfgotchi.stateapi;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.selfgotchi.common.ValidationException;
import app.selfgotchi.state.EngineConfig;
import app.selfgotchi.state.Evaluation;
import app.selfgotchi.state.HistoryCalculator;
import app.selfgotchi.state.LogicalDay;
import app.selfgotchi.state.StateEngine;
import app.selfgotchi.state.model.CompletionLog;
import app.selfgotchi.state.model.TaskDef;
import app.selfgotchi.state.model.TaskEvaluation;
import app.selfgotchi.task.CompletionService;
import app.selfgotchi.task.Task;
import app.selfgotchi.task.TaskService;
import app.selfgotchi.user.User;

/** Loads a user's tasks and completion log and runs the pure engine over them. */
@Service
@Transactional(readOnly = true)
public class StateService {

    /** How far back /state loads completions; bounds streak lengths in the home screen. */
    static final Duration STATE_LOOKBACK = Duration.ofDays(400);
    static final int DEFAULT_HISTORY_DAYS = 84;
    static final int MAX_HISTORY_DAYS = 400;

    private final TaskService tasks;
    private final CompletionService completions;
    private final Clock clock;

    public StateService(TaskService tasks, CompletionService completions, Clock clock) {
        this.tasks = tasks;
        this.completions = completions;
        this.clock = clock;
    }

    /** @param at preview time, or null for now */
    public StateResponse state(User user, Instant at) {
        Instant when = at == null ? clock.instant() : at;
        List<Task> active = tasks.list(user, false);
        List<TaskDef> defs = active.stream().map(tasks::toDef).toList();
        List<CompletionLog> logs = completions.logs(user, when.minus(STATE_LOOKBACK), when);

        Evaluation evaluation = engine(user).evaluate(defs, logs, when, user.getZoneId());

        List<StateResponse.TaskState> taskStates = new ArrayList<>();
        for (int i = 0; i < active.size(); i++) {
            Task task = active.get(i);
            TaskEvaluation e = evaluation.tasks().get(i);
            taskStates.add(new StateResponse.TaskState(task.getId(), task.getName(), task.getCategory(),
                task.getType(), task.getEffectKey(), task.getSortOrder(), e.status(), e.severity(), e.dueAt(),
                e.done(), e.target(), e.streak(), e.daysSinceDone(), e.latestCompletionId()));
        }
        return new StateResponse(when, at != null, evaluation.logicalDate(), user.getZoneId().getId(),
            evaluation.character(), taskStates);
    }

    /** @param from first logical day, default 12 weeks before {@code to}; @param to last day, default today */
    public HistoryResponse history(User user, LocalDate from, LocalDate to) {
        Instant now = clock.instant();
        LocalDate today = new LogicalDay(user.getZoneId(), user.getDayResetHour()).dateOf(now);
        LocalDate end = to == null ? today : to;
        LocalDate start = from == null ? end.minusDays(DEFAULT_HISTORY_DAYS - 1) : from;
        if (start.isAfter(end)) {
            throw new ValidationException("from", "must not be after 'to'");
        }
        if (ChronoUnit.DAYS.between(start, end) >= MAX_HISTORY_DAYS) {
            throw new ValidationException("from", "range is limited to " + MAX_HISTORY_DAYS + " days");
        }

        HistoryCalculator calculator = new HistoryCalculator(EngineConfig.withResetHour(user.getDayResetHour()));
        Map<Long, List<CompletionLog>> logsByTask = completions.logs(user, Instant.EPOCH, now).stream()
            .collect(Collectors.groupingBy(CompletionLog::taskId));

        List<HistoryResponse.TaskEntry> entries = new ArrayList<>();
        for (Task task : tasks.list(user, true)) {
            var history = calculator.history(tasks.toDef(task), task.getArchivedAt(),
                logsByTask.getOrDefault(task.getId(), List.of()), start, end, now, user.getZoneId());
            entries.add(new HistoryResponse.TaskEntry(task.getId(), task.getName(), task.getCategory(),
                task.getType(), task.getEffectKey(), task.isActive(), task.getArchivedAt(), history.currentStreak(),
                history.bestStreak(), history.days()));
        }
        return new HistoryResponse(start, end, entries);
    }

    private static StateEngine engine(User user) {
        return new StateEngine(EngineConfig.withResetHour(user.getDayResetHour()));
    }
}
