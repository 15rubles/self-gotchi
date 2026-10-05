package app.selfgotchi.state.model;

import java.time.Instant;

/**
 * How one task stands at the evaluation time.
 *
 * @param severity            0 (fine) to 3 (bad)
 * @param dueAt               the next relevant deadline: next open slot, today's deadline, end of the
 *                            quota week, or when a freshness task reaches its first threshold; null when OFF
 * @param done                progress in the current period: slots filled, sessions this week, 0/1 for a checkmark
 * @param target              what "done" means in the current period
 * @param streak              consecutive completed periods (days, or weeks for a quota); 0 for freshness
 * @param daysSinceDone       freshness only: logical days since last done (or since creation); otherwise null
 * @param latestCompletionId  the newest completion in the current period, for undo; null if none
 */
public record TaskEvaluation(long taskId, TaskStatus status, int severity, Instant dueAt, int done, int target,
                             int streak, Integer daysSinceDone, Long latestCompletionId) {
}
