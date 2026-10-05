package app.selfgotchi.state.model;

import java.time.LocalDate;
import java.util.List;

/**
 * Per-day results for one task over a date range, plus streaks over the task's whole life.
 * Streaks are in days, or weeks for a quota task; freshness tasks have none.
 */
public record TaskHistory(long taskId, List<Day> days, int currentStreak, int bestStreak) {

    public TaskHistory {
        days = List.copyOf(days);
    }

    /** @param completions number of completions logged that logical day */
    public record Day(LocalDate date, DayResult result, int completions) {
    }
}
