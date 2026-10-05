package app.selfgotchi.task;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.ZoneId;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import app.selfgotchi.IntegrationTest;
import app.selfgotchi.MutableClock;
import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.TaskType;
import app.selfgotchi.user.User;
import app.selfgotchi.user.UserRepository;

@IntegrationTest
class SeedIntegrationTest {

    @Autowired SeedRunner seedRunner;
    @Autowired UserRepository users;
    @Autowired TaskRepository tasks;
    @Autowired TaskService taskService;
    @Autowired MutableClock clock;

    private User freshUser() {
        return users.save(new User("seed@test.local", "Seed", ZoneId.of("Europe/Berlin"), 4, clock.instant()));
    }

    @Test
    void seedsTheSixHabitsFromTheDesignDoc() {
        User user = freshUser();

        assertThat(seedRunner.seed(user)).isEqualTo(6);

        var seeded = tasks.findByUserIdAndActiveTrueOrderBySortOrderAscIdAsc(user.getId());
        assertThat(seeded).extracting(Task::getName).containsExactly(
            "Brush teeth", "Eat", "Work out", "Clean your place", "Prepare food for tomorrow", "Homework");
        assertThat(seeded).extracting(Task::getType).containsExactly(
            TaskType.METER, TaskType.METER, TaskType.QUOTA, TaskType.FRESHNESS, TaskType.CHECK, TaskType.CHECK);
        // every seeded schedule decodes into the engine model
        seeded.forEach(taskService::toDef);
    }

    @Test
    void addsTheHabitsNextToTheUsersOwnButSkipsSameNames() {
        User user = freshUser();
        Task own = new Task(user.getId(), clock.instant());
        own.update("make a bed", Category.PHYSICAL, TaskType.CHECK,
            EffectKey.ROOM, "{\"type\":\"CHECK\",\"deadline\":\"16:00\"}", 0, clock.instant());
        tasks.save(own);
        Task homework = new Task(user.getId(), clock.instant());
        homework.update("homework", Category.MENTAL, TaskType.CHECK,
            EffectKey.BOOK, "{\"type\":\"CHECK\",\"deadline\":\"20:00\"}", 1, clock.instant());
        tasks.save(homework);

        assertThat(seedRunner.seed(user)).isEqualTo(5);
        assertThat(tasks.findByUserIdOrderBySortOrderAscIdAsc(user.getId())).hasSize(7);
    }

    @Test
    void neverSeedsTwiceOrOverAUsersOwnHabits() {
        User user = freshUser();
        seedRunner.seed(user);
        tasks.findByUserIdAndActiveTrueOrderBySortOrderAscIdAsc(user.getId())
            .forEach(task -> taskService.archive(user, task.getId()));

        assertThat(seedRunner.seed(user)).isZero();
        assertThat(tasks.findByUserIdOrderBySortOrderAscIdAsc(user.getId())).hasSize(6);
    }
}
