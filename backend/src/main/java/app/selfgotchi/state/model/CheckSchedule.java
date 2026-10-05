package app.selfgotchi.state.model;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/**
 * Done once per day before a deadline.
 *
 * @param days            weekdays the task applies to; empty means every day
 * @param dueSoonMinutes  how long before the deadline the task turns DUE_SOON
 */
public record CheckSchedule(Recurrence recurrence, Set<DayOfWeek> days, LocalTime deadline, int dueSoonMinutes)
        implements Schedule {

    public static final int DEFAULT_DUE_SOON_MINUTES = 60;
    public static final int MAX_DUE_SOON_MINUTES = 12 * 60;

    public CheckSchedule {
        Objects.requireNonNull(recurrence, "recurrence");
        Objects.requireNonNull(deadline, "deadline");
        if (dueSoonMinutes < 0 || dueSoonMinutes > MAX_DUE_SOON_MINUTES) {
            throw new IllegalArgumentException("dueSoonMinutes must be between 0 and " + MAX_DUE_SOON_MINUTES);
        }
        days = days == null || days.isEmpty()
            ? Collections.unmodifiableSet(EnumSet.noneOf(DayOfWeek.class))
            : Collections.unmodifiableSet(EnumSet.copyOf(days));
    }

    public static CheckSchedule daily(LocalTime deadline) {
        return new CheckSchedule(Recurrence.DAILY, Set.of(), deadline, DEFAULT_DUE_SOON_MINUTES);
    }

    /** Whether the task is due on a logical day falling on this weekday. */
    public boolean appliesOn(DayOfWeek day) {
        return days.isEmpty() || days.contains(day);
    }

    @Override
    public TaskType type() {
        return TaskType.CHECK;
    }
}
