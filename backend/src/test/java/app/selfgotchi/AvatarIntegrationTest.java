package app.selfgotchi;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.aMapWithSize;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.ZoneId;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import app.selfgotchi.avatar.Avatar;
import app.selfgotchi.avatar.AvatarGenerator;
import app.selfgotchi.avatar.AvatarRepository;
import app.selfgotchi.user.User;
import app.selfgotchi.user.UserRepository;

@IntegrationTest
class AvatarIntegrationTest {

    static final byte[] JPEG = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, (byte) 0xe0, 0, 16, 'J', 'F', 'I', 'F'};
    /** Master + 3 poses + 4x5 faces + 4 blinks. */
    static final int FRAMES_AFTER_MASTER = 27;

    @Autowired MockMvc mvc;
    @Autowired MutableClock clock;
    @Autowired ObjectMapper json;
    @Autowired FakeImageProvider images;
    @Autowired AvatarRepository avatars;
    @Autowired AvatarGenerator generator;
    @Autowired UserRepository users;

    @BeforeEach
    void reset() {
        images.reset();
    }

    ResultActions call(MockHttpServletRequestBuilder request) throws Exception {
        return call(request, IntegrationTest.USER);
    }

    ResultActions call(MockHttpServletRequestBuilder request, String username) throws Exception {
        return mvc.perform(request.with(user(username)).with(csrf()));
    }

    ResultActions upload(byte[] photo) throws Exception {
        return call(multipart("/api/v1/avatar").file(new MockMultipartFile("photo", "me.jpg", "image/jpeg", photo)));
    }

    JsonNode body(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }

    /** Upload + approve: a finished avatar. */
    JsonNode makeAvatar() throws Exception {
        upload(JPEG).andExpect(status().isAccepted());
        return body(call(post("/api/v1/avatar/draft/approve")).andExpect(status().isOk()));
    }

    @Test
    void uploadDrawsTheMasterFromThePhotoForReview() throws Exception {
        JsonNode response = body(upload(JPEG)
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.available").value(true))
            .andExpect(jsonPath("$.active").value(nullValue()))
            .andExpect(jsonPath("$.draft.status").value("REVIEW"))
            .andExpect(jsonPath("$.draft.step").value("MASTER"))
            .andExpect(jsonPath("$.draft.done").value(1))
            .andExpect(jsonPath("$.draft.masterUrl").value(containsString("/files/NORMAL_NEUTRAL?v="))));

        assertThat(images.calls).hasSize(1);
        assertThat(images.calls.getFirst().references()).isEqualTo(1);
        call(get(response.at("/draft/masterUrl").asText()))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Type", "image/png"))
            .andExpect(header().string("Cache-Control", containsString("private")));
    }

    @Test
    void approvingDrawsEveryOtherFrameAndActivatesTheAvatar() throws Exception {
        JsonNode response = makeAvatar();

        assertThat(response.at("/draft").isNull()).isTrue();
        assertThat(response.at("/active/style").asText()).isEqualTo("chibi");
        assertThat(response.at("/active/frames").size()).isEqualTo(24);
        assertThat(response.at("/active/blinks").size()).isEqualTo(4);
        assertThat(response.at("/active/poseAnchors/EXHAUSTED/belly/x").asInt()).isEqualTo(600);
        assertThat(images.calls).hasSize(1 + FRAMES_AFTER_MASTER);
        // poses are drawn from the master and the photo, expressions from their pose
        assertThat(images.calls.get(1).references()).isEqualTo(2);
        assertThat(images.calls.get(4).references()).isEqualTo(1);

        call(get(response.at("/active/frames/LAZY~1TIRED").asText())).andExpect(status().isOk());
        long id = response.at("/active/id").asLong();
        // the photo is deleted when the avatar is done, and never served anyway
        call(get("/api/v1/avatar/" + id + "/files/photo")).andExpect(status().isNotFound());
        call(get("/api/v1/avatar")).andExpect(jsonPath("$.active.frames", aMapWithSize(24)));
    }

    @Test
    void retryRedrawsTheMaster() throws Exception {
        upload(JPEG);
        call(post("/api/v1/avatar/draft/retry"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.draft.status").value("REVIEW"));
        assertThat(images.calls).hasSize(2);
    }

    @Test
    void aFailedFrameIsReportedAndRetryResumesWhereItStopped() throws Exception {
        upload(JPEG);
        images.failCall = 5;
        call(post("/api/v1/avatar/draft/approve"))
            .andExpect(jsonPath("$.draft.status").value("FAILED"))
            .andExpect(jsonPath("$.draft.step").value("FRAMES"))
            .andExpect(jsonPath("$.draft.done").value(3))
            .andExpect(jsonPath("$.draft.error").value(containsString("HTTP 500")))
            .andExpect(jsonPath("$.active").value(nullValue()));

        call(post("/api/v1/avatar/draft/retry"))
            .andExpect(jsonPath("$.draft").value(nullValue()))
            .andExpect(jsonPath("$.active.frames", aMapWithSize(24)));
        // 1 master + 4 calls (the 4th failed) + the 24 frames still missing
        assertThat(images.calls).hasSize(1 + 4 + (FRAMES_AFTER_MASTER - 3));
    }

    @Test
    void aNewAvatarBecomesActiveAndTheOldOneStaysToPickFrom() throws Exception {
        JsonNode first = makeAvatar();
        long firstId = first.at("/active/id").asLong();
        String oldFrame = first.at("/active/frames/NORMAL~1HAPPY").asText();

        JsonNode second = makeAvatar();
        long secondId = second.at("/active/id").asLong();
        assertThat(secondId).isNotEqualTo(firstId);
        call(get(oldFrame)).andExpect(status().isOk());
        // newest first, the active one marked, each with a thumbnail
        assertThat(second.at("/avatars").size()).isEqualTo(2);
        assertThat(second.at("/avatars/0/id").asLong()).isEqualTo(secondId);
        assertThat(second.at("/avatars/0/active").asBoolean()).isTrue();
        assertThat(second.at("/avatars/1/active").asBoolean()).isFalse();
        assertThat(second.at("/avatars/1/thumbnailUrl").asText()).contains("/" + firstId + "/files/NORMAL_NEUTRAL");
    }

    JsonNode select(Object id) throws Exception {
        return body(call(put("/api/v1/avatar/active").contentType(MediaType.APPLICATION_JSON)
            .content("{\"id\": " + id + "}")).andExpect(status().isOk()));
    }

    @Test
    void switchingBetweenAvatarsAndTheBuiltInArt() throws Exception {
        long firstId = makeAvatar().at("/active/id").asLong();
        makeAvatar();

        JsonNode back = select(firstId);
        assertThat(back.at("/active/id").asLong()).isEqualTo(firstId);
        assertThat(back.at("/avatars/1/active").asBoolean()).isTrue();
        assertThat(back.at("/avatars/0/active").asBoolean()).isFalse();

        JsonNode builtIn = select(null);
        assertThat(builtIn.at("/active").isNull()).isTrue();
        assertThat(builtIn.at("/avatars").size()).isEqualTo(2);
        assertThat(images.calls).hasSize(2 * (1 + FRAMES_AFTER_MASTER)); // switching draws nothing
    }

    @Test
    void deletingAnAvatarRemovesItsImages() throws Exception {
        JsonNode first = makeAvatar();
        long firstId = first.at("/active/id").asLong();
        String firstFrame = first.at("/active/frames/NORMAL~1HAPPY").asText();
        long secondId = makeAvatar().at("/active/id").asLong();

        call(delete("/api/v1/avatar/" + firstId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.avatars.length()").value(1))
            .andExpect(jsonPath("$.active.id").value(secondId));
        call(get(firstFrame)).andExpect(status().isNotFound());

        // deleting the active one falls back to the built-in art
        call(delete("/api/v1/avatar/" + secondId))
            .andExpect(jsonPath("$.active").value(nullValue()))
            .andExpect(jsonPath("$.avatars.length()").value(0));
        call(delete("/api/v1/avatar/" + secondId)).andExpect(status().isNotFound());
    }

    @Test
    void aDraftCanNotBeSelectedOrDeletedAsAnAvatar() throws Exception {
        long draftId = body(upload(JPEG)).at("/draft/id").asLong();
        call(put("/api/v1/avatar/active").contentType(MediaType.APPLICATION_JSON).content("{\"id\": " + draftId + "}"))
            .andExpect(status().isNotFound());
        call(delete("/api/v1/avatar/" + draftId)).andExpect(status().isNotFound());
    }

    @Test
    void theActiveAvatarStaysWhileANewOneIsReviewed() throws Exception {
        makeAvatar();
        upload(JPEG)
            .andExpect(jsonPath("$.active.frames", aMapWithSize(24)))
            .andExpect(jsonPath("$.draft.status").value("REVIEW"));
        call(delete("/api/v1/avatar/draft"))
            .andExpect(jsonPath("$.draft").value(nullValue()))
            .andExpect(jsonPath("$.active.frames", aMapWithSize(24)));
    }

    @Test
    void cancelDeletesTheDraft() throws Exception {
        JsonNode draft = body(upload(JPEG));
        call(delete("/api/v1/avatar/draft")).andExpect(jsonPath("$.draft").value(nullValue()));
        call(get(draft.at("/draft/masterUrl").asText())).andExpect(status().isNotFound());
        call(delete("/api/v1/avatar/draft")).andExpect(status().isNotFound());
    }

    @Test
    void approveNeedsADrawingInReview() throws Exception {
        call(post("/api/v1/avatar/draft/approve")).andExpect(status().isNotFound());
        makeAvatar();
        upload(JPEG);
        call(post("/api/v1/avatar/draft/approve"));
        call(post("/api/v1/avatar/draft/approve")).andExpect(status().isNotFound());
    }

    @Test
    void notAnImageIsAFieldError() throws Exception {
        upload("hello".getBytes())
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors[0].field").value("photo"));
        assertThat(images.calls).isEmpty();
    }

    @Test
    void withoutAnApiKeyUploadsAreRefused() throws Exception {
        images.configured = false;
        call(get("/api/v1/avatar")).andExpect(jsonPath("$.available").value(false));
        upload(JPEG)
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.detail").value(containsString("OPENAI_API_KEY")));
    }

    @Test
    void anotherUsersAvatarIsNotFound() throws Exception {
        String frame = makeAvatar().at("/active/frames/NORMAL~1NEUTRAL").asText();
        users.save(new User("other@test.local", "Other", ZoneId.of("Europe/Berlin"), 4, clock.instant()));

        call(get(frame), "other@test.local").andExpect(status().isNotFound());
        long mine = body(call(get("/api/v1/avatar"))).at("/active/id").asLong();
        call(delete("/api/v1/avatar/" + mine), "other@test.local").andExpect(status().isNotFound());
        call(get("/api/v1/avatar"), "other@test.local")
            .andExpect(jsonPath("$.active").value(nullValue()))
            .andExpect(jsonPath("$.avatars.length()").value(0))
            .andExpect(jsonPath("$.draft").value(nullValue()));
    }

    @Test
    void jobsInterruptedByARestartAreMarkedFailed() throws Exception {
        User me = users.findByEmail(IntegrationTest.USER).orElseThrow();
        Avatar stuck = avatars.save(new Avatar(me.getId(), 1, clock.instant()));

        generator.failInterruptedJobs();

        assertThat(avatars.findById(stuck.getId()).orElseThrow().getStatus()).isEqualTo(Avatar.Status.FAILED);
        call(get("/api/v1/avatar")).andExpect(jsonPath("$.draft.error").value(containsString("restarted")));
    }
}
