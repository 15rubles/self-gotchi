package app.selfgotchi.state.model;

public enum Recurrence {
    /** Every day, optionally restricted to specific weekdays. */
    DAILY,
    /** Once, on {@link CheckSchedule#date()} (e.g. an imported calendar appointment). */
    ONCE
}
