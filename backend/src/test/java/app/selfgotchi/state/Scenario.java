package app.selfgotchi.state;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import app.selfgotchi.state.model.CharacterState;
import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.CheckSchedule;
import app.selfgotchi.state.model.CompletionLog;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.FreshnessSchedule;
import app.selfgotchi.state.model.MeterSchedule;
import app.selfgotchi.state.model.QuotaSchedule;
import app.selfgotchi.state.model.Recurrence;
import app.selfgotchi.state.model.Schedule;
import app.selfgotchi.state.model.TaskDef;
import app.selfgotchi.state.model.TaskEvaluation;
import app.selfgotchi.state.model.TaskHistory;

/** Test fixture: build tasks and completions in local wall-clock time, then evaluate. */
final class Scenario {

    private final ZoneId zone;
    private final EngineConfig config;
    private final StateEngine engine;
    private final List<TaskDef> tasks = new ArrayList<>();
    private final List<CompletionLog> logs = new ArrayList<>();
    private Instant createdAt;
    private long nextTaskId = 1;
    private long nextLogId = 100;

    Scenario(ZoneId zone, String createdAt) {
        this(zone, createdAt, EngineConfig.defaults());
    }

    Scenario(ZoneId zone, String createdAt, EngineConfig config) {
        this.zone = zone;
        this.createdAt = t(createdAt);
        this.config = config;
        this.engine = new StateEngine(config);
    }

    Instant t(String localDateTime) {
        return LocalDateTime.parse(localDateTime).atZone(zone).toInstant();
    }

    /** Tasks added after this call are created at the given local time. */
    Scenario createdAt(String localDateTime) {
        this.createdAt = t(localDateTime);
        return this;
    }

    long task(String name, Category category, EffectKey key, Schedule schedule) {
        long id = nextTaskId++;
        tasks.add(new TaskDef(id, name, category, key, schedule, (int) id, createdAt));
        return id;
    }

    // ---- the six habits from DESIGN.md ----------------------------------------------------

    long teeth() {
        return task("Brush teeth", Category.PHYSICAL, EffectKey.MOUTH_SMELL,
            MeterSchedule.ofSlots(LocalTime.of(10, 0), LocalTime.of(23, 30)));
    }

    long eat() {
        return task("Eat", Category.PHYSICAL, EffectKey.HUNGER,
            MeterSchedule.ofCount(3, 180, LocalTime.of(11, 0), LocalTime.of(21, 0)));
    }

    long workout() {
        return task("Work out", Category.PHYSICAL, EffectKey.MOTIVATION, new QuotaSchedule(3, DayOfWeek.MONDAY));
    }

    long clean() {
        return task("Clean", Category.PHYSICAL, EffectKey.ROOM, new FreshnessSchedule(List.of(3, 5, 7)));
    }

    long prepFood() {
        return check("Prepare food", EffectKey.LUNCHBOX, "22:00");
    }

    long check(String name, EffectKey key, String deadline, DayOfWeek... days) {
        return task(name, Category.MENTAL, key,
            new CheckSchedule(Recurrence.DAILY, Set.of(days), LocalTime.parse(deadline), 60));
    }

    // ---- completions ------------------------------------------------------------------------

    long done(long taskId, String localDateTime) {
        long id = nextLogId++;
        logs.add(new CompletionLog(id, taskId, t(localDateTime)));
        return id;
    }

    // ---- evaluation -------------------------------------------------------------------------

    Evaluation at(String localDateTime) {
        return engine.evaluate(tasks, logs, t(localDateTime), zone);
    }

    CharacterState stateAt(String localDateTime) {
        return engine.computeState(tasks, logs, t(localDateTime), zone);
    }

    TaskHistory history(long id, String from, String to, String nowLocal) {
        return history(id, null, from, to, nowLocal);
    }

    TaskHistory history(long id, String archivedAtLocal, String from, String to, String nowLocal) {
        TaskDef task = tasks.stream().filter(t -> t.id() == id).findFirst().orElseThrow();
        return new HistoryCalculator(config).history(task, archivedAtLocal == null ? null : t(archivedAtLocal),
            logs, LocalDate.parse(from), LocalDate.parse(to), t(nowLocal), zone);
    }

    TaskEvaluation task(long id, String localDateTime) {
        return at(localDateTime).tasks().stream()
            .filter(e -> e.taskId() == id)
            .findFirst()
            .orElseThrow();
    }
}
