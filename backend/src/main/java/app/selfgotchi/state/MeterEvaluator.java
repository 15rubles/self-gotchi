package app.selfgotchi.state;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import app.selfgotchi.state.model.CheckSchedule;
import app.selfgotchi.state.model.CompletionLog;
import app.selfgotchi.state.model.MeterSchedule;
import app.selfgotchi.state.model.TaskEvaluation;
import app.selfgotchi.state.model.TaskStatus;

/**
 * Meter: N slots per day, each with a deadline. Completions closer than {@code minGapMinutes}
 * to the previous counted one don't count; counted completions fill the earliest open slots.
 * Severity is the number of slots whose deadline passed while still open, capped at 3.
 */
final class MeterEvaluator {

    private static final Duration DUE_SOON = Duration.ofMinutes(CheckSchedule.DEFAULT_DUE_SOON_MINUTES);

    private MeterEvaluator() {
    }

    static TaskEvaluation evaluate(TaskContext c, MeterSchedule s) {
        List<Instant> deadlines = deadlines(c.day, c.today, s);
        int slots = deadlines.size();
        int filled = filledSlots(c, s, c.today);
        int passed = 0;
        for (Instant deadline : deadlines) {
            if (!c.now.isBefore(deadline) && c.existedBefore(deadline)) {
                passed++;
            }
        }
        int missed = Math.max(0, passed - filled);
        int severity = Math.min(3, missed);
        Instant dueAt = filled < slots ? deadlines.get(filled) : deadlines.getLast();

        TaskStatus status;
        if (filled >= slots) {
            status = TaskStatus.DONE;
        } else if (missed > 0) {
            status = TaskStatus.MISSED;
        } else if (!c.now.isBefore(dueAt.minus(DUE_SOON))) {
            status = TaskStatus.DUE_SOON;
        } else {
            status = TaskStatus.UPCOMING;
        }
        return new TaskEvaluation(c.task.id(), status, severity, dueAt, filled, slots, streak(c, s), null,
            c.latestIdOn(c.today));
    }

    /** Slot deadlines on a logical day, in order. */
    static List<Instant> deadlines(LogicalDay day, LocalDate date, MeterSchedule s) {
        List<Instant> result = new ArrayList<>();
        if (s.hasExplicitSlots()) {
            for (LocalTime by : s.slots()) {
                result.add(day.at(date, by));
            }
            return result;
        }
        int count = s.count();
        if (count == 1) {
            result.add(day.at(date, s.firstBy()));
            return result;
        }
        int first = LogicalDay.minutesIntoDay(s.firstBy(), day.resetHour());
        int last = LogicalDay.minutesIntoDay(s.lastBy(), day.resetHour());
        LocalTime dayStart = LocalTime.of(day.resetHour(), 0);
        for (int i = 0; i < count; i++) {
            int minutes = first + (last - first) * i / (count - 1);
            result.add(day.at(date, dayStart.plusMinutes(minutes)));
        }
        return result;
    }

    /** Completions on a logical day that count toward slots, respecting the minimum gap, capped at the slot count. */
    static int filledSlots(TaskContext c, MeterSchedule s, LocalDate date) {
        Duration minGap = Duration.ofMinutes(s.minGapMinutes());
        Instant lastCounted = null;
        int counted = 0;
        for (CompletionLog log : c.on(date)) {
            if (lastCounted == null || !log.completedAt().isBefore(lastCounted.plus(minGap))) {
                counted++;
                lastCounted = log.completedAt();
            }
        }
        return Math.min(counted, s.slotCount());
    }

    /** Consecutive days with every slot filled, through today if full, otherwise through yesterday. */
    private static int streak(TaskContext c, MeterSchedule s) {
        int slots = s.slotCount();
        LocalDate date = filledSlots(c, s, c.today) >= slots ? c.today : c.today.minusDays(1);
        int streak = 0;
        for (int i = 0; i < TaskContext.MAX_LOOKBACK && !date.isBefore(c.createdDate); i++, date = date.minusDays(1)) {
            if (filledSlots(c, s, date) < slots) {
                break;
            }
            streak++;
        }
        return streak;
    }
}
