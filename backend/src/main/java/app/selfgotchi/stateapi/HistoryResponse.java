package app.selfgotchi.stateapi;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.TaskHistory;
import app.selfgotchi.state.model.TaskType;

/** {@code GET /history}: per-task, per-logical-day results and streaks. */
public record HistoryResponse(LocalDate from, LocalDate to, List<TaskEntry> tasks) {

    public record TaskEntry(
        long id,
        String name,
        Category category,
        TaskType type,
        EffectKey effectKey,
        boolean active,
        Instant archivedAt,
        int currentStreak,
        int bestStreak,
        List<TaskHistory.Day> days) {
    }
}
