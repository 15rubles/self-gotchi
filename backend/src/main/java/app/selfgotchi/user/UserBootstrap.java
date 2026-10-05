package app.selfgotchi.user;

import java.time.Clock;
import java.time.ZoneId;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import app.selfgotchi.state.EngineConfig;

/**
 * Creates the users row for the configured login on startup, and applies an explicitly
 * configured time zone / reset hour to it. The login name is the user's email.
 */
@Component
@Order(0)
public class UserBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(UserBootstrap.class);

    private final UserRepository users;
    private final AuthProperties auth;
    private final UserProperties props;
    private final Clock clock;

    public UserBootstrap(UserRepository users, AuthProperties auth, UserProperties props, Clock clock) {
        this.users = users;
        this.auth = auth;
        this.props = props;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureUser();
    }

    public User ensureUser() {
        boolean zoneConfigured = props.timezone() != null && !props.timezone().isBlank();
        ZoneId zone = zoneConfigured ? ZoneId.of(props.timezone()) : ZoneId.systemDefault();
        int resetHour = props.dayResetHour() == null ? EngineConfig.DEFAULT_RESET_HOUR : props.dayResetHour();

        return users.findByEmail(auth.username())
            .map(user -> {
                user.updateSettings(zoneConfigured ? zone : user.getZoneId(),
                    props.dayResetHour() == null ? user.getDayResetHour() : resetHour);
                return user;
            })
            .orElseGet(() -> {
                log.info("Creating user {} (time zone {}, day resets at {}:00)", auth.username(), zone, resetHour);
                return users.save(new User(auth.username(), props.displayName(), zone, resetHour, clock.instant()));
            });
    }
}
