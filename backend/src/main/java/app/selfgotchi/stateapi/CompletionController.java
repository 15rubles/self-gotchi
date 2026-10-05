package app.selfgotchi.stateapi;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import app.selfgotchi.task.CompletionResponse;
import app.selfgotchi.task.CompletionService;
import app.selfgotchi.task.CompletionSource;
import app.selfgotchi.task.TaskCompletion;
import app.selfgotchi.user.CurrentUserService;
import app.selfgotchi.user.User;

/**
 * Completing and undoing. Both return the new state so the character reacts without a
 * second request. Lives here (not in {@code task}) because it composes the log with the engine.
 */
@RestController
@RequestMapping("/api/v1")
public class CompletionController {

    /** @param completedAt optional, for "I did it earlier" */
    public record CompleteRequest(Instant completedAt) {
    }

    public record CompleteResponse(CompletionResponse completion, StateResponse state) {
    }

    private final CompletionService completions;
    private final StateService state;
    private final CurrentUserService currentUser;

    public CompletionController(CompletionService completions, StateService state, CurrentUserService currentUser) {
        this.completions = completions;
        this.state = state;
        this.currentUser = currentUser;
    }

    @PostMapping("/tasks/{id}/complete")
    @ResponseStatus(HttpStatus.CREATED)
    public CompleteResponse complete(@PathVariable long id, @RequestBody(required = false) CompleteRequest request) {
        User user = currentUser.require();
        TaskCompletion completion = completions.complete(user, id,
            request == null ? null : request.completedAt(), CompletionSource.APP);
        return new CompleteResponse(CompletionResponse.from(completion), state.state(user, null));
    }

    @DeleteMapping("/completions/{id}")
    public StateResponse undo(@PathVariable long id) {
        User user = currentUser.require();
        completions.undo(user, id);
        return state.state(user, null);
    }
}
