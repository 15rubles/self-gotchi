package app.selfgotchi.task;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.selfgotchi.common.ConflictException;
import app.selfgotchi.common.NotFoundException;
import app.selfgotchi.common.ValidationException;
import app.selfgotchi.state.TaskValidator;
import app.selfgotchi.state.TaskValidator.Violation;
import app.selfgotchi.state.model.Schedule;
import app.selfgotchi.state.model.TaskDef;
import app.selfgotchi.user.User;

/** Task definitions for one user. Every lookup is scoped by the user's id. */
@Service
@Transactional
public class TaskService {

    private final TaskRepository tasks;
    private final ScheduleCodec codec;
    private final Clock clock;

    public TaskService(TaskRepository tasks, ScheduleCodec codec, Clock clock) {
        this.tasks = tasks;
        this.codec = codec;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<Task> list(User user, boolean includeArchived) {
        return includeArchived
            ? tasks.findByUserIdOrderBySortOrderAscIdAsc(user.getId())
            : tasks.findByUserIdAndActiveTrueOrderBySortOrderAscIdAsc(user.getId());
    }

    @Transactional(readOnly = true)
    public Task get(User user, long id) {
        return tasks.findByIdAndUserId(id, user.getId())
            .orElseThrow(() -> new NotFoundException("task " + id + " not found"));
    }

    public Task create(User user, TaskRequest request) {
        Schedule schedule = validate(user, request);
        Instant now = clock.instant();
        int sortOrder = request.sortOrder() != null ? request.sortOrder() : (int) tasks.countByUserId(user.getId());
        Task task = new Task(user.getId(), now);
        if (request.importUid() != null && !request.importUid().isBlank()) {
            if (tasks.existsByUserIdAndImportUid(user.getId(), request.importUid())) {
                throw new ConflictException("this calendar event was already imported");
            }
            task.setImportUid(request.importUid());
        }
        task.update(request.name().strip(), request.category(), schedule.type(), request.effectKey(),
            codec.toJson(schedule), sortOrder, now);
        return tasks.save(task);
    }

    public Task update(User user, long id, TaskRequest request) {
        Task task = get(user, id);
        if (!task.isActive()) {
            throw new ConflictException("task " + id + " is archived");
        }
        Schedule schedule = validate(user, request);
        int sortOrder = request.sortOrder() != null ? request.sortOrder() : task.getSortOrder();
        task.update(request.name().strip(), request.category(), schedule.type(), request.effectKey(),
            codec.toJson(schedule), sortOrder, clock.instant());
        return task;
    }

    /** Soft delete: the task leaves the active list and the character, its history stays. Idempotent. */
    public void archive(User user, long id) {
        Task task = get(user, id);
        if (task.isActive()) {
            task.archive(clock.instant());
        }
    }

    /** UIDs of calendar events the user already imported (for the import review). */
    @Transactional(readOnly = true)
    public java.util.Set<String> importedUids(User user) {
        return tasks.findByUserIdAndImportUidIsNotNull(user.getId()).stream()
            .map(Task::getImportUid)
            .collect(java.util.stream.Collectors.toSet());
    }

    public TaskDef toDef(Task task) {
        return new TaskDef(task.getId(), task.getName(), task.getCategory(), task.getEffectKey(),
            codec.fromJson(task.getSchedule()), task.getSortOrder(), task.getCreatedAt());
    }

    private Schedule validate(User user, TaskRequest request) {
        Schedule schedule = codec.decode(request.schedule());
        List<Violation> violations = TaskValidator.validate(request.category(), request.effectKey(), schedule,
            user.getDayResetHour());
        if (!violations.isEmpty()) {
            throw new ValidationException(violations);
        }
        return schedule;
    }
}
