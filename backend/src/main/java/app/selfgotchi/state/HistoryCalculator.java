package app.selfgotchi.state;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import app.selfgotchi.state.model.CheckSchedule;
import app.selfgotchi.state.model.CompletionLog;
import app.selfgotchi.state.model.DayResult;
import app.selfgotchi.state.model.FreshnessSchedule;
import app.selfgotchi.state.model.MeterSchedule;
import app.selfgotchi.state.model.QuotaSchedule;
import app.selfgotchi.state.model.TaskDef;
import app.selfgotchi.state.model.TaskHistory;

/** Pure per-day results and streaks for the history screen. Uses the same rules as the engine. */
public final class HistoryCalculator {

    private final EngineConfig config;

    public HistoryCalculator(EngineConfig config) {
        this.config = config;
    }

    /**
     * @param logs        this task's completions (any order); those after {@code now} are ignored
     * @param archivedAt  when the task was archived, or null; later days are NONE
     */
    public TaskHistory history(TaskDef task, Instant archivedAt, List<CompletionLog> logs, LocalDate from,
                               LocalDate to, Instant now, ZoneId zone) {
        LogicalDay day = new LogicalDay(zone, config.dayResetHour());
        List<CompletionLog> sorted = logs.stream()
            .filter(log -> log.taskId() == task.id() && !log.completedAt().isAfter(now))
            .sorted(Comparator.comparing(CompletionLog::completedAt).thenComparingLong(CompletionLog::id))
            .toList();
        TaskContext c = new TaskContext(task, sorted, day, now);
        LocalDate lastDay = archivedAt == null ? c.today : min(c.today, day.dateOf(archivedAt));

        List<TaskHistory.Day> days = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            DayResult result = date.isBefore(c.createdDate) || date.isAfter(lastDay)
                ? DayResult.NONE
                : resultOn(c, date);
            days.add(new TaskHistory.Day(date, result, c.on(date).size()));
        }

        boolean active = archivedAt == null && !now.isBefore(task.createdAt());
        int current = active
            ? new StateEngine(config).evaluate(List.of(task), sorted, now, zone).tasks().getFirst().streak()
            : 0;
        int best = Math.max(current, bestStreak(c, lastDay));
        return new TaskHistory(task.id(), days, current, best);
    }

    private static DayResult resultOn(TaskContext c, LocalDate date) {
        return switch (c.task.schedule()) {
            case CheckSchedule s -> checkResult(c, s, date);
            case MeterSchedule s -> meterResult(c, s, date);
            case QuotaSchedule s -> c.on(date).isEmpty() ? DayResult.NONE : DayResult.ON_TIME;
            case FreshnessSchedule s -> c.on(date).isEmpty() ? DayResult.NONE : DayResult.ON_TIME;
        };
    }

    private static DayResult checkResult(TaskContext c, CheckSchedule s, LocalDate date) {
        Instant deadline = c.day.at(date, s.deadline());
        List<CompletionLog> done = c.on(date);
        if (!done.isEmpty()) {
            return done.getFirst().completedAt().isAfter(deadline) ? DayResult.LATE : DayResult.ON_TIME;
        }
        if (!CheckEvaluator.isMissable(c, s, date)) {
            return DayResult.OFF;
        }
        return c.now.isBefore(deadline) ? DayResult.PENDING : DayResult.MISSED;
    }

    private static DayResult meterResult(TaskContext c, MeterSchedule s, LocalDate date) {
        List<CompletionLog> counted = MeterEvaluator.countedCompletions(c, s, date);
        List<Instant> deadlines = MeterEvaluator.deadlines(c.day, date, s);
        if (counted.size() == deadlines.size()) {
            for (int i = 0; i < counted.size(); i++) {
                if (counted.get(i).completedAt().isAfter(deadlines.get(i))) {
                    return DayResult.LATE;
                }
            }
            return DayResult.ON_TIME;
        }
        if (date.equals(c.today)) {
            return DayResult.PENDING;
        }
        if (date.equals(c.createdDate)) {
            return DayResult.NONE; // some slots were due before the task existed
        }
        return counted.isEmpty() ? DayResult.MISSED : DayResult.PARTIAL;
    }

    /** Longest run of completed periods between creation and {@code lastDay}. */
    private static int bestStreak(TaskContext c, LocalDate lastDay) {
        if (c.task.schedule() instanceof QuotaSchedule s) {
            return bestWeekStreak(c, s, lastDay);
        }
        if (c.task.schedule() instanceof FreshnessSchedule) {
            return 0;
        }
        int best = 0;
        int run = 0;
        for (LocalDate date = c.createdDate; !date.isAfter(lastDay); date = date.plusDays(1)) {
            boolean done;
            if (c.task.schedule() instanceof CheckSchedule s) {
                if (!s.appliesOn(date.getDayOfWeek())) {
                    continue;
                }
                done = !c.on(date).isEmpty();
            } else {
                MeterSchedule s = (MeterSchedule) c.task.schedule();
                done = MeterEvaluator.filledSlots(c, s, date) >= s.slotCount();
            }
            if (done) {
                best = Math.max(best, ++run);
            } else if (date.isBefore(c.today)) {
                run = 0; // an unfinished today doesn't break the run yet
            }
        }
        return best;
    }

    private static int bestWeekStreak(TaskContext c, QuotaSchedule s, LocalDate lastDay) {
        int best = 0;
        int run = 0;
        LocalDate lastWeek = QuotaEvaluator.weekStart(lastDay, s);
        for (LocalDate week = QuotaEvaluator.weekStart(c.createdDate, s); !week.isAfter(lastWeek);
             week = week.plusWeeks(1)) {
            if (c.countBetween(week, week.plusDays(6)) >= s.timesPerWeek()) {
                best = Math.max(best, ++run);
            } else if (week.isBefore(lastWeek)) {
                run = 0;
            }
        }
        return best;
    }

    private static LocalDate min(LocalDate a, LocalDate b) {
        return a.isBefore(b) ? a : b;
    }
}
