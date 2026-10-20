package app.selfgotchi.avatar;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import app.selfgotchi.avatar.AvatarStyle.Frame;
import app.selfgotchi.avatar.ImageGenerationProvider.Image;

/**
 * The background jobs: draw the master, then every other frame. Image calls run outside any
 * transaction; each progress update is its own short one. A draft deleted mid-job (Cancel) stops
 * the job before its next frame.
 */
@Component
public class AvatarGenerator {

    private static final Logger log = LoggerFactory.getLogger(AvatarGenerator.class);

    private final AvatarRepository avatars;
    private final AvatarStorage storage;
    private final ImageGenerationProvider images;
    private final TransactionTemplate tx;
    private final Clock clock;

    public AvatarGenerator(AvatarRepository avatars, AvatarStorage storage, ImageGenerationProvider images,
                           TransactionTemplate tx, Clock clock) {
        this.avatars = avatars;
        this.storage = storage;
        this.images = images;
        this.tx = tx;
        this.clock = clock;
    }

    /** Photo -> master, then the draft waits for the user's review. */
    public void drawMaster(long userId, long avatarId) {
        run(userId, avatarId, avatar -> {
            draw(avatar, AvatarStyle.MASTER);
            update(userId, avatarId, a -> {
                a.progress(1, clock.instant());
                a.finish(Avatar.Status.REVIEW, clock.instant());
            });
        });
    }

    /** Every frame after the master that doesn't exist yet (so a retry resumes), then activate. */
    public void drawFrames(long userId, long avatarId) {
        run(userId, avatarId, avatar -> {
            int done = 0;
            for (Frame frame : AvatarStyle.FRAMES) {
                if (!storage.exists(avatar, frame.name())) {
                    draw(avatar, frame);
                }
                int progress = ++done;
                if (!update(userId, avatarId, a -> a.progress(progress, clock.instant()))) {
                    return;
                }
            }
            activate(userId, avatarId);
        });
    }

    /** Jobs don't survive a restart; let the user retry instead of waiting forever. */
    @EventListener(ApplicationReadyEvent.class)
    public void failInterruptedJobs() {
        tx.executeWithoutResult(status -> avatars.findByStatus(Avatar.Status.GENERATING)
            .forEach(a -> a.fail("Stopped when the server restarted. Try again.", clock.instant())));
    }

    private void run(long userId, long avatarId, Consumer<Avatar> job) {
        Optional<Avatar> avatar = load(userId, avatarId);
        if (avatar.isEmpty()) {
            return;
        }
        try {
            job.accept(avatar.get());
        } catch (RuntimeException e) {
            log.warn("Avatar {} failed: {}", avatarId, e.getMessage());
            String message = e instanceof ImageGenerationException ? e.getMessage() : "Something went wrong while drawing.";
            update(userId, avatarId, a -> a.fail(message, clock.instant()));
        }
    }

    private void draw(Avatar avatar, Frame frame) {
        List<Image> references = new ArrayList<>();
        for (String name : frame.references()) {
            references.add(storage.read(avatar, name)
                .orElseThrow(() -> new ImageGenerationException("The image " + name + " is missing. Start again with a new photo.")));
        }
        Image image = images.edit(frame.prompt(), references);
        storage.write(avatar, frame.name(), image);
        if (load(avatar.getUserId(), avatar.getId()).isEmpty()) {
            storage.deleteAll(avatar); // cancelled while this frame was being drawn
        }
    }

    /** The finished draft becomes the active avatar (the previous one stays, to switch back); the photo goes. */
    private void activate(long userId, long avatarId) {
        tx.executeWithoutResult(status -> avatars.findByIdAndUserId(avatarId, userId).ifPresent(draft -> {
            draft.finish(Avatar.Status.READY, clock.instant());
            storage.delete(draft, AvatarStyle.PHOTO);
            select(avatars, userId, draft, clock.instant());
        }));
    }

    /**
     * Makes {@code chosen} the active avatar, or none (the built-in art) when null. Call inside a
     * transaction.
     */
    static void select(AvatarRepository avatars, long userId, Avatar chosen, Instant now) {
        avatars.findByUserIdAndStatus(userId, Avatar.Status.ACTIVE).ifPresent(old -> old.finish(Avatar.Status.READY, now));
        avatars.flush(); // the old one must leave ACTIVE before the unique "one active" index sees the new one
        if (chosen != null) {
            chosen.finish(Avatar.Status.ACTIVE, now);
        }
    }

    private Optional<Avatar> load(long userId, long avatarId) {
        return tx.execute(status -> avatars.findByIdAndUserId(avatarId, userId));
    }

    /** False when the draft is gone (cancelled). */
    private boolean update(long userId, long avatarId, Consumer<Avatar> change) {
        Boolean found = tx.execute(status -> avatars.findByIdAndUserId(avatarId, userId).map(a -> {
            change.accept(a);
            return true;
        }).orElse(false));
        return Boolean.TRUE.equals(found);
    }
}
