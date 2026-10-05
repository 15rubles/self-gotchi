package app.selfgotchi.state;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import app.selfgotchi.state.model.CompletionLog;
import app.selfgotchi.state.model.FreshnessSchedule;
import app.selfgotchi.state.model.TaskEvaluation;
import app.selfgotchi.state.model.TaskStatus;

/**
 * Freshness timer: severity is how many thresholds the days since last done (or since creation)
 * have reached. A completion resets the timer fully. No streak.
 */
final class FreshnessEvaluator {

    private FreshnessEvaluator() {
    }

    static TaskEvaluation evaluate(TaskContext c, FreshnessSchedule s) {
        CompletionLog last = c.logs.isEmpty() ? null : c.logs.getLast();
        LocalDate lastDate = last == null ? c.createdDate : c.day.dateOf(last.completedAt());
        int days = (int) ChronoUnit.DAYS.between(lastDate, c.today);
        int severity = 0;
        for (int threshold : s.thresholdsDays()) {
            if (days >= threshold) {
                severity++;
            }
        }
        boolean doneToday = last != null && lastDate.equals(c.today);
        TaskStatus status = doneToday ? TaskStatus.DONE : severity > 0 ? TaskStatus.MISSED : TaskStatus.UPCOMING;
        return new TaskEvaluation(c.task.id(), status, severity,
            c.day.start(lastDate.plusDays(s.thresholdsDays().getFirst())),
            doneToday ? 1 : 0, 1, 0, days, doneToday ? last.id() : null);
    }
}
