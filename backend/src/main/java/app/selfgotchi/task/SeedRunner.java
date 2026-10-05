package app.selfgotchi.task;

import java.time.Clock;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.user.AuthProperties;
import app.selfgotchi.user.User;
import app.selfgotchi.user.UserRepository;

/**
 * Creates the six habits from DESIGN.md ("Your six habits as configured tasks") for the
 * configured user, once per user (recorded in users.seeded_at), so archiving, renaming or
 * editing them is never undone by a restart. Habits the user already has with the same name
 * are skipped. Disable with APP_SEED=false.
 */
@Component
@Order(1) // after UserBootstrap
public class SeedRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedRunner.class);

    record Habit(String name, Category category, EffectKey effectKey, String scheduleJson) {
    }

    static final List<Habit> SIX_HABITS = List.of(
        new Habit("Brush teeth", Category.PHYSICAL, EffectKey.MOUTH_SMELL,
            "{\"type\":\"METER\",\"slots\":[{\"by\":\"10:00\"},{\"by\":\"23:30\"}]}"),
        new Habit("Eat", Category.PHYSICAL, EffectKey.HUNGER,
            "{\"type\":\"METER\",\"count\":3,\"minGapMinutes\":180,\"firstBy\":\"11:00\",\"lastBy\":\"21:00\"}"),
        new Habit("Work out", Category.PHYSICAL, EffectKey.MOTIVATION,
            "{\"type\":\"QUOTA\",\"timesPerWeek\":3,\"weekStarts\":\"MON\"}"),
        new Habit("Clean your place", Category.PHYSICAL, EffectKey.ROOM,
            "{\"type\":\"FRESHNESS\",\"thresholdsDays\":[3,5,7]}"),
        new Habit("Prepare food for tomorrow", Category.MENTAL, EffectKey.LUNCHBOX,
            "{\"type\":\"CHECK\",\"deadline\":\"22:00\"}"),
        new Habit("Homework", Category.MENTAL, EffectKey.BOOK,
            "{\"type\":\"CHECK\",\"days\":[\"MON\",\"TUE\",\"WED\",\"THU\"],\"deadline\":\"21:00\"}"));

    private final boolean enabled;
    private final UserRepository users;
    private final AuthProperties auth;
    private final TaskRepository tasks;
    private final TaskService taskService;
    private final ObjectMapper mapper;
    private final Clock clock;

    public SeedRunner(@Value("${app.seed.enabled:true}") boolean enabled, UserRepository users, AuthProperties auth,
                      TaskRepository tasks, TaskService taskService, ObjectMapper mapper, Clock clock) {
        this.enabled = enabled;
        this.users = users;
        this.auth = auth;
        this.tasks = tasks;
        this.taskService = taskService;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (enabled) {
            users.findByEmail(auth.username()).ifPresent(this::seed);
        }
    }

    /** @return how many habits were created (0 if this user was seeded before) */
    @Transactional
    public int seed(User user) {
        if (user.getSeededAt() != null) {
            return 0;
        }
        Set<String> existing = tasks.findByUserIdOrderBySortOrderAscIdAsc(user.getId()).stream()
            .map(task -> task.getName().strip().toLowerCase())
            .collect(Collectors.toSet());
        int created = 0;
        for (int i = 0; i < SIX_HABITS.size(); i++) {
            Habit habit = SIX_HABITS.get(i);
            if (existing.contains(habit.name().toLowerCase())) {
                continue;
            }
            try {
                taskService.create(user, new TaskRequest(habit.name(), habit.category(), habit.effectKey(),
                    mapper.readTree(habit.scheduleJson()), i));
                created++;
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("bad seed schedule for " + habit.name(), e);
            }
        }
        user.markSeeded(clock.instant());
        users.save(user);
        log.info("Seeded {} habits for {}", created, user.getEmail());
        return created;
    }
}
