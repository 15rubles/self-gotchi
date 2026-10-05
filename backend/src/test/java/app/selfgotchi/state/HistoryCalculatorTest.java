package app.selfgotchi.state;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;

import org.junit.jupiter.api.Test;

import app.selfgotchi.state.model.DayResult;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.TaskHistory;

/** Europe/Berlin, reset 04:00; "now" is Monday 2026-10-05 unless noted. */
class HistoryCalculatorTest {

    private static Scenario berlin(String createdAt) {
        return new Scenario(StateEngineTest.BERLIN, createdAt);
    }

    @Test
    void checkmarkDays() {
        Scenario s = berlin("2026-09-30T12:00"); // Wednesday
        long prep = s.prepFood();
        s.done(prep, "2026-10-01T21:00");        // Thu on time
        s.done(prep, "2026-10-02T23:30");        // Fri late
        s.done(prep, "2026-10-04T01:00");        // Sat late (01:00 Sun counts for Sat)

        TaskHistory h = s.history(prep, "2026-09-29", "2026-10-06", "2026-10-05T12:00");

        assertThat(h.days()).extracting(TaskHistory.Day::result).containsExactly(
            DayResult.NONE,      // Tue: before creation
            DayResult.MISSED,    // Wed: created at noon, 22:00 deadline missed
            DayResult.ON_TIME,   // Thu
            DayResult.LATE,      // Fri
            DayResult.LATE,      // Sat
            DayResult.MISSED,    // Sun
            DayResult.PENDING,   // Mon (today, before the deadline)
            DayResult.NONE);     // Tue: future
        assertThat(h.days().get(4).completions()).isEqualTo(1);
    }

    @Test
    void checkmarkUnscheduledDaysAreOff() {
        Scenario s = berlin("2026-09-01T12:00");
        long homework = s.check("Homework", EffectKey.BOOK, "21:00", DayOfWeek.MONDAY, DayOfWeek.TUESDAY);

        TaskHistory h = s.history(homework, "2026-10-02", "2026-10-04", "2026-10-05T12:00");

        assertThat(h.days()).extracting(TaskHistory.Day::result).containsOnly(DayResult.OFF);
    }

    @Test
    void meterDays() {
        Scenario s = berlin("2026-09-01T12:00");
        long teeth = s.teeth();
        s.done(teeth, "2026-10-02T08:00");
        s.done(teeth, "2026-10-02T22:00");      // Fri on time
        s.done(teeth, "2026-10-03T11:00");
        s.done(teeth, "2026-10-03T22:00");      // Sat first slot late
        s.done(teeth, "2026-10-04T08:00");      // Sun partial

        TaskHistory h = s.history(teeth, "2026-10-01", "2026-10-05", "2026-10-05T08:30");

        assertThat(h.days()).extracting(TaskHistory.Day::result).containsExactly(
            DayResult.MISSED, DayResult.ON_TIME, DayResult.LATE, DayResult.PARTIAL, DayResult.PENDING);
    }

    @Test
    void quotaAndFreshnessMarkDoneDaysOnly() {
        Scenario s = berlin("2026-09-01T12:00");
        long workout = s.workout();
        long clean = s.clean();
        s.done(workout, "2026-10-03T10:00");
        s.done(clean, "2026-10-04T10:00");

        assertThat(s.history(workout, "2026-10-02", "2026-10-04", "2026-10-05T12:00").days())
            .extracting(TaskHistory.Day::result)
            .containsExactly(DayResult.NONE, DayResult.ON_TIME, DayResult.NONE);
        assertThat(s.history(clean, "2026-10-02", "2026-10-04", "2026-10-05T12:00").days())
            .extracting(TaskHistory.Day::result)
            .containsExactly(DayResult.NONE, DayResult.NONE, DayResult.ON_TIME);
    }

    @Test
    void currentAndBestStreak() {
        Scenario s = berlin("2026-09-01T12:00");
        long prep = s.prepFood();
        for (String d : new String[] {"2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14",
                                      "2026-10-03", "2026-10-04"}) {
            s.done(prep, d + "T20:00");
        }

        TaskHistory h = s.history(prep, "2026-10-01", "2026-10-05", "2026-10-05T12:00");

        assertThat(h.currentStreak()).isEqualTo(2);
        assertThat(h.bestStreak()).isEqualTo(5);
    }

    @Test
    void quotaStreaksAreInWeeks() {
        Scenario s = berlin("2026-09-01T12:00");
        long workout = s.workout();
        for (String d : new String[] {"2026-09-07", "2026-09-08", "2026-09-09",
                                      "2026-09-14", "2026-09-15", "2026-09-16",
                                      "2026-09-28", "2026-09-29", "2026-09-30"}) {
            s.done(workout, d + "T07:00");
        }

        TaskHistory h = s.history(workout, "2026-10-01", "2026-10-05", "2026-10-05T12:00");

        assertThat(h.currentStreak()).isEqualTo(1);
        assertThat(h.bestStreak()).isEqualTo(2);
    }

    @Test
    void archivedTaskStopsAtArchiveDay() {
        Scenario s = berlin("2026-09-01T12:00");
        long prep = s.prepFood();
        s.done(prep, "2026-10-02T20:00");
        s.done(prep, "2026-10-03T20:00");

        TaskHistory h = s.history(prep, "2026-10-03T21:00", "2026-10-02", "2026-10-05", "2026-10-05T12:00");

        assertThat(h.days()).extracting(TaskHistory.Day::result)
            .containsExactly(DayResult.ON_TIME, DayResult.ON_TIME, DayResult.NONE, DayResult.NONE);
        assertThat(h.currentStreak()).isZero();
        assertThat(h.bestStreak()).isGreaterThanOrEqualTo(2);
    }
}
