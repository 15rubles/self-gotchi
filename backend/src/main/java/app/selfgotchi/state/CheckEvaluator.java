package app.selfgotchi.state;

import java.time.Instant;
import java.time.LocalDate;

import app.selfgotchi.state.model.CheckSchedule;
import app.selfgotchi.state.model.TaskEvaluation;
import app.selfgotchi.state.model.TaskStatus;

/**
 * Checkmark: 0 done or upcoming, 1 due soon, 2 missed, 3 missed and the previous scheduled
 * occurrence was missed too. Any completion within the logical day clears it, even a late one.
 */
final class CheckEvaluator {

    private CheckEvaluator() {
    }

    static TaskEvaluation evaluate(TaskContext c, CheckSchedule s) {
        int streak = streak(c, s);
        if (!s.appliesOn(c.today.getDayOfWeek())) {
            return c.off(streak);
        }
        Instant deadline = c.day.at(c.today, s.deadline());
        Long latest = c.latestIdOn(c.today);
        if (latest != null) {
            return result(c, TaskStatus.DONE, 0, deadline, 1, streak, latest);
        }
        if (!c.existedBefore(deadline)) {
            return c.off(streak);
        }
        if (c.now.isBefore(deadline.minusSeconds(s.dueSoonMinutes() * 60L))) {
            return result(c, TaskStatus.UPCOMING, 0, deadline, 0, streak, null);
        }
        if (c.now.isBefore(deadline)) {
            return result(c, TaskStatus.DUE_SOON, 1, deadline, 0, streak, null);
        }
        LocalDate previous = previousScheduled(s, c.today);
        boolean missedInARow = isMissable(c, s, previous) && c.on(previous).isEmpty();
        return result(c, TaskStatus.MISSED, missedInARow ? 3 : 2, deadline, 0, streak, null);
    }

    /** Whether the task was due on that date at all (scheduled, and existed before the deadline). */
    static boolean isMissable(TaskContext c, CheckSchedule s, LocalDate date) {
        return date != null
            && s.appliesOn(date.getDayOfWeek())
            && c.existedBefore(c.day.at(date, s.deadline()));
    }

    private static LocalDate previousScheduled(CheckSchedule s, LocalDate date) {
        for (int i = 1; i <= 7; i++) {
            LocalDate candidate = date.minusDays(i);
            if (s.appliesOn(candidate.getDayOfWeek())) {
                return candidate;
            }
        }
        return null;
    }

    /** Consecutive scheduled days done, through today if done, otherwise through yesterday. */
    static int streak(TaskContext c, CheckSchedule s) {
        LocalDate date = c.on(c.today).isEmpty() ? c.today.minusDays(1) : c.today;
        int streak = 0;
        for (int i = 0; i < TaskContext.MAX_LOOKBACK && !date.isBefore(c.createdDate); i++, date = date.minusDays(1)) {
            if (!s.appliesOn(date.getDayOfWeek())) {
                continue;
            }
            if (c.on(date).isEmpty()) {
                break;
            }
            streak++;
        }
        return streak;
    }

    private static TaskEvaluation result(TaskContext c, TaskStatus status, int severity, Instant dueAt, int done,
                                         int streak, Long latest) {
        return new TaskEvaluation(c.task.id(), status, severity, dueAt, done, 1, streak, null, latest);
    }
}
