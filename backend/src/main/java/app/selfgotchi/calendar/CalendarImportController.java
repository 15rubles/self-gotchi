package app.selfgotchi.calendar;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import app.selfgotchi.common.ValidationException;
import app.selfgotchi.state.LogicalDay;
import app.selfgotchi.task.TaskService;
import app.selfgotchi.user.CurrentUserService;
import app.selfgotchi.user.User;

/**
 * Calendar import, step 1: read an .ics file or link and propose habits. Nothing is saved here;
 * the review screen creates the chosen habits through {@code POST /tasks} with their
 * {@code importUid}.
 */
@RestController
@RequestMapping("/api/v1/import")
public class CalendarImportController {

    public record UrlRequest(String url) {
    }

    public record PreviewResponse(List<ImportCandidate> events, int skippedPast, int skippedCancelled,
                                  int skippedEnded) {
    }

    private final IcsFetcher fetcher;
    private final TaskService tasks;
    private final CurrentUserService currentUser;
    private final Clock clock;

    public CalendarImportController(IcsFetcher fetcher, TaskService tasks, CurrentUserService currentUser, Clock clock) {
        this.fetcher = fetcher;
        this.tasks = tasks;
        this.currentUser = currentUser;
        this.clock = clock;
    }

    /** An exported .ics file (Google Takeout, Outlook "Save calendar", Apple Calendar "Export"). */
    @PostMapping(value = "/ics", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PreviewResponse previewFile(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new ValidationException("file", "is empty");
        }
        if (file.getSize() > IcsFetcher.MAX_BYTES) {
            throw new ValidationException("file", "is larger than 5 MB");
        }
        return preview(new String(file.getBytes(), StandardCharsets.UTF_8));
    }

    /** A shared / published calendar link (https:// or webcal://). */
    @PostMapping("/ics-url")
    public PreviewResponse previewUrl(@RequestBody UrlRequest request) {
        return preview(fetcher.fetch(request.url()));
    }

    private PreviewResponse preview(String ics) {
        User user = currentUser.require();
        LocalDate today = new LogicalDay(user.getZoneId(), user.getDayResetHour()).dateOf(clock.instant());
        IcsImporter.Result result = new IcsImporter(user.getZoneId(), today, tasks.importedUids(user)).parse(ics);
        return new PreviewResponse(result.events(), result.skippedPast(), result.skippedCancelled(), result.skippedEnded());
    }
}
