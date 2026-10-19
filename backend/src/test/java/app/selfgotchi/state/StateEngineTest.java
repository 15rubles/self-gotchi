package app.selfgotchi.state;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneId;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import app.selfgotchi.state.model.CharacterState;
import app.selfgotchi.state.model.CharacterState.Effect;
import app.selfgotchi.state.model.CharacterState.EffectType;
import app.selfgotchi.state.model.CharacterState.IconType;
import app.selfgotchi.state.model.DayResult;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.Face;
import app.selfgotchi.state.model.Pose;
import app.selfgotchi.state.model.TaskEvaluation;
import app.selfgotchi.state.model.TaskHistory;
import app.selfgotchi.state.model.TaskStatus;

/**
 * State Engine behaviour. Unless noted: Europe/Berlin, day resets at 04:00,
 * "today" is Monday 2026-10-05 and tasks were created on 2026-09-01.
 */
class StateEngineTest {

    static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    static final ZoneId LA = ZoneId.of("America/Los_Angeles");

    static Scenario berlin() {
        return new Scenario(BERLIN, "2026-09-01T12:00");
    }

    // =========================================================================================
    @Nested
    class Meter {

        @Test
        void oneBrushingLoggedAt2340_isMouthSmellSeverity1() {
            Scenario s = berlin();
            long teeth = s.teeth();
            s.done(teeth, "2026-10-05T08:00");

            CharacterState state = s.stateAt("2026-10-05T23:40");

            assertThat(state.effects()).containsExactly(new Effect(EffectType.MOUTH_SMELL, 1));
            assertThat(s.task(teeth, "2026-10-05T23:40").status()).isEqualTo(TaskStatus.MISSED);
        }

        @Test
        void noBrushingLoggedAt2340_isMouthSmellSeverity2() {
            Scenario s = berlin();
            s.teeth();

            assertThat(s.stateAt("2026-10-05T23:40").effects())
                .containsExactly(new Effect(EffectType.MOUTH_SMELL, 2));
        }

        @Test
        void bothSlotsDone_isClean() {
            Scenario s = berlin();
            long teeth = s.teeth();
            s.done(teeth, "2026-10-05T08:00");
            s.done(teeth, "2026-10-05T23:00");

            TaskEvaluation eval = s.task(teeth, "2026-10-05T23:40");
            assertThat(eval.status()).isEqualTo(TaskStatus.DONE);
            assertThat(eval.severity()).isZero();
            assertThat(eval.done()).isEqualTo(2);
            assertThat(eval.target()).isEqualTo(2);
            assertThat(s.stateAt("2026-10-05T23:40").effects()).isEmpty();
        }

        @Test
        void lateCompletionFillsTheMissedSlot() {
            Scenario s = berlin();
            long teeth = s.teeth();
            s.done(teeth, "2026-10-05T12:00"); // morning slot, late

            assertThat(s.task(teeth, "2026-10-05T12:30").severity()).isZero();
            assertThat(s.task(teeth, "2026-10-05T12:30").status()).isEqualTo(TaskStatus.UPCOMING);
        }

        @Test
        void nextSlotWithinAnHour_isDueSoon() {
            Scenario s = berlin();
            long teeth = s.teeth();

            TaskEvaluation eval = s.task(teeth, "2026-10-05T09:30");
            assertThat(eval.status()).isEqualTo(TaskStatus.DUE_SOON);
            assertThat(eval.severity()).isZero();
            assertThat(eval.dueAt()).isEqualTo(s.t("2026-10-05T10:00"));
        }

        @Test
        void minGap_twoMealsThirtyMinutesApartCountAsOneSlot() {
            Scenario s = berlin();
            long eat = s.eat();
            s.done(eat, "2026-10-05T08:00");
            s.done(eat, "2026-10-05T08:30");

            TaskEvaluation eval = s.task(eat, "2026-10-05T12:00");
            assertThat(eval.done()).isEqualTo(1);
            assertThat(eval.severity()).isZero();
            // Slots are 11:00, 16:00, 21:00; the second one is next.
            assertThat(eval.dueAt()).isEqualTo(s.t("2026-10-05T16:00"));
        }

