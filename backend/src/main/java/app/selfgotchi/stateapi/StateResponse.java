package app.selfgotchi.stateapi;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import app.selfgotchi.state.Rewards;
import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.CharacterState;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.TaskStatus;
import app.selfgotchi.state.model.TaskType;

/**
 * {@code GET /state}: the character plus today's tasks with statuses.
 *
 * @param at       the moment evaluated (now, or the {@code ?at=} preview time)
 * @param preview  true when {@code ?at=} was given
 * @param rewards  perfect days so far and the room decorations they unlock
 */
public record StateResponse(Instant at, boolean preview, LocalDate logicalDate, String timezone,
                            CharacterState character, List<TaskState> tasks, Rewards.Progress rewards) {

    public record TaskState(
        long id,
        String name,
        Category category,
        TaskType type,
        EffectKey effectKey,
        int sortOrder,
        TaskStatus status,
        int severity,
        Instant dueAt,
        int done,
        int target,
        int streak,
        Integer daysSinceDone,
        Long latestCompletionId,
        /* a one-time checkmark's date, null for repeating habits */
        LocalDate onceOn) {
    }
}
