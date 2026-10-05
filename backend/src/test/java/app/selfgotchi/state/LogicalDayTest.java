package app.selfgotchi.state;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

import org.junit.jupiter.api.Test;

class LogicalDayTest {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private static final ZoneId LA = ZoneId.of("America/Los_Angeles");

    private final LogicalDay day = new LogicalDay(BERLIN, 4);

    @Test
    void earlyMorningBelongsToPreviousDay() {
        LocalDate monday = LocalDate.of(2026, 10, 5);

        assertThat(day.dateOf(LocalDateTime.of(2026, 10, 6, 1, 30).atZone(BERLIN).toInstant())).isEqualTo(monday);
        assertThat(day.dateOf(LocalDateTime.of(2026, 10, 6, 3, 59).atZone(BERLIN).toInstant())).isEqualTo(monday);
        assertThat(day.dateOf(LocalDateTime.of(2026, 10, 6, 4, 0).atZone(BERLIN).toInstant()))
            .isEqualTo(monday.plusDays(1));
    }

    @Test
    void timesBeforeResetResolveToNextCalendarDate() {
        LocalDate monday = LocalDate.of(2026, 10, 5);

        assertThat(day.at(monday, LocalTime.of(23, 30)))
            .isEqualTo(LocalDateTime.of(2026, 10, 5, 23, 30).atZone(BERLIN).toInstant());
        assertThat(day.at(monday, LocalTime.of(1, 0)))
            .isEqualTo(LocalDateTime.of(2026, 10, 6, 1, 0).atZone(BERLIN).toInstant());
    }

    @Test
    void dstDaysHaveTheirRealLength() {
        LogicalDay la = new LogicalDay(LA, 4);

        // Spring forward 2026-03-08 02:00 -> 03:00; the logical day of Mar 7 spans that night.
        assertThat(Duration.between(la.start(LocalDate.of(2026, 3, 7)), la.end(LocalDate.of(2026, 3, 7))))
            .isEqualTo(Duration.ofHours(23));
        // Fall back 2026-11-01 02:00 -> 01:00.
        assertThat(Duration.between(la.start(LocalDate.of(2026, 10, 31)), la.end(LocalDate.of(2026, 10, 31))))
            .isEqualTo(Duration.ofHours(25));
    }

    @Test
    void nonexistentLocalTimeShiftsForward() {
        LogicalDay la = new LogicalDay(LA, 4);

        // 02:30 does not exist on 2026-03-08 in Los Angeles; it resolves to 03:30 PDT.
        assertThat(la.at(LocalDate.of(2026, 3, 7), LocalTime.of(2, 30)))
            .isEqualTo(LocalDateTime.of(2026, 3, 8, 3, 30).atZone(LA).toInstant());
    }

    @Test
    void minutesIntoDayOrdersAcrossMidnight() {
        assertThat(LogicalDay.minutesIntoDay(LocalTime.of(4, 0), 4)).isZero();
        assertThat(LogicalDay.minutesIntoDay(LocalTime.of(23, 30), 4))
            .isLessThan(LogicalDay.minutesIntoDay(LocalTime.of(1, 0), 4));
    }
}
