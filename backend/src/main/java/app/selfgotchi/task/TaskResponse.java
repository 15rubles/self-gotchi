package app.selfgotchi.task;

import java.time.Instant;

import com.fasterxml.jackson.databind.JsonNode;

import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.TaskType;

public record TaskResponse(
    long id,
    String name,
    Category category,
    TaskType type,
    EffectKey effectKey,
    JsonNode schedule,
    boolean active,
    Instant archivedAt,
    int sortOrder,
    Instant createdAt,
    Instant updatedAt) {

    static TaskResponse from(Task task, ScheduleCodec codec) {
        return new TaskResponse(task.getId(), task.getName(), task.getCategory(), task.getType(),
            task.getEffectKey(), codec.encode(codec.fromJson(task.getSchedule())), task.isActive(),
            task.getArchivedAt(), task.getSortOrder(), task.getCreatedAt(), task.getUpdatedAt());
    }
}
