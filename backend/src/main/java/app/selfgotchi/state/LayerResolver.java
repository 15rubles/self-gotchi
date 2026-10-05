package app.selfgotchi.state;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import app.selfgotchi.state.model.CharacterState;
import app.selfgotchi.state.model.CharacterState.Effect;
import app.selfgotchi.state.model.CharacterState.EffectType;
import app.selfgotchi.state.model.CharacterState.Icon;
import app.selfgotchi.state.model.CharacterState.IconType;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.Face;
import app.selfgotchi.state.model.Pose;
import app.selfgotchi.state.model.TaskDef;
import app.selfgotchi.state.model.TaskEvaluation;

/**
 * Turns per-task severities into the five layers (DESIGN.md "Task to visual mapping" and
 * "Resolving conflicts"). Several tasks on the same physical key take the highest severity;
 * each mental task gets its own icon.
 */
final class LayerResolver {

    private LayerResolver() {
    }

    /** @param tasks and evaluations in the same order */
    static CharacterState resolve(List<TaskDef> tasks, List<TaskEvaluation> evaluations, int streakMinLength) {
        Map<EffectKey, Integer> physical = new EnumMap<>(EffectKey.class);
        List<IconEntry> icons = new ArrayList<>();
        int mental = 0;
        boolean allFine = true;
        boolean streakActive = false;

        for (int i = 0; i < tasks.size(); i++) {
            TaskDef task = tasks.get(i);
            TaskEvaluation eval = evaluations.get(i);
            int severity = eval.severity();
            allFine &= severity == 0;
            streakActive |= eval.streak() >= streakMinLength;
            switch (task.effectKey()) {
                case MOUTH_SMELL, HUNGER, MOTIVATION, ROOM -> physical.merge(task.effectKey(), severity, Math::max);
                case LUNCHBOX, BOOK, GENERIC -> {
                    mental = Math.max(mental, severity);
                    if (severity > 0) {
                        icons.add(new IconEntry(new Icon(iconFor(task.effectKey()), severity, task.id()), task.sortOrder()));
                    }
                }
            }
        }

        int smell = physical.getOrDefault(EffectKey.MOUTH_SMELL, 0);
        int hunger = physical.getOrDefault(EffectKey.HUNGER, 0);
        int motivation = physical.getOrDefault(EffectKey.MOTIVATION, 0);
        int room = physical.getOrDefault(EffectKey.ROOM, 0);

        List<Effect> effects = new ArrayList<>();
        if (smell > 0) {
            effects.add(new Effect(EffectType.MOUTH_SMELL, smell));
        }
        if (hunger > 0) {
            effects.add(new Effect(EffectType.BELLY_GROWL, hunger));
        }
        if (motivation == 1) {
            effects.add(new Effect(EffectType.SLOUCH, 1));
        }
        if (motivation == 3) {
            effects.add(new Effect(EffectType.SWEATPANTS, 3));
        }

        Pose pose = hunger >= 3 ? Pose.EXHAUSTED
            : hunger == 2 ? Pose.TIRED
            : motivation >= 2 ? Pose.LAZY
            : Pose.NORMAL;

        boolean happy = allFine && streakActive;
        Face face = face(hunger >= 2 ? hunger : 0, mental >= 2 ? mental : 0, happy);

        icons.sort(Comparator.comparingInt((IconEntry e) -> -e.icon.severity())
            .thenComparingInt(IconEntry::sortOrder)
            .thenComparingLong(e -> e.icon.taskId()));
        List<Icon> shown = icons.stream().limit(CharacterState.MAX_ICONS).map(IconEntry::icon).toList();
        int overflow = Math.max(0, icons.size() - CharacterState.MAX_ICONS);

        return new CharacterState(pose, face, room, effects, shown, overflow, happy);
    }

    /** Highest-severity mood wins; ties go to physical. Moods start at severity 2. */
    private static Face face(int physicalMood, int mentalMood, boolean happy) {
        if (physicalMood == 0 && mentalMood == 0) {
            return happy ? Face.HAPPY : Face.NEUTRAL;
        }
        if (physicalMood >= mentalMood) {
            return physicalMood >= 3 ? Face.EXHAUSTED : Face.TIRED;
        }
        return mentalMood >= 3 ? Face.VERY_WORRIED : Face.WORRIED;
    }

    private static IconType iconFor(EffectKey key) {
        return switch (key) {
            case LUNCHBOX -> IconType.LUNCHBOX;
            case BOOK -> IconType.BOOK;
            default -> IconType.GENERIC;
        };
    }

    private record IconEntry(Icon icon, int sortOrder) {
    }
}
