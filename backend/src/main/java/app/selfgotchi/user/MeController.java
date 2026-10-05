package app.selfgotchi.user;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Who is logged in and their time settings; the frontend uses it to render local times. */
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    public record MeResponse(String email, String displayName, String timezone, int dayResetHour) {
    }

    private final CurrentUserService currentUser;

    public MeController(CurrentUserService currentUser) {
        this.currentUser = currentUser;
    }

    @GetMapping
    public MeResponse me() {
        User user = currentUser.require();
        return new MeResponse(user.getEmail(), user.getDisplayName(), user.getZoneId().getId(),
            user.getDayResetHour());
    }
}
