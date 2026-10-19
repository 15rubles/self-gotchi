package app.selfgotchi.calendar;

import java.io.IOException;
import java.io.StringReader;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.Temporal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import net.fortuna.ical4j.data.CalendarBuilder;
import net.fortuna.ical4j.data.ParserException;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.Component;
import net.fortuna.ical4j.model.Property;
import net.fortuna.ical4j.model.Recur;
import net.fortuna.ical4j.model.WeekDay;
import net.fortuna.ical4j.model.component.VEvent;
import net.fortuna.ical4j.model.property.DtEnd;
import net.fortuna.ical4j.model.property.DtStart;
import net.fortuna.ical4j.model.property.RRule;
import net.fortuna.ical4j.model.property.Summary;
import net.fortuna.ical4j.model.property.Uid;
import net.fortuna.ical4j.util.CompatibilityHints;

import app.selfgotchi.common.ValidationException;

/**
 * Turns an .ics calendar (Google, Outlook, Apple) into proposed checkmark habits. One habit per
 * event series: a recurring event becomes one repeating habit, a one-off event a one-time habit.
 *
 * <ul>
 *   <li>Skipped: cancelled events, one-offs before today or more than {@value #HORIZON_DAYS} days
 *       ahead, series that ended before today.</li>
 *   <li>DAILY and WEEKLY (every week) map exactly; anything else (every 2 weeks, monthly, yearly,
 *       "first Monday") becomes weekly on the start's weekday, with a note.</li>
 *   <li>Times are converted to the user's zone; changed single occurrences (RECURRENCE-ID) belong
 *       to their series and are not separate habits.</li>
 * </ul>
 */
public class IcsImporter {

    static final int HORIZON_DAYS = 180;
    static final LocalTime ALL_DAY_DEADLINE = LocalTime.of(23, 59);

    public record Result(List<ImportCandidate> events, int skippedPast, int skippedCancelled, int skippedEnded) {
    }

    static {
        // Real-world feeds (Outlook especially) bend the RFC; parse what we can.
        CompatibilityHints.setHintEnabled(CompatibilityHints.KEY_RELAXED_PARSING, true);
        CompatibilityHints.setHintEnabled(CompatibilityHints.KEY_RELAXED_UNFOLDING, true);
        CompatibilityHints.setHintEnabled(CompatibilityHints.KEY_RELAXED_VALIDATION, true);
        CompatibilityHints.setHintEnabled(CompatibilityHints.KEY_OUTLOOK_COMPATIBILITY, true);
    }

    private final ZoneId zone;
    private final LocalDate today;
    private final Set<String> importedUids;

    /** @param importedUids UIDs of the user's existing imported habits */
    public IcsImporter(ZoneId zone, LocalDate today, Set<String> importedUids) {
        this.zone = zone;
        this.today = today;
        this.importedUids = importedUids;
    }

