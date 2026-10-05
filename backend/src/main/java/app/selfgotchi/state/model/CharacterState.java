package app.selfgotchi.state.model;

import java.util.List;

/**
 * What the character looks like: one pose, one face, a room level, stacked body effects
 * and up to three thought icons ({@code iconOverflow} counts the rest).
 *
 * @param streakBonus everything is fine and at least one streak is active (the happy state)
 */
public record CharacterState(Pose pose, Face face, int room, List<Effect> effects, List<Icon> icons,
                             int iconOverflow, boolean streakBonus) {

    public static final int MAX_ICONS = 3;

    public CharacterState {
        effects = List.copyOf(effects);
        icons = List.copyOf(icons);
    }

    public enum EffectType {
        /** Severity 1 faint wisp, 2 green cloud, 3 cloud + flies. */
        MOUTH_SMELL,
        /** Hunger at any severity. */
        BELLY_GROWL,
        /** Motivation severity 1. */
        SLOUCH,
        /** Motivation severity 3: grey sweatpants tint on the lazy pose. */
        SWEATPANTS
    }

    public enum IconType {
        LUNCHBOX,
        BOOK,
        GENERIC
    }

    public record Effect(EffectType key, int severity) {
    }

    public record Icon(IconType key, int severity, long taskId) {
    }
}