        @Test
        void minGap_mealsFarEnoughApartFillSeparateSlots() {
            Scenario s = berlin();
            long eat = s.eat();
            s.done(eat, "2026-10-05T08:00");
            s.done(eat, "2026-10-05T11:00");

            assertThat(s.task(eat, "2026-10-05T12:00").done()).isEqualTo(2);
        }

        @Test
        void slotsBeforeCreationDoNotExistThatDay() {
            Scenario s = new Scenario(BERLIN, "2026-10-05T12:30");
            long teeth = s.teeth(); // the 10:00 slot was before creation

            TaskEvaluation eval = s.task(teeth, "2026-10-05T12:40");
            assertThat(eval.status()).isEqualTo(TaskStatus.UPCOMING);
            assertThat(eval.target()).isEqualTo(1);
            assertThat(eval.dueAt()).isEqualTo(s.t("2026-10-05T23:30"));
            assertThat(s.task(teeth, "2026-10-06T08:00").target()).isEqualTo(2);
        }

        @Test
        void allSlotsBeforeCreation_isOffThatDay() {
            Scenario s = new Scenario(BERLIN, "2026-10-05T21:30");
            long eat = s.eat();

            assertThat(s.task(eat, "2026-10-05T22:00").status()).isEqualTo(TaskStatus.OFF);
            assertThat(s.task(eat, "2026-10-06T09:00").status()).isEqualTo(TaskStatus.UPCOMING);
        }

        @Test
        void missedSlotsAccumulateAndCapAt3() {
            Scenario s = berlin();
            long eat = s.eat();

            assertThat(s.task(eat, "2026-10-05T11:30").severity()).isEqualTo(1);
            assertThat(s.task(eat, "2026-10-05T16:30").severity()).isEqualTo(2);
            assertThat(s.task(eat, "2026-10-05T21:30").severity()).isEqualTo(3);
        }
    }

    // =========================================================================================
    @Nested
    class Checkmark {

        /** Prepare food by 22:00, done yesterday so a miss today is a first miss. */
        private Scenario prepFoodDoneYesterday() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-04T20:00");
            return s;
        }

        @ParameterizedTest(name = "{0} -> {1} severity {2}")
        @CsvSource({
            "2026-10-05T12:00, UPCOMING, 0",
            "2026-10-05T20:59, UPCOMING, 0",
            "2026-10-05T21:00, DUE_SOON, 1",
            "2026-10-05T21:30, DUE_SOON, 1",
            "2026-10-05T22:00, MISSED,   2",
            "2026-10-05T23:59, MISSED,   2",
            "2026-10-06T03:59, MISSED,   2",
        })
        void severityFollowsTheDeadline(String at, TaskStatus status, int severity) {
            Scenario s = prepFoodDoneYesterday();

            TaskEvaluation eval = s.task(1, at);
            assertThat(eval.status()).isEqualTo(status);
            assertThat(eval.severity()).isEqualTo(severity);
            assertThat(eval.dueAt()).isEqualTo(s.t("2026-10-05T22:00"));
        }

        @Test
        void missedTwoDaysInARow_isSeverity3() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-03T20:00"); // Saturday done, Sunday missed

