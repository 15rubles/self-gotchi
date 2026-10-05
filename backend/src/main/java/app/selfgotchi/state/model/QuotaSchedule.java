package app.selfgotchi.state.model;

import java.time.DayOfWeek;
import java.util.Objects;

/** Done X times per calendar week, judged against pace. */
public record QuotaSchedule(int timesPerWeek, DayOfWeek weekStarts) implements Schedule {

    public QuotaSchedule {
        if (timesPerWeek < 1 || timesPerWeek > 7) {
            throw new IllegalArgumentException("timesPerWeek must be between 1 and 7");
        }
        Objects.requireNonNull(weekStarts, "weekStarts");
    }

    @Override
    public TaskType type() {
        return TaskType.QUOTA;
    }
}
