package app.selfgotchi.task;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import app.selfgotchi.user.CurrentUserService;
import app.selfgotchi.user.User;

@RestController
@RequestMapping("/api/v1/tasks")
@Validated
public class TaskController {

    private final TaskService tasks;
    private final ScheduleCodec codec;
    private final CurrentUserService currentUser;

    public TaskController(TaskService tasks, ScheduleCodec codec, CurrentUserService currentUser) {
        this.tasks = tasks;
        this.codec = codec;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<TaskResponse> list(@RequestParam(defaultValue = "false") boolean includeArchived) {
        User user = currentUser.require();
        return tasks.list(user, includeArchived).stream().map(t -> TaskResponse.from(t, codec)).toList();
    }

    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable long id) {
        return TaskResponse.from(tasks.get(currentUser.require(), id), codec);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse create(@Valid @RequestBody TaskRequest request) {
        return TaskResponse.from(tasks.create(currentUser.require(), request), codec);
    }

    @PutMapping("/{id}")
    public TaskResponse update(@PathVariable long id, @Valid @RequestBody TaskRequest request) {
        return TaskResponse.from(tasks.update(currentUser.require(), id, request), codec);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable long id) {
        tasks.archive(currentUser.require(), id);
    }
}
