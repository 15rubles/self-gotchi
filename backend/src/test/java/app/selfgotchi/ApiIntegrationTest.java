package app.selfgotchi;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.TaskType;
import app.selfgotchi.task.CompletionSource;
import app.selfgotchi.task.Task;
import app.selfgotchi.task.TaskCompletion;
import app.selfgotchi.task.TaskCompletionRepository;
import app.selfgotchi.task.TaskRepository;
import app.selfgotchi.user.User;
import app.selfgotchi.user.UserRepository;

@IntegrationTest
class ApiIntegrationTest {

    static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

    static final String TEETH = """
        {"name": "Brush teeth", "category": "PHYSICAL", "effectKey": "MOUTH_SMELL",
         "schedule": {"type": "METER", "slots": [{"by": "10:00"}, {"by": "23:30"}]}}""";
    static final String PREP_FOOD = """
        {"name": "Prepare food", "category": "MENTAL", "effectKey": "LUNCHBOX",
         "schedule": {"type": "CHECK", "deadline": "22:00"}}""";

    @Autowired MockMvc mvc;
    @Autowired MutableClock clock;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired TaskRepository taskRepository;
    @Autowired TaskCompletionRepository completionRepository;

    @BeforeEach
    void startOfTest() {
        clock.set(berlin("2026-10-01T12:00"));
    }

    // ---- helpers ------------------------------------------------------------------------------

