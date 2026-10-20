package app.selfgotchi.avatar;

import java.io.IOException;
import java.time.Duration;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import app.selfgotchi.avatar.AvatarService.AvatarResponse;
import app.selfgotchi.avatar.ImageGenerationProvider.Image;
import app.selfgotchi.user.CurrentUserService;

/**
 * Settings -> Character: upload a photo, review the master drawing, approve to draw the rest.
 * Drawing runs in the background; the app polls {@code GET /avatar} for progress.
 */
@RestController
@RequestMapping("/api/v1/avatar")
public class AvatarController {

    private final AvatarService avatars;
    private final CurrentUserService currentUser;

    public AvatarController(AvatarService avatars, CurrentUserService currentUser) {
        this.avatars = avatars;
        this.currentUser = currentUser;
    }

    @GetMapping
    public AvatarResponse get() {
        return avatars.view(currentUser.require());
    }

    /** Sends the photo to the image model (OpenAI) and starts drawing the master. 202: it's still drawing. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AvatarResponse upload(@RequestParam("photo") MultipartFile photo) throws IOException {
        return avatars.upload(currentUser.require(), photo.getBytes());
    }

    @PostMapping("/draft/approve")
    public AvatarResponse approve() {
        return avatars.approve(currentUser.require());
    }

    @PostMapping("/draft/retry")
    public AvatarResponse retry() {
        return avatars.retry(currentUser.require());
    }

    @DeleteMapping("/draft")
    public AvatarResponse discard() {
        return avatars.discard(currentUser.require());
    }

    /** A frame; its URL carries a version, so it can be cached for good (privately: it's the user's face). */
    @GetMapping("/{id}/files/{name}")
    public ResponseEntity<byte[]> file(@PathVariable long id, @PathVariable String name) {
        Image image = avatars.file(currentUser.require(), id, name);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(image.mediaType()))
            .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePrivate().immutable())
            .body(image.data());
    }
}
