package app.selfgotchi.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * When Spring serves the built frontend (one deployable, DESIGN.md "Deployment"), deep links
 * like /tasks/3 must return the app shell; the React router takes it from there.
 */
@Controller
public class SpaController {

    @GetMapping({"/tasks", "/tasks/new", "/tasks/{id:\\d+}", "/history", "/settings", "/gallery"})
    public String app() {
        return "forward:/index.html";
    }
}
