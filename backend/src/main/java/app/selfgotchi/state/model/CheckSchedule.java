package app.selfgotchi.state.model;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/**
 * Done once per day before a deadline, or once on a single date.
 *
 * @param days            DAILY: weekdays the task applies to, empty means every day; ONCE: empty
 * @param dueSoonMinutes  how long before the deadline the task turns DUE_SOON
 * @param date            ONCE: the logical day it's due; DAILY: null
 */
public record CheckSchedule(Recurrence recurrence, Set<DayOfWeek> days, LocalTime deadline, int dueSoonMinutes,
                            LocalDate date)
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
        if (recurrence == Recurrence.ONCE && (date == null || !days.isEmpty())) {
            throw new IllegalArgumentException("a one-time checkmark needs a date and no weekdays");
        }
        if (recurrence == Recurrence.DAILY && date != null) {
            throw new IllegalArgumentException("only a one-time checkmark has a date");
        }
    }

    /** A repeating checkmark (the original 4-field form). */
    public CheckSchedule(Recurrence recurrence, Set<DayOfWeek> days, LocalTime deadline, int dueSoonMinutes) {
        this(recurrence, days, deadline, dueSoonMinutes, null);
    }

    public static CheckSchedule daily(LocalTime deadline) {
        return new CheckSchedule(Recurrence.DAILY, Set.of(), deadline, DEFAULT_DUE_SOON_MINUTES);
    }

    /** Whether the task is due on this logical day. */
    public boolean appliesOn(LocalDate day) {
        return recurrence == Recurrence.ONCE ? day.equals(date) : days.isEmpty() || days.contains(day.getDayOfWeek());
    }

    @Override
    public TaskType type() {
        return TaskType.CHECK;
    }
}
