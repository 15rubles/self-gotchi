package app.selfgotchi.calendar;

import static java.time.DayOfWeek.FRIDAY;
import static java.time.DayOfWeek.MONDAY;
import static java.time.DayOfWeek.WEDNESDAY;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import app.selfgotchi.common.ValidationException;

/** The user is in Europe/Berlin; today is Monday 2026-10-19. */
class IcsImporterTest {

    static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    static final LocalDate TODAY = LocalDate.of(2026, 10, 19);

    static IcsImporter.Result parse(String... events) {
        return parse(Set.of(), events);
    }

    static IcsImporter.Result parse(Set<String> imported, String... events) {
        String ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//test//EN\r\n" + String.join("", events) + "END:VCALENDAR\r\n";
        return new IcsImporter(BERLIN, TODAY, imported).parse(ics);
    }

    static String event(String uid, String summary, String... lines) {
        return "BEGIN:VEVENT\r\nUID:" + uid + "\r\nSUMMARY:" + summary + "\r\nDTSTAMP:20261001T000000Z\r\n"
            + String.join("\r\n", lines) + "\r\nEND:VEVENT\r\n";
    }

    static ImportCandidate only(IcsImporter.Result result) {
        assertThat(result.events()).hasSize(1);
        return result.events().getFirst();
    }

    @Test
    void googleWeeklyEventWithIanaZone_becomesOneWeekdayHabit() {
        ImportCandidate c = only(parse(event("gym@google.com", "Gym",
            "DTSTART;TZID=Europe/Berlin:20260907T180000",
            "DTEND;TZID=Europe/Berlin:20260907T193000",
            "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR")));

        assertThat(c.recurring()).isTrue();
        assertThat(c.days()).containsExactly(MONDAY, WEDNESDAY, FRIDAY);
        assertThat(c.deadline()).isEqualTo(LocalTime.of(19, 30)); // done by the end of the event
        assertThat(c.name()).isEqualTo("Gym");
        assertThat(c.uid()).isEqualTo("gym@google.com");
        assertThat(c.notes()).isEmpty();
    }

    @Test
    void dailySeriesHasNoWeekdays() {
        ImportCandidate c = only(parse(event("pills", "Vitamins",
            "DTSTART;TZID=Europe/Berlin:20260101T083000",
            "RRULE:FREQ=DAILY")));

        assertThat(c.recurring()).isTrue();
        assertThat(c.days()).isEmpty();
        assertThat(c.deadline()).isEqualTo(LocalTime.of(8, 30)); // no end: the start
    }

    @Test
    void outlookWindowsZoneNameAndUtcTimesAreConvertedToTheUsersZone() {
        String outlook = event("dentist-outlook", "Dentist",
            "DTSTART;TZID=W. Europe Standard Time:20261022T140000",
            "DTEND;TZID=W. Europe Standard Time:20261022T150000");
        String utc = event("call", "Call with Mum",
            "DTSTART:20261023T170000Z",
            "DTEND:20261023T173000Z");

        List<ImportCandidate> events = parse(outlook, utc).events();

        assertThat(events).extracting(ImportCandidate::name).containsExactly("Dentist", "Call with Mum");
        assertThat(events.get(0).recurring()).isFalse();
        assertThat(events.get(0).date()).isEqualTo(LocalDate.of(2026, 10, 22));
        assertThat(events.get(0).deadline()).isEqualTo(LocalTime.of(15, 0));
        assertThat(events.get(1).deadline()).isEqualTo(LocalTime.of(19, 30)); // 17:30Z = 19:30 CEST
    }

    @Test
    void allDayEventIsDueByTheEndOfTheDay() {
        ImportCandidate c = only(parse(event("bday", "Pay rent",
            "DTSTART;VALUE=DATE:20261101",
            "DTEND;VALUE=DATE:20261102")));

        assertThat(c.allDay()).isTrue();
        assertThat(c.deadline()).isEqualTo(LocalTime.of(23, 59));
        assertThat(c.date()).isEqualTo(LocalDate.of(2026, 11, 1));
    }

    @Test
    void pastCancelledEndedAndFarFutureEventsAreSkipped() {
        IcsImporter.Result r = parse(
            event("old", "Old meeting", "DTSTART;TZID=Europe/Berlin:20261001T100000"),
            event("gone", "Cancelled", "DTSTART;TZID=Europe/Berlin:20261025T100000", "STATUS:CANCELLED"),
            event("over", "Finished course", "DTSTART;TZID=Europe/Berlin:20260101T100000",
                "RRULE:FREQ=WEEKLY;UNTIL=20260601T000000Z"),
            event("far", "Next summer", "DTSTART;TZID=Europe/Berlin:20271001T100000"),
            event("keep", "Haircut", "DTSTART;TZID=Europe/Berlin:20261019T180000"));

        assertThat(r.events()).extracting(ImportCandidate::name).containsExactly("Haircut"); // today counts
        assertThat(r.skippedPast()).isEqualTo(2);
        assertThat(r.skippedCancelled()).isEqualTo(1);
        assertThat(r.skippedEnded()).isEqualTo(1);
    }

    @Test
    void unusualRepeatsBecomeWeeklyWithANote() {
        IcsImporter.Result r = parse(
            event("biweekly", "Cleaning lady", "DTSTART;TZID=Europe/Berlin:20261020T090000",
                "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU"),
            event("monthly", "Book club", "DTSTART;TZID=Europe/Berlin:20261007T190000",
                "RRULE:FREQ=MONTHLY;BYDAY=1WE"));

        assertThat(r.events()).allSatisfy(c -> assertThat(c.recurring()).isTrue());
        assertThat(r.events()).extracting(c -> c.days().getFirst()).containsExactlyInAnyOrder(
            java.time.DayOfWeek.TUESDAY, WEDNESDAY);
        assertThat(r.events()).allSatisfy(c -> assertThat(c.notes()).anySatisfy(n -> assertThat(n).contains("imported as weekly")));
    }

    @Test
    void aMovedOccurrenceBelongsToItsSeries() {
        IcsImporter.Result r = parse(
            event("standup", "Standup", "DTSTART;TZID=Europe/Berlin:20260901T093000", "RRULE:FREQ=DAILY"),
            event("standup", "Standup (moved)", "RECURRENCE-ID;TZID=Europe/Berlin:20261021T093000",
                "DTSTART;TZID=Europe/Berlin:20261021T110000"));

        assertThat(only(r).name()).isEqualTo("Standup");
    }

    @Test
    void alreadyImportedEventsAreMarked() {
        ImportCandidate c = only(parse(Set.of("gym@google.com"), event("gym@google.com", "Gym",
            "DTSTART;TZID=Europe/Berlin:20260907T180000", "RRULE:FREQ=WEEKLY")));

        assertThat(c.alreadyImported()).isTrue();
        assertThat(c.days()).containsExactly(MONDAY); // weekly without BYDAY: the start's weekday
    }

    @Test
    void notACalendar() {
        assertThatThrownBy(() -> new IcsImporter(BERLIN, TODAY, Set.of()).parse("<html>hello</html>"))
            .isInstanceOf(ValidationException.class);
    }
}
