package app.selfgotchi.state;

import static app.selfgotchi.state.model.DayResult.LATE;
import static app.selfgotchi.state.model.DayResult.MISSED;
import static app.selfgotchi.state.model.DayResult.NONE;
import static app.selfgotchi.state.model.DayResult.OFF;
import static app.selfgotchi.state.model.DayResult.ON_TIME;
import static app.selfgotchi.state.model.DayResult.PARTIAL;
import static app.selfgotchi.state.model.DayResult.PENDING;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import app.selfgotchi.state.model.DayResult;
import app.selfgotchi.state.model.RewardKey;
import app.selfgotchi.state.model.TaskHistory;

class RewardsTest {

    @Nested
    class PerfectDay {

        @Test
        void everyCountedHabitDoneOnTimeOrLateIsPerfect() {
            assertThat(Rewards.isPerfect(List.of(ON_TIME, LATE, ON_TIME))).isTrue();
        }

        @Test
        void aPartlyDoneMissedOrStillOpenHabitSpoilsTheDay() {
            assertThat(Rewards.isPerfect(List.of(ON_TIME, PARTIAL))).isFalse();
            assertThat(Rewards.isPerfect(List.of(ON_TIME, MISSED))).isFalse();
            assertThat(Rewards.isPerfect(List.of(ON_TIME, PENDING))).isFalse(); // today isn't over
        }

        @Test
        void habitsWithNothingDueAreIgnored() {
            assertThat(Rewards.isPerfect(List.of(ON_TIME, OFF, NONE))).isTrue();
        }

        @Test
        void aDayWithNothingDoneOrDueIsNotPerfect() {
            assertThat(Rewards.isPerfect(List.of())).isFalse();
            assertThat(Rewards.isPerfect(List.of(OFF, NONE))).isFalse();
        }
    }

    @Test
    void perfectDaysCountsDaysAcrossHabits() {
        // Day 1 perfect, day 2 one missed, day 3 perfect (the second habit is off), day 4 still open.
        TaskHistory a = history(1, ON_TIME, ON_TIME, LATE, ON_TIME);
        TaskHistory b = history(2, ON_TIME, MISSED, OFF, PENDING);

        assertThat(Rewards.perfectDays(List.of(a, b))).isEqualTo(2);
    }

    @Test
    void perfectDaysWithoutHabitsIsZero() {
        assertThat(Rewards.perfectDays(List.of())).isZero();
    }

    @Nested
    class Progress {

        @Test
        void nothingUnlockedAtFirst() {
            Rewards.Progress p = Rewards.progress(0);
            assertThat(p.unlocked()).isEmpty();
            assertThat(p.next()).isEqualTo(RewardKey.RUG);
            assertThat(p.nextAt()).isEqualTo(3);
        }

        @Test
        void unlocksAtTheThresholdsInOrder() {
            assertThat(Rewards.progress(2).unlocked()).isEmpty();
            assertThat(Rewards.progress(3).unlocked()).containsExactly(RewardKey.RUG);
            assertThat(Rewards.progress(13).unlocked()).containsExactly(RewardKey.RUG, RewardKey.LAMP);
            assertThat(Rewards.progress(13).next()).isEqualTo(RewardKey.STRING_LIGHTS);
            assertThat(Rewards.progress(13).nextAt()).isEqualTo(14);
        }

        @Test
        void everythingUnlockedHasNoNext() {
            Rewards.Progress p = Rewards.progress(30);
            assertThat(p.unlocked()).containsExactly(RewardKey.RUG, RewardKey.LAMP, RewardKey.STRING_LIGHTS, RewardKey.BIG_PLANT);
            assertThat(p.next()).isNull();
            assertThat(p.nextAt()).isNull();
        }
    }

    private static TaskHistory history(long taskId, DayResult... results) {
        List<TaskHistory.Day> days = new ArrayList<>();
        for (int i = 0; i < results.length; i++) {
            days.add(new TaskHistory.Day(LocalDate.of(2026, 10, 1).plusDays(i), results[i], 0));
        }
        return new TaskHistory(taskId, days, 0, 0);
    }
}
