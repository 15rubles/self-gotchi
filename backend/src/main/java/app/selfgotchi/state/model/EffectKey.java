package app.selfgotchi.state.model;

/**
 * Which character layer a task feeds. Physical keys drive the body, room and effects;
 * mental keys show up as thought icons and worried faces.
 */
public enum EffectKey {
    /** Body effect: mouth smell (wisp, cloud, cloud + flies). */
    MOUTH_SMELL(Category.PHYSICAL),
    /** Energy: belly growl, then tired and exhausted poses and faces. */
    HUNGER(Category.PHYSICAL),
    /** Motivation: slouch, then lazy pose, then lazy + sweatpants. */
    MOTIVATION(Category.PHYSICAL),
    /** Room cleanliness level. */
    ROOM(Category.PHYSICAL),
    /** Thought icon: lunchbox. */
    LUNCHBOX(Category.MENTAL),
    /** Thought icon: book. */
    BOOK(Category.MENTAL),
    /** Thought icon: generic, for any other mental task. */
    GENERIC(Category.MENTAL);

    private final Category category;

    EffectKey(Category category) {
        this.category = category;
    }

    public Category category() {
        return category;
    }
}
