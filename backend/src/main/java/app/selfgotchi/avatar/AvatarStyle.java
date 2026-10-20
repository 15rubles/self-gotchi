package app.selfgotchi.avatar;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The chibi style: prompts and the order frames are drawn in, ported from
 * {@code frontend/scripts/generate-avatar.mjs} (keep the two in step).
 *
 * <p>Consistency (DESIGN.md "Consistency strategy"): photo -> master (normal pose, neutral face)
 * -> 3 more poses edited from the master -> each pose edited into the 5 other expressions and a
 * blink. Every frame derives from the master, never from scratch, so it stays one character.
 */
final class AvatarStyle {

    static final int VERSION = 1;
    static final String NAME = "chibi";

    /** Reference to the uploaded photo in a {@link Frame}'s references. */
    static final String PHOTO = "photo";

    static final List<String> POSES = List.of("NORMAL", "TIRED", "EXHAUSTED", "LAZY");
    static final List<String> FACES = List.of("NEUTRAL", "HAPPY", "WORRIED", "VERY_WORRIED", "TIRED", "EXHAUSTED");

    /** One image: its file name (without extension), the prompt and the images it's edited from. */
    record Frame(String name, String prompt, List<String> references) {
    }

    record Anchor(int x, int y, double scale, Point belly) {
    }

    record Point(int x, int y) {
    }

    private static final String STYLE =
        "Cute chibi cartoon illustration: oversized round head (about 40% of the body height), small body, "
            + "thick dark outlines, flat colors with soft cel shading, sticker-like. Fully transparent background: "
            + "no room, no floor, no ground shadow, no frame, no text, no watermark. Square 1024x1024 canvas.";

    private static final String PLACEMENT =
        "The head is centered horizontally with its center about one third from the top of the canvas and is "
            + "about 430 pixels wide; the whole body fits on the canvas with a small margin.";

    private static final String KEEP_CHARACTER =
        "It must stay the same chibi character as the first image: identical face, hairstyle, colors, outfit, "
            + "outline style and proportions. Any other image is the real person, for likeness only.";

    private static final String KEEP_POSE =
        "Change ONLY the face. Keep the pose, body, hands, outfit, props, colors, outline style, position on "
            + "the canvas and the transparent background exactly the same.";

    static final Frame MASTER = new Frame(frameName("NORMAL", "NEUTRAL"),
        "Turn this person into a chibi character that is clearly recognizable as them: same face shape, "
            + "hairstyle and hair color, skin tone, eye color, facial hair, glasses and accessories if any, and "
            + "the same clothes. Standing relaxed, facing the viewer, arms at the sides, calm neutral expression, "
            + "mouth closed. " + PLACEMENT + " " + STYLE,
        List.of(PHOTO));

    private static final Map<String, String> POSE_PROMPTS = Map.of(
        "TIRED", "Redraw this character with no energy: knees buckling, back hunched, arms hanging down to the knees, "
            + "head drooping slightly forward. Calm neutral face. Keep the head near the same place on the canvas.",
        "EXHAUSTED", "Redraw this character completely collapsed, lying flat on their front across the lower half of the "
            + "canvas, arms and legs limp and splayed, head turned towards the viewer resting on the ground. "
            + "Calm neutral face with eyes open.",
        "LAZY", "Redraw this character sunk deep into a small grey couch, half lying, holding an open bag of chips, "
            + "wearing grey sweatpants, totally unmotivated. Draw the couch in the same chibi style, with "
            + "transparent background around it. Calm neutral face looking at the viewer.");

    private static final Map<String, String> FACE_PROMPTS = Map.of(
        "HAPPY", "Give this character an over-the-top happy face: eyes squeezed shut into upside-down U arcs, a huge "
            + "open grin, rosy cheeks, a few small sparkles around the head.",
        "WORRIED", "Give this character an over-the-top worried face: anxious wide eyes with small pupils, steeply raised "
            + "inner eyebrows, a wobbly zigzag mouth, one big sweat drop sliding down the temple.",
        "VERY_WORRIED", "Give this character an over-the-top panicked face: bulging eyes with pinprick pupils, clenched "
            + "gritted teeth, tears streaming, several sweat drops flying off the head.",
        "TIRED", "Give this character an over-the-top tired face: heavy half-closed eyelids, deep dark bags under the "
            + "eyes, a big yawn, a few small floating \"z\" letters.",
        "EXHAUSTED", "Give this character an over-the-top exhausted face: pale skin, spiral swirly eyes, tongue hanging "
            + "out, a drop of drool, a few \"z\" letters and a tiny ghost-like soul drifting out of the mouth.");

    private static final String BLINK =
        "Make this character blink: both eyes fully closed as simple curved lines, calm face.";

    /** Head center and size per pose, measured on the first generated set (canvas 1024x1024). */
    static final Map<String, Anchor> ANCHORS = Map.of(
        "NORMAL", new Anchor(500, 305, 1, null),
        "TIRED", new Anchor(510, 335, 1, null),
        "EXHAUSTED", new Anchor(360, 650, 1, new Point(600, 730)),
        "LAZY", new Anchor(360, 330, 1, null));

    /** Everything after the master, in an order where each frame's references come first. */
    static final List<Frame> FRAMES = frames();

    private AvatarStyle() {
    }

    static String frameName(String pose, String face) {
        return pose + "_" + face;
    }

    static String blinkName(String pose) {
        return pose + "_BLINK";
    }

    private static List<Frame> frames() {
        List<Frame> frames = new ArrayList<>();
        for (String pose : POSES.subList(1, POSES.size())) {
            frames.add(new Frame(frameName(pose, "NEUTRAL"),
                POSE_PROMPTS.get(pose) + " " + KEEP_CHARACTER + " " + STYLE,
                List.of(MASTER.name(), PHOTO)));
        }
        for (String pose : POSES) {
            for (String face : FACES.subList(1, FACES.size())) {
                frames.add(new Frame(frameName(pose, face),
                    FACE_PROMPTS.get(face) + " " + KEEP_POSE + " " + STYLE,
                    List.of(frameName(pose, "NEUTRAL"))));
            }
        }
        for (String pose : POSES) {
            frames.add(new Frame(blinkName(pose), BLINK + " " + KEEP_POSE + " " + STYLE,
                List.of(frameName(pose, "NEUTRAL"))));
        }
        return List.copyOf(frames);
    }
}