    static Instant berlin(String localDateTime) {
        return LocalDateTime.parse(localDateTime).atZone(BERLIN).toInstant();
    }

    ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return call(request, IntegrationTest.USER);
    }

    ResultActions call(MockHttpServletRequestBuilder request, String username) throws Exception {
        return mvc.perform(request.with(user(username)).with(csrf()));
    }

    ResultActions send(MockHttpServletRequestBuilder request, String body) throws Exception {
        return call(request.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    long createTask(String body) throws Exception {
        String response = send(post("/api/v1/tasks"), body)
            .andExpect(status().isCreated())
            .andReturn().getResponse().getContentAsString();
        return json.readTree(response).get("id").asLong();
    }

    JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }

    // ---- security -----------------------------------------------------------------------------

    @Nested
    class Security {

        @Test
        void unauthenticatedApiCallsGet401NotARedirect() throws Exception {
            mvc.perform(get("/api/v1/state")).andExpect(status().isUnauthorized());
        }

        @Test
        void writesNeedACsrfToken() throws Exception {
            mvc.perform(post("/api/v1/tasks").with(user(IntegrationTest.USER))
                    .contentType(MediaType.APPLICATION_JSON).content(TEETH))
                .andExpect(status().isForbidden());
        }

        @Test
        void meReturnsTheBootstrappedUser() throws Exception {
            call(get("/api/v1/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(IntegrationTest.USER))
                .andExpect(jsonPath("$.timezone").value("Europe/Berlin"))
                .andExpect(jsonPath("$.dayResetHour").value(4));
        }
    }

    // ---- settings -----------------------------------------------------------------------------

    @Nested
    class Settings {

        static final String UPDATE = """
            {"displayName": "Lesha", "timezone": "Asia/Tokyo", "dayResetHour": 3}""";

        @Test
        void updateChangesNameZoneAndResetHour() throws Exception {
            send(put("/api/v1/me"), UPDATE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Lesha"))
                .andExpect(jsonPath("$.timezone").value("Asia/Tokyo"))
                .andExpect(jsonPath("$.dayResetHour").value(3));

            call(get("/api/v1/me"))
                .andExpect(jsonPath("$.timezone").value("Asia/Tokyo"))
                .andExpect(jsonPath("$.email").value(IntegrationTest.USER));
        }

        @Test
        void unknownTimeZoneIsAFieldError() throws Exception {
            send(put("/api/v1/me"), """
                {"displayName": "Lesha", "timezone": "Mars/Olympus", "dayResetHour": 4}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("timezone"));
        }

        @Test
        void offsetsAreNotTimeZones() throws Exception {
            // "+02:00" has no daylight-saving rules, so deadlines would drift twice a year.
            send(put("/api/v1/me"), """
                {"displayName": "Lesha", "timezone": "+02:00", "dayResetHour": 4}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("timezone"));
        }

        @Test
        void resetHourMustBeAnHourOfTheDay() throws Exception {
            send(put("/api/v1/me"), """
                {"displayName": "Lesha", "timezone": "Europe/Berlin", "dayResetHour": 24}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("dayResetHour"));
        }

        @Test
        void nameMustNotBeBlank() throws Exception {
            send(put("/api/v1/me"), """
                {"displayName": "   ", "timezone": "Europe/Berlin", "dayResetHour": 4}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("displayName"));
        }

        @Test
        void changingTheResetHourMovesALateNightCompletionToTheNextDay() throws Exception {
            long id = createTask(PREP_FOOD); // checkmark by 22:00, created 2026-10-01 12:00
            clock.set(berlin("2026-10-02T01:40"));
            send(post("/api/v1/tasks/" + id + "/complete"), """
                {"completedAt": "%s"}""".formatted(berlin("2026-10-02T01:30")))
                .andExpect(status().isCreated());

            // 04:00 reset: 01:30 still belongs to Oct 1, so Oct 1 was done late.
            call(get("/api/v1/history").param("from", "2026-10-01").param("to", "2026-10-01"))
                .andExpect(jsonPath("$.tasks[0].days[0].result").value("LATE"));

            send(put("/api/v1/me"), """
                {"displayName": "Lesha", "timezone": "Europe/Berlin", "dayResetHour": 0}""")
                .andExpect(status().isOk());

            // Midnight reset: 01:30 is Oct 2 now, so Oct 1 was missed and Oct 2 is done.
            call(get("/api/v1/history").param("from", "2026-10-01").param("to", "2026-10-02"))
                .andExpect(jsonPath("$.tasks[0].days[0].result").value("MISSED"))
                .andExpect(jsonPath("$.tasks[0].days[1].result").value("ON_TIME"));
        }
    }

    // ---- tasks --------------------------------------------------------------------------------

    @Nested
    class Tasks {

        @Test
        void createAndList() throws Exception {
            long id = createTask(TEETH);

            call(get("/api/v1/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].type").value("METER"))
                .andExpect(jsonPath("$[0].active").value(true))
                .andExpect(jsonPath("$[0].schedule.slots[1].by").value("23:30"));
            call(get("/api/v1/tasks/" + id)).andExpect(jsonPath("$.name").value("Brush teeth"));
        }

        @Test
        void invalidScheduleIs400WithFieldErrors() throws Exception {
            send(post("/api/v1/tasks"), """
                {"name": "Teeth", "category": "PHYSICAL", "effectKey": "MOUTH_SMELL",
                 "schedule": {"type": "METER", "slots": [{"by": "25:00"}]}}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("schedule.slots[0].by"));
        }

        @Test
        void missingNameIs400() throws Exception {
            send(post("/api/v1/tasks"), """
                {"name": " ", "category": "MENTAL", "effectKey": "BOOK",
                 "schedule": {"type": "CHECK", "deadline": "21:00"}}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("name"));
        }

        @Test
        void effectKeyMustMatchCategory() throws Exception {
            send(post("/api/v1/tasks"), """
                {"name": "Homework", "category": "MENTAL", "effectKey": "ROOM",
                 "schedule": {"type": "CHECK", "deadline": "21:00"}}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("effectKey"));
        }

        @Test
        void malformedJsonIs400() throws Exception {
            send(post("/api/v1/tasks"), "{not json").andExpect(status().isBadRequest());
        }

        @Test
        void update() throws Exception {
            long id = createTask(PREP_FOOD);

            send(put("/api/v1/tasks/" + id), """
                {"name": "Prep lunch", "category": "MENTAL", "effectKey": "LUNCHBOX",
                 "schedule": {"type": "CHECK", "deadline": "21:30", "days": ["MON", "TUE"]}}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Prep lunch"))
                .andExpect(jsonPath("$.schedule.deadline").value("21:30"))
                .andExpect(jsonPath("$.schedule.days", hasSize(2)));
        }

        @Test
        void archiveIsASoftDelete() throws Exception {
            long id = createTask(PREP_FOOD);

            call(delete("/api/v1/tasks/" + id)).andExpect(status().isNoContent());

            call(get("/api/v1/tasks")).andExpect(jsonPath("$", empty()));
            call(get("/api/v1/tasks?includeArchived=true"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].active").value(false))
                .andExpect(jsonPath("$[0].archivedAt").isNotEmpty());
            call(get("/api/v1/state")).andExpect(jsonPath("$.tasks", empty()));
            send(put("/api/v1/tasks/" + id), PREP_FOOD).andExpect(status().isConflict());
            call(post("/api/v1/tasks/" + id + "/complete")).andExpect(status().isConflict());
            call(delete("/api/v1/tasks/" + id)).andExpect(status().isNoContent()); // idempotent
        }

        @Test
        void unknownTaskIs404() throws Exception {
            call(get("/api/v1/tasks/999999")).andExpect(status().isNotFound());
            call(delete("/api/v1/tasks/999999")).andExpect(status().isNotFound());
        }
    }

    // ---- state, complete, undo ----------------------------------------------------------------

    @Nested
    class StateAndCompletions {

        @Test
        void completeReturnsTheNewStateAndUndoRevertsIt() throws Exception {
            long teeth = createTask(TEETH);
            clock.set(berlin("2026-10-05T23:40"));

            call(get("/api/v1/state"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preview").value(false))
                .andExpect(jsonPath("$.logicalDate").value("2026-10-05"))
                .andExpect(jsonPath("$.character.effects[0].key").value("MOUTH_SMELL"))
                .andExpect(jsonPath("$.character.effects[0].severity").value(2))
                .andExpect(jsonPath("$.tasks[0].status").value("MISSED"));

            JsonNode completed = body(call(post("/api/v1/tasks/" + teeth + "/complete"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.completion.taskId").value(teeth))
                .andExpect(jsonPath("$.completion.source").value("APP"))
                .andExpect(jsonPath("$.state.character.effects[0].severity").value(1))
                .andExpect(jsonPath("$.state.tasks[0].done").value(1)));
            long completionId = completed.at("/completion/id").asLong();

            call(delete("/api/v1/completions/" + completionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.character.effects[0].severity").value(2))
                .andExpect(jsonPath("$.tasks[0].done").value(0));
            call(delete("/api/v1/completions/" + completionId)).andExpect(status().isNotFound());
        }

        @Test
        void completedAtRecordsAnEarlierCompletion() throws Exception {
            long teeth = createTask(TEETH);
            clock.set(berlin("2026-10-05T12:00"));

            send(post("/api/v1/tasks/" + teeth + "/complete"), "{\"completedAt\": \"2026-10-05T06:00:00Z\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.completion.completedAt").value("2026-10-05T06:00:00Z"))
                .andExpect(jsonPath("$.state.tasks[0].severity").value(0));
        }

        @Test
        void completedAtInTheFutureOrBeforeCreationIs400() throws Exception {
            long teeth = createTask(TEETH);
            clock.set(berlin("2026-10-05T12:00"));

            send(post("/api/v1/tasks/" + teeth + "/complete"), "{\"completedAt\": \"2026-10-05T14:00:00Z\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("completedAt"));
            send(post("/api/v1/tasks/" + teeth + "/complete"), "{\"completedAt\": \"2026-09-01T00:00:00Z\"}")
                .andExpect(status().isBadRequest());
        }

        @Test
        void atPreviewsAnotherMoment() throws Exception {
            createTask(TEETH);
            clock.set(berlin("2026-10-05T09:00"));

            call(get("/api/v1/state"))
                .andExpect(jsonPath("$.character.effects", empty()))
                .andExpect(jsonPath("$.tasks[0].status").value("DUE_SOON"));
            call(get("/api/v1/state").param("at", berlin("2026-10-05T23:40").toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.preview").value(true))
                .andExpect(jsonPath("$.at").value("2026-10-05T21:40:00Z"))
                .andExpect(jsonPath("$.character.effects[0].severity").value(2));
        }

        @Test
        void badAtIs400() throws Exception {
            call(get("/api/v1/state").param("at", "tomorrow")).andExpect(status().isBadRequest());
        }

        @Test
        void stateCombinesTasksIntoTheCharacter() throws Exception {
            createTask(TEETH);
            createTask(PREP_FOOD);
            clock.set(berlin("2026-10-05T23:40"));

            call(get("/api/v1/state"))
                .andExpect(jsonPath("$.tasks", hasSize(2)))
                .andExpect(jsonPath("$.character.pose").value("NORMAL"))
                .andExpect(jsonPath("$.character.face").value("VERY_WORRIED"))
                .andExpect(jsonPath("$.character.icons[0].key").value("LUNCHBOX"))
                .andExpect(jsonPath("$.character.iconOverflow").value(0));
        }
    }

    // ---- history ------------------------------------------------------------------------------

    @Nested
    class History {

        @Test
        void perDayResultsAndStreaks() throws Exception {
            long prep = createTask(PREP_FOOD); // created Thu 2026-10-01 12:00
            clock.set(berlin("2026-10-05T12:00"));
            for (String day : new String[] {"2026-10-02", "2026-10-03", "2026-10-04"}) {
                send(post("/api/v1/tasks/" + prep + "/complete"),
                    "{\"completedAt\": \"" + berlin(day + "T20:00") + "\"}").andExpect(status().isCreated());
            }

            call(get("/api/v1/history").param("from", "2026-09-30").param("to", "2026-10-05"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.from").value("2026-09-30"))
                .andExpect(jsonPath("$.tasks", hasSize(1)))
                .andExpect(jsonPath("$.tasks[0].effectKey").value("LUNCHBOX"))
                .andExpect(jsonPath("$.tasks[0].currentStreak").value(3))
                .andExpect(jsonPath("$.tasks[0].bestStreak").value(3))
                .andExpect(jsonPath("$.tasks[0].days", hasSize(6)))
                .andExpect(jsonPath("$.tasks[0].days[0].result").value("NONE"))
                .andExpect(jsonPath("$.tasks[0].days[1].result").value("MISSED"))
                .andExpect(jsonPath("$.tasks[0].days[2].result").value("ON_TIME"))
                .andExpect(jsonPath("$.tasks[0].days[5].result").value("PENDING"));
        }

        @Test
        void defaultsToTwelveWeeksEndingToday() throws Exception {
            clock.set(berlin("2026-10-05T12:00"));

            call(get("/api/v1/history"))
                .andExpect(jsonPath("$.to").value("2026-10-05"))
                .andExpect(jsonPath("$.from").value("2026-07-14"));
        }

        @Test
        void invalidRangeIs400() throws Exception {
            call(get("/api/v1/history").param("from", "2026-10-05").param("to", "2026-10-01"))
                .andExpect(status().isBadRequest());
            call(get("/api/v1/history").param("from", "2024-01-01").param("to", "2026-10-01"))
                .andExpect(status().isBadRequest());
        }

        @Test
        void archivedTasksStayInHistory() throws Exception {
            long prep = createTask(PREP_FOOD);
            call(delete("/api/v1/tasks/" + prep));

            call(get("/api/v1/history"))
                .andExpect(jsonPath("$.tasks", hasSize(1)))
                .andExpect(jsonPath("$.tasks[0].active").value(false));
        }
    }

    // ---- isolation ----------------------------------------------------------------------------

    @Nested
    class UserIsolation {

        @Test
        void anotherUsersTasksAndCompletionsAreInvisible() throws Exception {
            User other = users.save(new User("other@test.local", "Other", BERLIN, 4, clock.instant()));
            Task theirs = new Task(other.getId(), clock.instant());
            theirs.update("Their task", Category.MENTAL, TaskType.CHECK, EffectKey.BOOK,
                "{\"type\":\"CHECK\",\"deadline\":\"21:00\"}", 0, clock.instant());
            taskRepository.save(theirs);
            TaskCompletion theirCompletion = completionRepository.save(
                new TaskCompletion(theirs.getId(), other.getId(), clock.instant(), CompletionSource.APP, clock.instant()));
            createTask(TEETH);

            String path = "/api/v1/tasks/" + theirs.getId();
            call(get(path)).andExpect(status().isNotFound());
            send(put(path), PREP_FOOD).andExpect(status().isNotFound());
            call(delete(path)).andExpect(status().isNotFound());
            call(post(path + "/complete")).andExpect(status().isNotFound());
            call(delete("/api/v1/completions/" + theirCompletion.getId())).andExpect(status().isNotFound());
            call(get("/api/v1/tasks")).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Brush teeth"));
            call(get("/api/v1/history")).andExpect(jsonPath("$.tasks", hasSize(1)));

            call(get("/api/v1/state"), "other@test.local")
                .andExpect(jsonPath("$.tasks", hasSize(1)))
                .andExpect(jsonPath("$.tasks[0].name", is("Their task")));
        }
    }
}
