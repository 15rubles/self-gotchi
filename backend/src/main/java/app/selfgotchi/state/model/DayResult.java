package app.selfgotchi.state.model;

/** How a task went on one logical day, for the history heatmap. */
public enum DayResult {
    /** Done before the deadline (every slot on time for a meter; any completion for quota/freshness). */
    ON_TIME,
    /** Done, but at least partly after the deadline. */
    LATE,
    /** Meter: some slots filled, not all. */
    PARTIAL,
    /** Due and not done. */
    MISSED,
    /** Today, not done yet and not missed yet. */
    PENDING,
    /** Not scheduled that day. */
    OFF,
    /** Nothing to judge: before creation, after archiving, in the future, or a non-daily task not done that day. */
    NONE
}
