package app.selfgotchi.state.model;

/**
 * Type-specific scheduling rules for a task, stored as JSONB.
 * Records validate their own structural invariants; checks that depend on the
 * user's day-reset hour live in {@link app.selfgotchi.state.TaskValidator}.
 */
public sealed interface Schedule permits CheckSchedule, MeterSchedule, QuotaSchedule, FreshnessSchedule {

    TaskType type();
}
