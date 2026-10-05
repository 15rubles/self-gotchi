package app.selfgotchi.task;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import com.fasterxml.jackson.databind.ObjectMapper;

import app.selfgotchi.common.ValidationException;
import app.selfgotchi.state.TaskValidator.Violation;
import app.selfgotchi.state.model.CheckSchedule;
import app.selfgotchi.state.model.FreshnessSchedule;
import app.selfgotchi.state.model.MeterSchedule;
import app.selfgotchi.state.model.QuotaSchedule;
import app.selfgotchi.state.model.Recurrence;
import app.selfgotchi.state.model.Schedule;

class ScheduleCodecTest {

    private final ScheduleCodec codec = new ScheduleCodec(new ObjectMapper());

    // ---- the examples from DESIGN.md decode as expected -----------------------------------

    @Test
    void decodesCheckFromDesignDoc() {
        Schedule s = codec.fromJson("""
            { "type": "CHECK", "recurrence": "DAILY", "days": ["MON","TUE","WED","THU"], "deadline": "21:00" }""");

        assertThat(s).isEqualTo(new CheckSchedule(Recurrence.DAILY,
            Set.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY),
            LocalTime.of(21, 0), 60));
    }

    @Test
    void decodesMeterWithExplicitSlots() {
        Schedule s = codec.fromJson("""
            { "type": "METER", "slots": [{"by": "10:00"}, {"by": "23:30"}] }""");

        assertThat(s).isEqualTo(MeterSchedule.ofSlots(LocalTime.of(10, 0), LocalTime.of(23, 30)));
    }

    @Test
    void decodesMeterWithCountAndGap() {
        Schedule s = codec.fromJson("""
            { "type": "METER", "count": 3, "minGapMinutes": 180, "firstBy": "11:00", "lastBy": "21:00" }""");

        assertThat(s).isEqualTo(MeterSchedule.ofCount(3, 180, LocalTime.of(11, 0), LocalTime.of(21, 0)));
    }

    @Test
    void decodesQuota() {
        assertThat(codec.fromJson("""
            { "type": "QUOTA", "timesPerWeek": 3, "weekStarts": "MON" }"""))
            .isEqualTo(new QuotaSchedule(3, DayOfWeek.MONDAY));
    }

    @Test
    void decodesFreshness() {
        assertThat(codec.fromJson("""
            { "type": "FRESHNESS", "thresholdsDays": [3, 5, 7] }"""))
            .isEqualTo(new FreshnessSchedule(List.of(3, 5, 7)));
    }

    @Test
    void appliesDefaults() {
        assertThat(codec.fromJson("""
            { "type": "CHECK", "deadline": "22:00" }"""))
            .isEqualTo(CheckSchedule.daily(LocalTime.of(22, 0)));
        assertThat(codec.fromJson("""
            { "type": "QUOTA", "timesPerWeek": 2 }"""))
            .isEqualTo(new QuotaSchedule(2, DayOfWeek.MONDAY));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "{\"type\":\"CHECK\",\"recurrence\":\"DAILY\",\"days\":[\"MON\",\"FRI\"],\"deadline\":\"21:00\",\"dueSoonMinutes\":30}",
        "{\"type\":\"CHECK\",\"recurrence\":\"DAILY\",\"days\":[],\"deadline\":\"01:15\",\"dueSoonMinutes\":60}",
        "{\"type\":\"METER\",\"slots\":[{\"by\":\"10:00\"},{\"by\":\"23:30\"}]}",
        "{\"type\":\"METER\",\"count\":3,\"firstBy\":\"11:00\",\"lastBy\":\"21:00\",\"minGapMinutes\":180}",
        "{\"type\":\"METER\",\"count\":1,\"firstBy\":\"09:00\"}",
        "{\"type\":\"QUOTA\",\"timesPerWeek\":3,\"weekStarts\":\"SUN\"}",
        "{\"type\":\"FRESHNESS\",\"thresholdsDays\":[3,5,7]}"
    })
    void roundTripsLosslessly(String json) {
        Schedule decoded = codec.fromJson(json);
        String encoded = codec.toJson(decoded);

        assertThat(encoded).isEqualTo(json);
        assertThat(codec.fromJson(encoded)).isEqualTo(decoded);
    }

    // ---- validation ---------------------------------------------------------------------

    @ParameterizedTest(name = "{0}")
    @CsvSource(delimiter = '|', value = {
        "missing type                | {}                                                                       | schedule.type",
        "unknown type                | {\"type\":\"AVOID\"}                                                      | schedule.type",
        "check without deadline      | {\"type\":\"CHECK\"}                                                      | schedule.deadline",
        "check bad time              | {\"type\":\"CHECK\",\"deadline\":\"9pm\"}                                 | schedule.deadline",
        "check hour out of range     | {\"type\":\"CHECK\",\"deadline\":\"25:00\"}                               | schedule.deadline",
        "check bad day               | {\"type\":\"CHECK\",\"deadline\":\"21:00\",\"days\":[\"MONDAY\"]}         | schedule.days",
        "check due soon too long     | {\"type\":\"CHECK\",\"deadline\":\"21:00\",\"dueSoonMinutes\":9999}       | schedule",
        "unknown field               | {\"type\":\"CHECK\",\"deadline\":\"21:00\",\"dedline\":\"22:00\"}         | schedule.dedline",
        "meter empty                 | {\"type\":\"METER\"}                                                      | schedule",
        "meter slot without by       | {\"type\":\"METER\",\"slots\":[{\"at\":\"10:00\"}]}                       | schedule.slots[0].by",
        "meter count mismatch        | {\"type\":\"METER\",\"slots\":[{\"by\":\"10:00\"}],\"count\":2}           | schedule",
        "meter count without firstBy | {\"type\":\"METER\",\"count\":2}                                          | schedule",
        "meter count without lastBy  | {\"type\":\"METER\",\"count\":2,\"firstBy\":\"10:00\"}                    | schedule",
        "meter too many              | {\"type\":\"METER\",\"count\":13,\"firstBy\":\"08:00\",\"lastBy\":\"20:00\"} | schedule",
        "quota missing               | {\"type\":\"QUOTA\"}                                                      | schedule.timesPerWeek",
        "quota eight per week        | {\"type\":\"QUOTA\",\"timesPerWeek\":8}                                   | schedule",
        "quota fractional            | {\"type\":\"QUOTA\",\"timesPerWeek\":2.5}                                 | schedule.timesPerWeek",
        "freshness two thresholds    | {\"type\":\"FRESHNESS\",\"thresholdsDays\":[3,5]}                         | schedule",
        "freshness not increasing    | {\"type\":\"FRESHNESS\",\"thresholdsDays\":[3,3,7]}                       | schedule",
        "freshness zero              | {\"type\":\"FRESHNESS\",\"thresholdsDays\":[0,5,7]}                       | schedule",
    })
    void rejectsInvalidSchedules(String description, String json, String expectedField) {
        assertThatThrownBy(() -> codec.fromJson(json))
            .isInstanceOf(ValidationException.class)
            .satisfies(e -> assertThat(((ValidationException) e).violations())
                .extracting(Violation::field)
                .contains(expectedField));
    }

    @Test
    void reportsEveryBadFieldAtOnce() {
        assertThatThrownBy(() -> codec.fromJson("""
            { "type": "CHECK", "deadline": "late", "days": ["XYZ"], "extra": 1 }"""))
            .isInstanceOf(ValidationException.class)
            .satisfies(e -> assertThat(((ValidationException) e).violations())
                .extracting(Violation::field)
                .containsExactlyInAnyOrder("schedule.deadline", "schedule.days", "schedule.extra"));
    }

    @Test
    void rejectsNonObjectJson() {
        assertThatThrownBy(() -> codec.fromJson("[1,2]")).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> codec.fromJson("not json")).isInstanceOf(ValidationException.class);
    }
}
