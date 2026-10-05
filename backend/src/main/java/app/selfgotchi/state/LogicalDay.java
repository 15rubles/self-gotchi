package app.selfgotchi.state;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * Maps instants to "logical days" that start at the user's reset hour instead of midnight,
 * so a completion at 01:30 counts for the previous day when the reset hour is 04:00.
 *
 * <p>A wall-clock time on logical day D means D at that time if it is at or after the reset
 * hour, otherwise D+1 at that time (e.g. a 01:00 deadline is the night after D).
 * Nonexistent local times (DST gap) are shifted forward by the gap length and ambiguous ones
 * (DST overlap) use the earlier offset, per {@link ZonedDateTime#of}.
 */
public final class LogicalDay {

    private static final int MINUTES_PER_DAY = 24 * 60;

    private final ZoneId zone;
    private final int resetHour;
    private final LocalTime resetTime;

    public LogicalDay(ZoneId zone, int resetHour) {
        if (resetHour < 0 || resetHour > 23) {
            throw new IllegalArgumentException("resetHour must be between 0 and 23");
        }
        this.zone = zone;
        this.resetHour = resetHour;
        this.resetTime = LocalTime.of(resetHour, 0);
    }

    public ZoneId zone() {
        return zone;
    }

    public int resetHour() {
        return resetHour;
    }

    /** The logical day an instant belongs to. */
    public LocalDate dateOf(Instant instant) {
        ZonedDateTime local = instant.atZone(zone);
        LocalDate date = local.toLocalDate();
        return local.toLocalTime().isBefore(resetTime) ? date.minusDays(1) : date;
    }

    /** First instant of a logical day (inclusive). */
    public Instant start(LocalDate logicalDate) {
        return ZonedDateTime.of(logicalDate, resetTime, zone).toInstant();
    }

    /** First instant after a logical day (exclusive end). */
    public Instant end(LocalDate logicalDate) {
        return start(logicalDate.plusDays(1));
    }

    /** The instant a wall-clock time falls on within a logical day. */
    public Instant at(LocalDate logicalDate, LocalTime time) {
        LocalDate calendarDate = time.isBefore(resetTime) ? logicalDate.plusDays(1) : logicalDate;
        return ZonedDateTime.of(calendarDate, time, zone).toInstant();
    }

    public boolean contains(LocalDate logicalDate, Instant instant) {
        return !instant.isBefore(start(logicalDate)) && instant.isBefore(end(logicalDate));
    }

    /** Minutes from the reset hour to the given wall-clock time; orders times within a logical day. */
    public static int minutesIntoDay(LocalTime time, int resetHour) {
        int minutes = time.getHour() * 60 + time.getMinute() - resetHour * 60;
        return Math.floorMod(minutes, MINUTES_PER_DAY);
    }
}
