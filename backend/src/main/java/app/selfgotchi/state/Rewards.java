package app.selfgotchi.state;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import app.selfgotchi.state.model.DayResult;
import app.selfgotchi.state.model.RewardKey;
import app.selfgotchi.state.model.TaskHistory;

/**
 * Perfect days and the room decorations they unlock. Pure: works on per-day results from
 * {@link HistoryCalculator}, so it follows exactly the same day rules as the history screen.
 */
public final class Rewards {

    /** Perfect days needed for each reward, in unlock order. */
    public static final Map<RewardKey, Integer> THRESHOLDS = thresholds();

    private static final Set<DayResult> DONE = EnumSet.of(DayResult.ON_TIME, DayResult.LATE);
    /** Results that mean "this habit was due that day". */
    private static final Set<DayResult> COUNTED =
        EnumSet.of(DayResult.ON_TIME, DayResult.LATE, DayResult.PARTIAL, DayResult.MISSED, DayResult.PENDING);

    private Rewards() {
    }

    /**
     * @param next    the next reward, or null when everything is unlocked
     * @param nextAt  perfect days it needs, or null
     */
    public record Progress(int perfectDays, List<RewardKey> unlocked, RewardKey next, Integer nextAt) {

        public Progress {
            unlocked = List.copyOf(unlocked);
        }
    }

    /**
     * A day is perfect when at least one habit was due and every due habit was done (on time or
     * late). Partly done, missed or still-open habits spoil it; OFF / NONE habits don't count.
     */
    public static boolean isPerfect(List<DayResult> results) {
        boolean anyDue = false;
        for (DayResult result : results) {
            if (!COUNTED.contains(result)) {
                continue;
            }
            if (!DONE.contains(result)) {
                return false;
            }
            anyDue = true;
        }
        return anyDue;
    }

    /** Perfect days across habits whose histories cover the same dates. */
    public static int perfectDays(List<TaskHistory> histories) {
        Map<LocalDate, List<DayResult>> byDate = new LinkedHashMap<>();
        for (TaskHistory history : histories) {
            for (TaskHistory.Day day : history.days()) {
                byDate.computeIfAbsent(day.date(), d -> new ArrayList<>()).add(day.result());
            }
        }
        return (int) byDate.values().stream().filter(Rewards::isPerfect).count();
    }

    public static Progress progress(int perfectDays) {
        List<RewardKey> unlocked = new ArrayList<>();
        for (Map.Entry<RewardKey, Integer> entry : THRESHOLDS.entrySet()) {
            if (perfectDays >= entry.getValue()) {
                unlocked.add(entry.getKey());
            } else {
                return new Progress(perfectDays, unlocked, entry.getKey(), entry.getValue());
            }
        }
        return new Progress(perfectDays, unlocked, null, null);
    }

    private static Map<RewardKey, Integer> thresholds() {
        Map<RewardKey, Integer> map = new LinkedHashMap<>();
        map.put(RewardKey.RUG, 3);
        map.put(RewardKey.LAMP, 7);
        map.put(RewardKey.STRING_LIGHTS, 14);
        map.put(RewardKey.BIG_PLANT, 30);
        return java.util.Collections.unmodifiableMap(map);
    }
}
