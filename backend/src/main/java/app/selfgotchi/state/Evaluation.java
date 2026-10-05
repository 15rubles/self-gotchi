package app.selfgotchi.state;

import java.time.LocalDate;
import java.util.List;

import app.selfgotchi.state.model.CharacterState;
import app.selfgotchi.state.model.TaskEvaluation;

/** Full engine output: the character plus each task's status, in the input task order. */
public record Evaluation(LocalDate logicalDate, CharacterState character, List<TaskEvaluation> tasks) {

    public Evaluation {
        tasks = List.copyOf(tasks);
    }
}
