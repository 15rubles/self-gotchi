package app.selfgotchi;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.time.Instant;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;

import app.selfgotchi.avatar.AvatarJobRunner;

/**
 * Full application against Testcontainers Postgres, with MockMvc and a {@link MutableClock}.
 * Each test runs in a rolled-back transaction. The configured user is {@value #USER},
 * in Europe/Berlin with the default 04:00 reset.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(properties = {
    "app.auth.username=" + IntegrationTest.USER,
    "app.auth.password=test",
    "app.user.timezone=Europe/Berlin",
    "app.seed.enabled=false",
    "app.avatar.storage-dir=${java.io.tmpdir}/selfgotchi-test-avatars/${random.uuid}"
})
@AutoConfigureMockMvc
@Import({TestcontainersConfig.class, IntegrationTest.ClockConfig.class})
@Transactional
public @interface IntegrationTest {

    String USER = "me@test.local";

    @TestConfiguration(proxyBeanMethods = false)
    class ClockConfig {
        @Bean
        @Primary
        MutableClock testClock() {
            return new MutableClock(Instant.parse("2026-09-01T08:00:00Z"));
        }

        /** No real image calls in tests. */
        @Bean
        @Primary
        FakeImageProvider fakeImages() {
            return new FakeImageProvider();
        }

        /** Avatar jobs run inline, inside the test's transaction, so a request returns with the drawing done. */
        @Bean
        @Primary
        AvatarJobRunner inlineAvatarJobs() {
            return new AvatarJobRunner() {
                @Override
                public void submit(Runnable job) {
                    job.run();
                }
            };
        }
    }
}
