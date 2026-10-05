package app.selfgotchi.state;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import app.selfgotchi.state.TaskValidator.Violation;
import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.CheckSchedule;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.MeterSchedule;

class TaskValidatorTest {

    private static final int RESET = 4;

    @Test
    void acceptsTheDesignDocMeters() {
        assertThat(TaskValidator.validate(Category.PHYSICAL, EffectKey.MOUTH_SMELL,
            MeterSchedule.ofSlots(LocalTime.of(10, 0), LocalTime.of(23, 30)), RESET)).isEmpty();
        assertThat(TaskValidator.validate(Category.PHYSICAL, EffectKey.HUNGER,
            MeterSchedule.ofCount(3, 180, LocalTime.of(11, 0), LocalTime.of(21, 0)), RESET)).isEmpty();
    }

    @Test
    void effectKeyMustMatchCategory() {
        List<Violation> violations = TaskValidator.validate(Category.MENTAL, EffectKey.MOUTH_SMELL,
            CheckSchedule.daily(LocalTime.of(21, 0)), RESET);

        assertThat(violations).extracting(Violation::field).containsExactly("effectKey");
    }

    @Test
    void slotsMustBeInLogicalDayOrder() {
        // 23:30 then 01:00 is fine: 01:00 is the same logical day when the day resets at 04:00.
        assertThat(TaskValidator.validate(Category.PHYSICAL, EffectKey.MOUTH_SMELL,
            MeterSchedule.ofSlots(LocalTime.of(23, 30), LocalTime.of(1, 0)), RESET)).isEmpty();

        assertThat(TaskValidator.validate(Category.PHYSICAL, EffectKey.MOUTH_SMELL,
            MeterSchedule.ofSlots(LocalTime.of(23, 30), LocalTime.of(10, 0)), RESET))
            .extracting(Violation::field).containsExactly("schedule.slots[1].by");
    }

    @Test
    void lastByMustFollowFirstBy() {
        assertThat(TaskValidator.validate(Category.PHYSICAL, EffectKey.HUNGER,
            MeterSchedule.ofCount(3, 0, LocalTime.of(21, 0), LocalTime.of(11, 0)), RESET))
            .extracting(Violation::field).containsExactly("schedule.lastBy");
    }

    @Test
    void gapMustFitBetweenFirstAndLast() {
        // 3 slots over 4 hours leaves 2 h between deadlines, less than the 3 h minimum gap.
        assertThat(TaskValidator.validate(Category.PHYSICAL, EffectKey.HUNGER,
            MeterSchedule.ofCount(3, 180, LocalTime.of(11, 0), LocalTime.of(15, 0)), RESET))
            .extracting(Violation::field).containsExactly("schedule.minGapMinutes");
    }
}
