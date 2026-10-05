package app.selfgotchi.stateapi;

import java.time.Instant;
import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import app.selfgotchi.user.CurrentUserService;

@RestController
@RequestMapping("/api/v1")
public class StateController {

    private final StateService state;
    private final CurrentUserService currentUser;

    public StateController(StateService state, CurrentUserService currentUser) {
        this.state = state;
        this.currentUser = currentUser;
    }

    /** @param at optional ISO-8601 instant (e.g. 2026-10-05T20:00:00Z) to preview another moment */
    @GetMapping("/state")
    public StateResponse state(@RequestParam(required = false) Instant at) {
        return state.state(currentUser.require(), at);
    }

    /** @param from first logical day (default 12 weeks back); @param to last day (default today) */
    @GetMapping("/history")
    public HistoryResponse history(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return state.history(currentUser.require(), from, to);
    }
}
