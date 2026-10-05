package app.selfgotchi.task;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import app.selfgotchi.TestcontainersConfig;
import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.MeterSchedule;
import app.selfgotchi.state.model.TaskType;
import app.selfgotchi.user.User;
import app.selfgotchi.user.UserRepository;

/** Flyway migrations apply to a real Postgres and the entities map onto them (ddl-auto=validate). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfig.class)
class PersistenceIntegrationTest {

    private static final Instant NOW = Instant.parse("2026-10-05T08:00:00Z");

    @Autowired UserRepository users;
    @Autowired TaskRepository tasks;
    @Autowired TaskCompletionRepository completions;
    @Autowired JdbcTemplate jdbc;

    private final ScheduleCodec codec = new ScheduleCodec(new ObjectMapper());

    @Test
    void allDesignDocTablesExist() {
        List<String> tables = jdbc.queryForList(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'", String.class);

        assertThat(tables).contains("users", "tasks", "task_completions", "avatars", "avatar_assets",
            "generation_jobs", "push_subscriptions", "notification_log");
    }

    @Test
    void storesScheduleAsJsonbAndScopesByUser() {
        User me = users.save(new User("me@example.com", "Me", ZoneId.of("Europe/Berlin"), 4, NOW));
        User other = users.save(new User("other@example.com", "Other", ZoneId.of("UTC"), 4, NOW));

        Task teeth = new Task(me.getId(), NOW);
        String json = codec.toJson(MeterSchedule.ofSlots(java.time.LocalTime.of(10, 0), java.time.LocalTime.of(23, 30)));
        teeth.update("Brush teeth", Category.PHYSICAL, TaskType.METER, EffectKey.MOUTH_SMELL, json, 1, NOW);
        tasks.saveAndFlush(teeth);

        String storedType = jdbc.queryForObject(
            "SELECT jsonb_typeof(schedule) || ':' || (schedule ->> 'type') FROM tasks WHERE id = ?",
            String.class, teeth.getId());
        assertThat(storedType).isEqualTo("object:METER");

        Task reloaded = tasks.findByIdAndUserId(teeth.getId(), me.getId()).orElseThrow();
        assertThat(codec.fromJson(reloaded.getSchedule())).isEqualTo(codec.fromJson(json));
        assertThat(tasks.findByIdAndUserId(teeth.getId(), other.getId())).isEmpty();

        completions.saveAndFlush(new TaskCompletion(teeth.getId(), me.getId(), NOW, CompletionSource.APP, NOW));
        assertThat(completions.findByUserIdAndCompletedAtGreaterThanEqualAndCompletedAtLessThanOrderByCompletedAtAsc(
            me.getId(), NOW, NOW.plusSeconds(1))).hasSize(1);
        assertThat(completions.findByUserIdAndCompletedAtGreaterThanEqualAndCompletedAtLessThanOrderByCompletedAtAsc(
            other.getId(), NOW, NOW.plusSeconds(1))).isEmpty();
    }

    @Test
    void archivedTasksDropOutOfTheActiveList() {
        User me = users.save(new User("me2@example.com", "Me", ZoneId.of("UTC"), 4, NOW));
        Task task = new Task(me.getId(), NOW);
        task.update("Homework", Category.MENTAL, TaskType.CHECK, EffectKey.BOOK,
            "{\"type\":\"CHECK\",\"deadline\":\"21:00\"}", 0, NOW);
        tasks.save(task);
        task.archive(NOW);
        tasks.flush();

        assertThat(tasks.findByUserIdAndActiveTrueOrderBySortOrderAscIdAsc(me.getId())).isEmpty();
        assertThat(tasks.findByUserIdOrderBySortOrderAscIdAsc(me.getId())).hasSize(1);
    }
}
