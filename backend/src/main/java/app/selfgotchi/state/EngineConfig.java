package app.selfgotchi.state;

/**
 * @param dayResetHour     local hour a new logical day starts (DESIGN.md default 04:00)
 * @param streakMinLength  a streak of at least this many periods counts as "active" for the happy face
 */
public record EngineConfig(int dayResetHour, int streakMinLength) {

    public static final int DEFAULT_RESET_HOUR = 4;
    public static final int DEFAULT_STREAK_MIN = 2;

    public EngineConfig {
        if (dayResetHour < 0 || dayResetHour > 23) {
            throw new IllegalArgumentException("dayResetHour must be between 0 and 23");
        }
        if (streakMinLength < 1) {
            throw new IllegalArgumentException("streakMinLength must be at least 1");
        }
    }

    public static EngineConfig withResetHour(int dayResetHour) {
        return new EngineConfig(dayResetHour, DEFAULT_STREAK_MIN);
    }

    public static EngineConfig defaults() {
        return withResetHour(DEFAULT_RESET_HOUR);
    }
}
