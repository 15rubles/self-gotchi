package app.selfgotchi.state.model;

import java.time.Instant;
import java.util.Objects;

/** A task definition as the engine sees it: no persistence concerns. */
public record TaskDef(long id, String name, Category category, EffectKey effectKey, Schedule schedule,
                      int sortOrder, Instant createdAt) {

    public TaskDef {
        Objects.requireNonNull(category, "category");
        Objects.requireNonNull(effectKey, "effectKey");
        Objects.requireNonNull(schedule, "schedule");
        Objects.requireNonNull(createdAt, "createdAt");
    }

    public TaskType type() {
        return schedule.type();
    }
}
