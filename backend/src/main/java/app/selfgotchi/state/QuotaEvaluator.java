package app.selfgotchi.state;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;

import app.selfgotchi.state.model.QuotaSchedule;
import app.selfgotchi.state.model.TaskEvaluation;
import app.selfgotchi.state.model.TaskStatus;

/**
 * Weekly quota, judged against pace: expected = floor(timesPerWeek x fullDaysElapsed / 7);
 * severity = sessions behind that (max 2), or 3 once the week can no longer be met assuming
 * at most one session per remaining day. The week the task was created is a grace week.
 */
final class QuotaEvaluator {

    private QuotaEvaluator() {
    }

    static TaskEvaluation evaluate(TaskContext c, QuotaSchedule s) {
        LocalDate weekStart = weekStart(c.today, s);
        int dayIndex = (int) ChronoUnit.DAYS.between(weekStart, c.today);
        int target = s.timesPerWeek();
        int done = c.countBetween(weekStart, c.today);
        int remaining = Math.max(0, target - done);
        int daysLeft = 7 - dayIndex;
        boolean doneToday = !c.on(c.today).isEmpty();
        boolean graceWeek = !c.createdDate.isBefore(weekStart);

        int severity;
        TaskStatus status;
        if (remaining == 0) {
            severity = 0;
            status = TaskStatus.DONE;
        } else if (graceWeek) {
            severity = 0;
            status = doneToday ? TaskStatus.DONE : TaskStatus.UPCOMING;
        } else if (remaining > daysLeft) {
            severity = 3;
            status = TaskStatus.MISSED;
        } else {
            int expected = target * dayIndex / 7;
            severity = Math.clamp(expected - done, 0, 2);
            if (severity > 0) {
                status = TaskStatus.MISSED;
            } else if (doneToday) {
                status = TaskStatus.DONE;
            } else if (remaining == daysLeft) {
                status = TaskStatus.DUE_SOON;
            } else {
                status = TaskStatus.UPCOMING;
            }
        }
        return new TaskEvaluation(c.task.id(), status, severity, c.day.start(weekStart.plusDays(7)), done, target,
            streak(c, s, weekStart), null, c.latestIdOn(c.today));
    }

    static LocalDate weekStart(LocalDate date, QuotaSchedule s) {
        return date.with(TemporalAdjusters.previousOrSame(s.weekStarts()));
    }

    /** Consecutive weeks with the quota met, through this week if already met, otherwise through last week. */
    private static int streak(TaskContext c, QuotaSchedule s, LocalDate thisWeek) {
        LocalDate week = met(c, s, thisWeek) ? thisWeek : thisWeek.minusWeeks(1);
        int streak = 0;
        for (int i = 0; i < TaskContext.MAX_LOOKBACK && !week.plusDays(6).isBefore(c.createdDate);
             i++, week = week.minusWeeks(1)) {
            if (!met(c, s, week)) {
                break;
            }
            streak++;
        }
        return streak;
    }

    private static boolean met(TaskContext c, QuotaSchedule s, LocalDate weekStart) {
        return c.countBetween(weekStart, weekStart.plusDays(6)) >= s.timesPerWeek();
    }
}
