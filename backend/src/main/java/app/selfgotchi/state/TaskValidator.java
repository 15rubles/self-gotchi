package app.selfgotchi.state;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.MeterSchedule;
import app.selfgotchi.state.model.Schedule;

/**
 * Cross-field task rules that the schedule records cannot check on their own,
 * mostly because they depend on the user's day-reset hour.
 */
public final class TaskValidator {

    public record Violation(String field, String message) {
    }

    private TaskValidator() {
    }

    public static List<Violation> validate(Category category, EffectKey effectKey, Schedule schedule, int resetHour) {
        List<Violation> violations = new ArrayList<>();
        if (category != null && effectKey != null && effectKey.category() != category) {
            violations.add(new Violation("effectKey",
                effectKey + " belongs to " + effectKey.category() + " tasks, not " + category));
        }
        if (schedule instanceof MeterSchedule meter) {
            validateMeter(meter, resetHour, violations);
        }
        return violations;
    }

    private static void validateMeter(MeterSchedule meter, int resetHour, List<Violation> violations) {
        if (meter.hasExplicitSlots()) {
            List<LocalTime> slots = meter.slots();
            for (int i = 1; i < slots.size(); i++) {
                if (LogicalDay.minutesIntoDay(slots.get(i), resetHour)
                        <= LogicalDay.minutesIntoDay(slots.get(i - 1), resetHour)) {
                    violations.add(new Violation("schedule.slots[" + i + "].by",
                        "slot deadlines must be in order within the day (the day starts at "
                            + LocalTime.of(resetHour, 0) + ")"));
                }
            }
            return;
        }
        if (meter.count() > 1) {
            int first = LogicalDay.minutesIntoDay(meter.firstBy(), resetHour);
            int last = LogicalDay.minutesIntoDay(meter.lastBy(), resetHour);
            if (last <= first) {
                violations.add(new Violation("schedule.lastBy", "lastBy must come after firstBy within the day"));
            } else if ((last - first) / (meter.count() - 1) < meter.minGapMinutes()) {
                violations.add(new Violation("schedule.minGapMinutes",
                    meter.count() + " slots between firstBy and lastBy cannot be "
                        + meter.minGapMinutes() + " minutes apart"));
            }
        }
    }
}
