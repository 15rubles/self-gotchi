package app.selfgotchi.state.model;

import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

/**
 * Done N times per day. Two shapes:
 * <ul>
 *   <li>explicit slots, each with its own deadline: {@code slots=[10:00, 23:30]}</li>
 *   <li>generated slots: {@code count=3, firstBy=11:00, lastBy=21:00}; deadlines in between
 *       are spaced evenly</li>
 * </ul>
 * {@code minGapMinutes} applies to both: a completion closer than that to the previous
 * counted completion does not fill another slot.
 */
public record MeterSchedule(List<LocalTime> slots, Integer count, int minGapMinutes, LocalTime firstBy, LocalTime lastBy)
        implements Schedule {

    public static final int MAX_SLOTS = 12;
    public static final int MAX_GAP_MINUTES = 12 * 60;

    public MeterSchedule {
        slots = slots == null ? List.of() : List.copyOf(slots);
        if (minGapMinutes < 0 || minGapMinutes > MAX_GAP_MINUTES) {
            throw new IllegalArgumentException("minGapMinutes must be between 0 and " + MAX_GAP_MINUTES);
        }
        if (!slots.isEmpty()) {
            if (slots.size() > MAX_SLOTS) {
                throw new IllegalArgumentException("at most " + MAX_SLOTS + " slots");
            }
            if (count != null && count != slots.size()) {
                throw new IllegalArgumentException("count must match the number of slots");
            }
            if (firstBy != null || lastBy != null) {
                throw new IllegalArgumentException("use either slots or count/firstBy/lastBy, not both");
            }
        } else {
            if (count == null) {
                throw new IllegalArgumentException("either slots or count is required");
            }
            if (count < 1 || count > MAX_SLOTS) {
                throw new IllegalArgumentException("count must be between 1 and " + MAX_SLOTS);
            }
            Objects.requireNonNull(firstBy, "firstBy");
            if (count > 1 && lastBy == null) {
                throw new IllegalArgumentException("lastBy is required when count > 1");
            }
        }
    }

    public static MeterSchedule ofSlots(LocalTime... deadlines) {
        return new MeterSchedule(List.of(deadlines), null, 0, null, null);
    }

    public static MeterSchedule ofCount(int count, int minGapMinutes, LocalTime firstBy, LocalTime lastBy) {
        return new MeterSchedule(List.of(), count, minGapMinutes, firstBy, lastBy);
    }

    public boolean hasExplicitSlots() {
        return !slots.isEmpty();
    }

    /** Number of slots per day, whichever shape is used. */
    public int slotCount() {
        return hasExplicitSlots() ? slots.size() : count;
    }

    @Override
    public TaskType type() {
        return TaskType.METER;
    }
}
