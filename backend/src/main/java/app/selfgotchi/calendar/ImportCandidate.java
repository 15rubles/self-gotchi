package app.selfgotchi.calendar;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * One calendar event (a whole series for recurring ones) proposed as a checkmark habit.
 * Nothing is saved: the review screen edits these and creates habits through {@code POST /tasks}.
 *
 * @param uid              the event's UID, stored on the habit to skip it on the next import
 * @param deadline         "done by": the event's end time in the user's zone (start if it has no
 *                         end or ends on another day; 23:59 for all-day events)
 * @param recurring        a repeating series (imported as a daily / weekday checkmark)
 * @param days             recurring: weekdays it repeats on, empty = every day
 * @param date             one-off: the day it happens; recurring: when the series started
 * @param alreadyImported  a habit with this UID exists (not selected by default)
 * @param notes            what was approximated, e.g. "Repeats every 2 weeks; imported as weekly"
 */
public record ImportCandidate(
    String uid,
    String name,
    boolean recurring,
    List<DayOfWeek> days,
    LocalDate date,
    LocalTime deadline,
    boolean allDay,
    boolean alreadyImported,
    List<String> notes) {
}
