package app.selfgotchi.task;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;

/**
 * Create/update body. The task type comes from {@code schedule.type}.
 *
 * @param sortOrder optional; new tasks go to the end of the list when omitted
 * @param importUid optional, create only: the calendar event it comes from (calendar import)
 */
public record TaskRequest(
    @NotBlank @Size(max = 100) String name,
    @NotNull Category category,
    @NotNull EffectKey effectKey,
    @NotNull JsonNode schedule,
    Integer sortOrder,
    @Size(max = 255) String importUid) {

    /** Without an import UID (seeding, tests). */
    public TaskRequest(String name, Category category, EffectKey effectKey, JsonNode schedule, Integer sortOrder) {
        this(name, category, effectKey, schedule, sortOrder, null);
    }
}
