package app.selfgotchi.state.model;

public enum TaskStatus {
    /** Nothing due yet. */
    UPCOMING,
    /** Inside the warning window before a deadline. */
    DUE_SOON,
    /** Done for the current period (day or week). */
    DONE,
    /** A deadline passed, or the task is behind pace / overdue. */
    MISSED,
    /** Not scheduled for today. */
    OFF
}