    public Result parse(String ics) {
        Calendar calendar;
        try {
            calendar = new CalendarBuilder().build(new StringReader(ics));
        } catch (IOException | ParserException | RuntimeException e) {
            throw new ValidationException("ics", "isn't a calendar file this app can read (.ics)");
        }

        // One entry per UID: the series master, not its changed occurrences.
        Map<String, VEvent> byUid = new LinkedHashMap<>();
        for (VEvent event : calendar.<VEvent>getComponents(Component.VEVENT)) {
            String uid = event.<Uid>getProperty(Property.UID).map(Uid::getValue).orElse(null);
            if (uid == null) {
                uid = "no-uid-" + byUid.size();
            }
            if (event.getProperty(Property.RECURRENCE_ID).isPresent()) {
                byUid.putIfAbsent(uid, event); // only if its series isn't in the file
            } else {
                byUid.put(uid, event);
            }
        }

        List<ImportCandidate> events = new ArrayList<>();
        int past = 0;
        int cancelled = 0;
        int ended = 0;
        for (Map.Entry<String, VEvent> entry : byUid.entrySet()) {
            VEvent event = entry.getValue();
            if (event.getProperty(Property.STATUS).map(s -> "CANCELLED".equalsIgnoreCase(s.getValue())).orElse(false)) {
                cancelled++;
                continue;
            }
            Optional<Temporal> start = event.<DtStart<Temporal>>getProperty(Property.DTSTART).map(DtStart::getDate);
            if (start.isEmpty()) {
                continue;
            }
            boolean allDay = start.get() instanceof LocalDate;
            LocalDateTime startLocal = toLocal(start.get());
            LocalDate date = startLocal.toLocalDate();
            LocalTime deadline = allDay ? ALL_DAY_DEADLINE : deadline(event, startLocal);
            String name = event.<Summary>getProperty(Property.SUMMARY).map(s -> s.getValue().strip()).filter(s -> !s.isEmpty()).orElse("Untitled event");
            if (name.length() > 100) {
                name = name.substring(0, 100);
            }
            List<String> notes = new ArrayList<>();
            if (allDay) {
                notes.add("All-day event: due by 23:59");
            }

            Optional<RRule<Temporal>> rrule = event.getProperty(Property.RRULE);
            if (rrule.isEmpty()) {
                if (date.isBefore(today) || date.isAfter(today.plusDays(HORIZON_DAYS))) {
                    past++;
                    continue;
                }
                events.add(new ImportCandidate(entry.getKey(), name, false, List.of(), date, deadline, allDay,
                    importedUids.contains(entry.getKey()), notes));
                continue;
            }

            Recur<Temporal> recur = rrule.get().getRecur();
            Temporal until = recur.getUntil();
            if (until != null && toLocal(until).toLocalDate().isBefore(today)) {
                ended++;
                continue;
            }
            if (recur.getCount() > 0) {
                notes.add("Repeats " + recur.getCount() + " times in the calendar; the habit keeps repeating");
            } else if (until != null) {
                notes.add("Ends " + toLocal(until).toLocalDate() + " in the calendar; the habit keeps repeating");
            }
            List<DayOfWeek> days = days(recur, date, notes);
            events.add(new ImportCandidate(entry.getKey(), name, true, days, date, deadline, allDay,
                importedUids.contains(entry.getKey()), notes));
        }
        events.sort(Comparator.comparing(ImportCandidate::recurring).reversed()
            .thenComparing(ImportCandidate::date).thenComparing(ImportCandidate::deadline));
        return new Result(events, past, cancelled, ended);
    }

    /** Weekdays for a series: exact for daily / weekly, otherwise weekly on the start's weekday. */
    private static List<DayOfWeek> days(Recur<Temporal> recur, LocalDate start, List<String> notes) {
        int interval = Math.max(1, recur.getInterval());
        String frequency = String.valueOf(recur.getFrequency());
        List<WeekDay> byDay = recur.getDayList();
        boolean ordinal = byDay.stream().anyMatch(d -> d.getOffset() != 0);

        if ("DAILY".equals(frequency) && interval == 1 && byDay.isEmpty()) {
            return List.of();
        }
        if (("WEEKLY".equals(frequency) || "DAILY".equals(frequency)) && interval == 1 && !ordinal) {
            if (byDay.isEmpty()) {
                return List.of(start.getDayOfWeek());
            }
            Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
            byDay.forEach(d -> days.add(WeekDay.getDayOfWeek(d)));
            return days.size() == 7 ? List.of() : List.copyOf(days);
        }
        String every = switch (frequency) {
            case "DAILY" -> "every " + interval + " days";
            case "WEEKLY" -> "every " + interval + " weeks";
            case "MONTHLY" -> interval == 1 ? "monthly" : "every " + interval + " months";
            case "YEARLY" -> "yearly";
            default -> frequency.toLowerCase();
        };
        notes.add("Repeats " + every + " in the calendar; imported as weekly on " + pretty(start.getDayOfWeek()));
        return List.of(start.getDayOfWeek());
    }

    /** End time in the user's zone, or the start when there's no end or it ends on another day. */
    private LocalTime deadline(VEvent event, LocalDateTime start) {
        return event.<DtEnd<Temporal>>getProperty(Property.DTEND)
            .map(end -> toLocal(end.getDate()))
            .filter(end -> end.toLocalDate().equals(start.toLocalDate()) && end.isAfter(start))
            .map(LocalDateTime::toLocalTime)
            .orElse(start.toLocalTime());
    }

    /** Any ical4j date-time as a wall-clock time in the user's zone (floating times stay as they are). */
    private LocalDateTime toLocal(Temporal t) {
        return switch (t) {
            case ZonedDateTime z -> z.withZoneSameInstant(zone).toLocalDateTime();
            case OffsetDateTime o -> o.atZoneSameInstant(zone).toLocalDateTime();
            case Instant i -> i.atZone(zone).toLocalDateTime();
            case LocalDateTime l -> l;
            case LocalDate d -> d.atStartOfDay();
            default -> throw new ValidationException("ics", "has a date this app can't read: " + t);
        };
    }

    private static String pretty(DayOfWeek day) {
        String name = day.name();
        return name.charAt(0) + name.substring(1).toLowerCase();
    }
}
