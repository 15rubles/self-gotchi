package app.selfgotchi.state.model;

import java.util.List;

/** No deadline; severity grows with days since last done, one step per threshold reached. */
public record FreshnessSchedule(List<Integer> thresholdsDays) implements Schedule {

    public static final int MAX_DAYS = 365;

    public FreshnessSchedule {
        if (thresholdsDays == null || thresholdsDays.size() != 3) {
            throw new IllegalArgumentException("thresholdsDays must have exactly 3 values");
        }
        thresholdsDays = List.copyOf(thresholdsDays);
        int previous = 0;
        for (int days : thresholdsDays) {
            if (days <= previous || days > MAX_DAYS) {
                throw new IllegalArgumentException(
                    "thresholdsDays must be strictly increasing whole days between 1 and " + MAX_DAYS);
            }
            previous = days;
        }
    }

    @Override
    public TaskType type() {
        return TaskType.FRESHNESS;
    }
}