            assertThat(s.task(prep, "2026-10-05T22:30").severity()).isEqualTo(3);
        }

        @Test
        void lateCompletionClearsTheEffect() {
            Scenario s = prepFoodDoneYesterday();
            long late = s.done(1, "2026-10-05T23:15");

            TaskEvaluation eval = s.task(1, "2026-10-05T23:30");
            assertThat(eval.status()).isEqualTo(TaskStatus.DONE);
            assertThat(eval.severity()).isZero();
            assertThat(eval.latestCompletionId()).isEqualTo(late);
            assertThat(s.stateAt("2026-10-05T23:30").icons()).isEmpty();
        }

        @Test
        void notScheduledToday_isOff() {
            Scenario s = berlin();
            long homework = s.check("Homework", EffectKey.BOOK, "21:00",
                DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY);

            TaskEvaluation eval = s.task(homework, "2026-10-04T22:00"); // Sunday
            assertThat(eval.status()).isEqualTo(TaskStatus.OFF);
            assertThat(eval.severity()).isZero();
        }

        @Test
        void inARowMeansConsecutiveScheduledDays() {
            Scenario s = berlin();
            long homework = s.check("Homework", EffectKey.BOOK, "21:00",
                DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY);
            s.done(homework, "2026-09-30T20:00"); // Wednesday done

            // Thursday missed, Monday missed: the weekend in between does not break the run.
            assertThat(s.task(homework, "2026-10-05T21:30").severity()).isEqualTo(3);

            s.done(homework, "2026-10-01T20:00"); // now Thursday was done
            assertThat(s.task(homework, "2026-10-05T21:30").severity()).isEqualTo(2);
        }

        @Test
        void firstScheduledDayAfterCreation_missIsOnlySeverity2() {
            Scenario s = new Scenario(BERLIN, "2026-10-05T09:00");
            long prep = s.prepFood();

            assertThat(s.task(prep, "2026-10-05T22:30").severity()).isEqualTo(2);
        }
    }

    // =========================================================================================
    @Nested
    class OneTimeCheckmark {

        /** Dentist on Wed 2026-10-07 by 14:00, created long before. */
        private Scenario dentist() {
            Scenario s = berlin();
            s.once("Dentist", "2026-10-07", "14:00");
            return s;
        }

        @ParameterizedTest(name = "{0} -> {1} severity {2}")
        @CsvSource({
            "2026-10-06T12:00, OFF,      0",  // the day before
            "2026-10-07T10:00, UPCOMING, 0",
            "2026-10-07T13:30, DUE_SOON, 1",
            "2026-10-07T14:30, MISSED,   2",  // never 3: there is no previous occurrence
            "2026-10-08T12:00, OFF,      0",  // the day after: nothing due any more
        })
        void onlyItsDateCounts(String at, TaskStatus status, int severity) {
            TaskEvaluation eval = dentist().task(1, at);
            assertThat(eval.status()).isEqualTo(status);
            assertThat(eval.severity()).isEqualTo(severity);
        }

        @Test
        void doneOnItsDate_evenLate() {
            Scenario s = dentist();
            s.done(1, "2026-10-07T15:00");
            assertThat(s.task(1, "2026-10-07T16:00").status()).isEqualTo(TaskStatus.DONE);
        }

        @Test
        void historyOnlyJudgesItsDate() {
            Scenario s = dentist();
            s.done(1, "2026-10-07T13:00");

            TaskHistory h = s.history(1, "2026-10-06", "2026-10-08", "2026-10-08T12:00");
            assertThat(h.days()).extracting(TaskHistory.Day::result)
                .containsExactly(DayResult.NONE, DayResult.ON_TIME, DayResult.NONE);
        }
    }

    @Nested
    class WeeklyQuota {

        @ParameterizedTest(name = "{0} with {1} done -> severity {2}")
        @CsvSource({
            // Monday: nothing expected yet
            "2026-10-05T12:00, 0, 0",
            // Wednesday: floor(3*2/7) = 0 expected
            "2026-10-07T12:00, 0, 0",
            // Thursday: floor(3*3/7) = 1 expected
            "2026-10-08T12:00, 0, 1",
            "2026-10-08T12:00, 1, 0",
            // Friday: 3 needed, 3 days left -> still possible, 1 behind
            "2026-10-09T12:00, 0, 1",
            // Saturday: 3 needed, 2 days left -> week lost
            "2026-10-10T12:00, 0, 3",
            // Sunday: 2 needed, 1 day left -> week lost
            "2026-10-11T12:00, 1, 3",
            // Sunday: floor(3*6/7) = 2 expected and done; 1 needed with 1 day left is still possible
            "2026-10-11T12:00, 2, 0",
        })
        void severityIsDistanceBehindPace(String at, int sessions, int severity) {
            Scenario s = berlin();
            long workout = s.workout();
            for (int i = 0; i < sessions; i++) {
                s.done(workout, "2026-10-05T07:0" + i);
            }

            assertThat(s.task(workout, at).severity()).isEqualTo(severity);
        }

        @Test
        void quotaMet_isDone() {
            Scenario s = berlin();
            long workout = s.workout();
            s.done(workout, "2026-10-05T07:00");
            s.done(workout, "2026-10-06T07:00");
            s.done(workout, "2026-10-07T07:00");

            TaskEvaluation eval = s.task(workout, "2026-10-11T12:00");
            assertThat(eval.status()).isEqualTo(TaskStatus.DONE);
            assertThat(eval.done()).isEqualTo(3);
            assertThat(eval.target()).isEqualTo(3);
        }

        @Test
        void lastWeeksSessionsDoNotCount() {
            Scenario s = berlin();
            long workout = s.workout();
            s.done(workout, "2026-10-01T07:00");
            s.done(workout, "2026-10-02T07:00");
            s.done(workout, "2026-10-03T07:00");

            assertThat(s.task(workout, "2026-10-08T12:00").done()).isZero();
        }

        @Test
        void weekLost_isLazyPoseWithSweatpants() {
            Scenario s = berlin();
            s.workout();

            CharacterState state = s.stateAt("2026-10-10T12:00");
            assertThat(state.pose()).isEqualTo(Pose.LAZY);
            assertThat(state.effects()).contains(new Effect(EffectType.SWEATPANTS, 3));
        }

        @Test
        void oneBehind_isSlouch() {
            Scenario s = berlin();
            s.workout();

            CharacterState state = s.stateAt("2026-10-08T12:00");
            assertThat(state.pose()).isEqualTo(Pose.NORMAL);
            assertThat(state.effects()).containsExactly(new Effect(EffectType.SLOUCH, 1));
        }
    }

    // =========================================================================================
    @Nested
    class Freshness {

        @ParameterizedTest(name = "cleaned {0} -> {1} days, severity {2}")
        @CsvSource({
            "2026-10-05T10:00, 0, 0",
            "2026-10-03T10:00, 2, 0",
            "2026-10-02T10:00, 3, 1",
            "2026-09-30T10:00, 5, 2",
            "2026-09-27T10:00, 8, 3",
        })
        void severityStepsAtThresholds(String cleanedAt, int days, int severity) {
            Scenario s = berlin();
            long clean = s.clean();
            s.done(clean, cleanedAt);

            TaskEvaluation eval = s.task(clean, "2026-10-05T12:00");
            assertThat(eval.daysSinceDone()).isEqualTo(days);
            assertThat(eval.severity()).isEqualTo(severity);
            assertThat(s.stateAt("2026-10-05T12:00").room()).isEqualTo(severity);
        }

        @Test
        void neverDone_countsFromCreation() {
            Scenario s = new Scenario(BERLIN, "2026-09-30T12:00");
            long clean = s.clean();

            assertThat(s.task(clean, "2026-10-05T12:00").daysSinceDone()).isEqualTo(5);
        }

        @Test
        void cleaningResetsTheTimerFully() {
            Scenario s = berlin();
            long clean = s.clean();
            s.done(clean, "2026-09-20T10:00");
            assertThat(s.stateAt("2026-10-05T12:00").room()).isEqualTo(3);

            s.done(clean, "2026-10-05T12:30");
            TaskEvaluation eval = s.task(clean, "2026-10-05T13:00");
            assertThat(eval.severity()).isZero();
            assertThat(eval.status()).isEqualTo(TaskStatus.DONE);
            assertThat(eval.dueAt()).isEqualTo(s.t("2026-10-08T04:00"));
        }
    }

    // =========================================================================================
    @Nested
    class DayReset {

        @Test
        void completionAt0130CountsForThePreviousDay() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-04T20:00");
            s.done(prep, "2026-10-06T01:30"); // Tuesday 01:30 -> Monday, late

            assertThat(s.task(prep, "2026-10-06T01:45").status()).isEqualTo(TaskStatus.DONE);

            // Tuesday's own instance is still open.
            TaskEvaluation tuesday = s.task(prep, "2026-10-06T10:00");
            assertThat(tuesday.status()).isEqualTo(TaskStatus.UPCOMING);
            assertThat(tuesday.latestCompletionId()).isNull();
            // ...and missing it is a first miss, because Monday counted.
            assertThat(s.task(prep, "2026-10-06T22:30").severity()).isEqualTo(2);
        }

        @Test
        void meterSlotsBeforeResetBelongToThePreviousDay() {
            Scenario s = berlin();
            long teeth = s.teeth();
            s.done(teeth, "2026-10-05T08:00");
            s.done(teeth, "2026-10-06T01:30"); // late evening brushing, still Monday

            assertThat(s.task(teeth, "2026-10-06T02:00").status()).isEqualTo(TaskStatus.DONE);
            assertThat(s.task(teeth, "2026-10-06T08:00").done()).isZero();
        }

        @Test
        void cleaningAt0130CountsForThePreviousDay() {
            Scenario s = berlin();
            long clean = s.clean();
            s.done(clean, "2026-10-06T01:30");

            assertThat(s.task(clean, "2026-10-06T12:00").daysSinceDone()).isEqualTo(1);
        }

        @Test
        void customResetHour() {
            Scenario s = new Scenario(BERLIN, "2026-09-01T12:00", EngineConfig.withResetHour(0));
            long prep = s.prepFood();
            s.done(prep, "2026-10-04T20:00");
            s.done(prep, "2026-10-06T01:30"); // with a midnight reset this is Tuesday

            assertThat(s.task(prep, "2026-10-06T01:45").status()).isEqualTo(TaskStatus.DONE);
            assertThat(s.task(prep, "2026-10-05T23:00").severity()).isEqualTo(2);
        }
    }

    // =========================================================================================
    @Nested
    class DaylightSaving {

        @Test
        void springForwardDayKeepsWallClockDeadlines() {
            // 2026-03-08 02:00 PST -> 03:00 PDT in Los Angeles.
            Scenario s = new Scenario(LA, "2026-02-01T12:00");
            long homework = s.check("Homework", EffectKey.BOOK, "21:00");
            s.done(homework, "2026-03-07T20:00");

            TaskEvaluation eval = s.task(homework, "2026-03-08T20:30");
            assertThat(eval.status()).isEqualTo(TaskStatus.DUE_SOON);
            assertThat(eval.dueAt()).isEqualTo(Instant.parse("2026-03-09T04:00:00Z")); // 21:00 PDT
            assertThat(s.task(homework, "2026-03-08T19:59").status()).isEqualTo(TaskStatus.UPCOMING);
            assertThat(s.task(homework, "2026-03-08T21:01").severity()).isEqualTo(2);
        }

        @Test
        void deadlineInsideTheSkippedHourMovesForward() {
            Scenario s = new Scenario(LA, "2026-02-01T12:00");
            long late = s.check("Night owl", EffectKey.GENERIC, "02:30");
            s.done(late, "2026-03-07T01:00"); // counted for Mar 6

            // Logical day Mar 7: 02:30 on Mar 8 does not exist, it becomes 03:30 PDT.
            assertThat(s.task(late, "2026-03-07T23:00").dueAt()).isEqualTo(s.t("2026-03-08T03:30"));
            assertThat(s.task(late, "2026-03-08T03:00").status()).isEqualTo(TaskStatus.DUE_SOON);
            assertThat(s.task(late, "2026-03-08T03:31").status()).isEqualTo(TaskStatus.MISSED);
        }

        @Test
        void fallBackDayKeepsWallClockDeadlines() {
            // 2026-11-01 02:00 PDT -> 01:00 PST.
            Scenario s = new Scenario(LA, "2026-09-01T12:00");
            long teeth = s.teeth();
            s.done(teeth, "2026-11-01T09:00");

            TaskEvaluation eval = s.task(teeth, "2026-11-01T23:00");
            assertThat(eval.status()).isEqualTo(TaskStatus.DUE_SOON);
            assertThat(eval.dueAt()).isEqualTo(Instant.parse("2026-11-02T07:30:00Z")); // 23:30 PST
            assertThat(s.task(teeth, "2026-11-01T23:31").severity()).isEqualTo(1);
        }

        @Test
        void freshnessCountsCalendarDaysAcrossDst() {
            Scenario s = new Scenario(LA, "2026-09-01T12:00");
            long clean = s.clean();
            s.done(clean, "2026-10-30T10:00");

            assertThat(s.task(clean, "2026-11-02T09:00").daysSinceDone()).isEqualTo(3);
        }
    }

    // =========================================================================================
    @Nested
    class PriorityResolution {

        @Test
        void hungryAndLazy_poseShowsHunger() {
            Scenario s = berlin();
            s.eat();
            s.workout();

            // Saturday 17:00: two meal slots missed (TIRED), workout week lost (LAZY).
            CharacterState state = s.stateAt("2026-10-10T17:00");
            assertThat(state.pose()).isEqualTo(Pose.TIRED);
            assertThat(state.effects()).contains(new Effect(EffectType.BELLY_GROWL, 2),
                new Effect(EffectType.SWEATPANTS, 3));
        }

        @Test
        void exhaustedBeatsTired() {
            Scenario s = berlin();
            s.eat();

            assertThat(s.stateAt("2026-10-05T21:30").pose()).isEqualTo(Pose.EXHAUSTED);
            assertThat(s.stateAt("2026-10-05T21:30").face()).isEqualTo(Face.EXHAUSTED);
        }

        @Test
        void mildHunger_isBellyGrowlOnly() {
            Scenario s = berlin();
            s.eat();

            CharacterState state = s.stateAt("2026-10-05T12:00");
            assertThat(state.pose()).isEqualTo(Pose.NORMAL);
            assertThat(state.face()).isEqualTo(Face.NEUTRAL);
            assertThat(state.effects()).containsExactly(new Effect(EffectType.BELLY_GROWL, 1));
        }

        @Test
        void faceTie_physicalWins() {
            Scenario s = berlin();
            s.eat();                                                   // severity 2 at 17:00
            long homework = s.check("Homework", EffectKey.BOOK, "16:00");
            s.done(homework, "2026-10-04T15:00");                      // first miss -> severity 2

            assertThat(s.stateAt("2026-10-05T17:00").face()).isEqualTo(Face.TIRED);
        }

        @Test
        void higherMentalSeverityWinsTheFace() {
            Scenario s = berlin();
            s.eat();                                                   // severity 2 at 17:00
            s.check("Homework", EffectKey.BOOK, "16:00");              // never done -> severity 3

            CharacterState state = s.stateAt("2026-10-05T17:00");
            assertThat(state.face()).isEqualTo(Face.VERY_WORRIED);
            assertThat(state.pose()).isEqualTo(Pose.TIRED);
        }

        @Test
        void mentalSeverity1_isIconWithoutFaceChange() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-04T20:00");

            CharacterState state = s.stateAt("2026-10-05T21:30");
            assertThat(state.face()).isEqualTo(Face.NEUTRAL);
            assertThat(state.icons()).singleElement()
                .satisfies(icon -> {
                    assertThat(icon.key()).isEqualTo(IconType.LUNCHBOX);
                    assertThat(icon.severity()).isEqualTo(1);
                });
        }

        @Test
        void mentalSeverity2_isWorried() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-04T20:00");

            assertThat(s.stateAt("2026-10-05T22:30").face()).isEqualTo(Face.WORRIED);
        }

        @Test
        void allFineWithActiveStreak_isHappy() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-04T20:00");
            s.done(prep, "2026-10-05T10:00");

            CharacterState state = s.stateAt("2026-10-05T12:00");
            assertThat(state.face()).isEqualTo(Face.HAPPY);
            assertThat(state.streakBonus()).isTrue();
        }

        @Test
        void allFineWithoutStreak_isNeutral() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-05T10:00");

            CharacterState state = s.stateAt("2026-10-05T12:00");
            assertThat(state.face()).isEqualTo(Face.NEUTRAL);
            assertThat(state.streakBonus()).isFalse();
        }

        @Test
        void streakButSomethingWrong_isNotHappy() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-04T20:00");
            s.done(prep, "2026-10-05T10:00");
            s.teeth(); // morning slot missed at 12:00

            CharacterState state = s.stateAt("2026-10-05T12:00");
            assertThat(state.face()).isEqualTo(Face.NEUTRAL);
            assertThat(state.streakBonus()).isFalse();
        }

        @Test
        void iconsCapAt3_extrasAreOverflow() {
            Scenario s = berlin();
            for (int i = 0; i < 4; i++) {
                long task = s.check("Errand " + i, EffectKey.GENERIC, "09:00");
                s.done(task, "2026-10-04T08:00"); // first miss today -> severity 2
            }
            long book = s.check("Homework", EffectKey.BOOK, "09:00"); // never done -> severity 3

            CharacterState state = s.stateAt("2026-10-05T12:00");
            assertThat(state.icons()).hasSize(3);
            assertThat(state.iconOverflow()).isEqualTo(2);
            assertThat(state.icons().getFirst().taskId()).isEqualTo(book);
            assertThat(state.icons().getFirst().severity()).isEqualTo(3);
        }

        @Test
        void everythingFine_isTheDefaultCharacter() {
            Scenario s = berlin();
            s.teeth();
            s.clean();

            CharacterState state = s.stateAt("2026-09-01T12:30");
            assertThat(state.pose()).isEqualTo(Pose.NORMAL);
            assertThat(state.face()).isEqualTo(Face.NEUTRAL);
            assertThat(state.room()).isZero();
            assertThat(state.effects()).isEmpty();
            assertThat(state.icons()).isEmpty();
            assertThat(state.iconOverflow()).isZero();
        }
    }

    // =========================================================================================
    @Nested
    class Streaks {

        @Test
        void checkmarkStreakRunsThroughYesterdayUntilTodayIsDone() {
            Scenario s = berlin();
            long prep = s.prepFood();
            s.done(prep, "2026-10-02T20:00");
            s.done(prep, "2026-10-03T20:00");
            s.done(prep, "2026-10-04T23:00"); // late still counts

            assertThat(s.task(prep, "2026-10-05T12:00").streak()).isEqualTo(3);
            s.done(prep, "2026-10-05T13:00");
            assertThat(s.task(prep, "2026-10-05T14:00").streak()).isEqualTo(4);
        }

        @Test
        void checkmarkStreakSkipsUnscheduledDays() {
            Scenario s = berlin();
            long homework = s.check("Homework", EffectKey.BOOK, "21:00",
                DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY);
            s.done(homework, "2026-09-30T20:00");
            s.done(homework, "2026-10-01T20:00");
            s.done(homework, "2026-10-05T20:00");

            assertThat(s.task(homework, "2026-10-05T20:30").streak()).isEqualTo(3);
        }

        @Test
        void meterStreakNeedsEverySlot() {
            Scenario s = berlin();
            long teeth = s.teeth();
            s.done(teeth, "2026-10-03T08:00");
            s.done(teeth, "2026-10-03T22:00");
            s.done(teeth, "2026-10-04T08:00");
            s.done(teeth, "2026-10-04T22:00");

            assertThat(s.task(teeth, "2026-10-05T08:00").streak()).isEqualTo(2);
        }

        @Test
        void quotaStreakCountsWeeks() {
            Scenario s = berlin();
            long workout = s.workout();
            for (String day : new String[] {"2026-09-21", "2026-09-22", "2026-09-23",
                                            "2026-09-28", "2026-09-30", "2026-10-02"}) {
                s.done(workout, day + "T07:00");
            }

            assertThat(s.task(workout, "2026-10-05T12:00").streak()).isEqualTo(2);
        }
    }

    // =========================================================================================
    @Nested
    class Purity {

        @Test
        void sameInputsGiveEqualOutputs() {
            Scenario s = berlin();
            s.teeth();
            s.eat();
            s.workout();
            s.clean();
            s.prepFood();

            assertThat(s.at("2026-10-05T17:00")).isEqualTo(s.at("2026-10-05T17:00"));
        }

        @Test
        void completionsAfterNowAreIgnored() {
            Scenario s = berlin();
            long teeth = s.teeth();
            s.done(teeth, "2026-10-05T08:00");

            assertThat(s.task(teeth, "2026-10-05T07:00").done()).isZero();
        }

        @Test
        void tasksCreatedAfterNowAreOff() {
            Scenario s = new Scenario(BERLIN, "2026-10-05T12:00");
            long prep = s.prepFood();

            assertThat(s.task(prep, "2026-10-04T23:00").status()).isEqualTo(TaskStatus.OFF);
        }

        @Test
        void tasksAreReturnedInInputOrder() {
            Scenario s = berlin();
            long a = s.prepFood();
            long b = s.teeth();
            long c = s.clean();

            assertThat(s.at("2026-10-05T12:00").tasks()).extracting(TaskEvaluation::taskId).containsExactly(a, b, c);
        }
    }
}
