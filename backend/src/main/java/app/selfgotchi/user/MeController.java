package app.selfgotchi.user;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import app.selfgotchi.common.ValidationException;
import app.selfgotchi.state.TaskValidator.Violation;

/** Who is logged in and their time settings; the frontend uses it to render local times. */
@RestController
@RequestMapping("/api/v1/me")
public class MeController {

    static final int MAX_NAME_LENGTH = 60;

    public record MeResponse(String email, String displayName, String timezone, int dayResetHour) {
    }

    /** The settings screen's editable fields; all required. */
    public record UpdateMeRequest(String displayName, String timezone, Integer dayResetHour) {
    }

    private final CurrentUserService currentUser;
    private final UserRepository users;

    public MeController(CurrentUserService currentUser, UserRepository users) {
        this.currentUser = currentUser;
        this.users = users;
    }

    @GetMapping
    public MeResponse me() {
        return toResponse(currentUser.require());
    }

    /**
     * Changes take effect on the next state/history computation: those are derived from the log,
     * so a new zone or reset hour also re-buckets past completions into days.
     */
    @PutMapping
    public MeResponse update(@RequestBody UpdateMeRequest request) {
        List<Violation> violations = new ArrayList<>();
        String name = request.displayName() == null ? "" : request.displayName().strip();
        if (name.isEmpty()) {
            violations.add(new Violation("displayName", "must not be blank"));
        } else if (name.length() > MAX_NAME_LENGTH) {
            violations.add(new Violation("displayName", "must be at most " + MAX_NAME_LENGTH + " characters"));
        }
        // Region ids only ("Europe/Berlin"): fixed offsets like "+02:00" have no daylight-saving rules.
        String zone = request.timezone();
        if (zone == null || !ZoneId.getAvailableZoneIds().contains(zone)) {
            violations.add(new Violation("timezone", "must be a time zone like Europe/Berlin"));
        }
        Integer hour = request.dayResetHour();
        if (hour == null || hour < 0 || hour > 23) {
            violations.add(new Violation("dayResetHour", "must be between 0 and 23"));
        }
        if (!violations.isEmpty()) {
            throw new ValidationException(violations);
        }

        User user = currentUser.require();
        user.rename(name);
        user.updateSettings(ZoneId.of(zone), hour);
        return toResponse(users.save(user));
    }

    private static MeResponse toResponse(User user) {
        return new MeResponse(user.getEmail(), user.getDisplayName(), user.getZoneId().getId(), user.getDayResetHour());
    }
}
