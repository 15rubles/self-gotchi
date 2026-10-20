package app.selfgotchi.avatar;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import app.selfgotchi.avatar.AvatarStyle.Anchor;
import app.selfgotchi.avatar.ImageGenerationProvider.Image;
import app.selfgotchi.common.ConflictException;
import app.selfgotchi.common.NotFoundException;
import app.selfgotchi.common.UnavailableException;
import app.selfgotchi.common.ValidationException;
import app.selfgotchi.user.User;

/**
 * Avatar from a photo, in two paid steps so a bad likeness costs one image, not 28:
 * upload -> master drawn -> REVIEW -> approve -> every other frame drawn -> ACTIVE (replaces the
 * previous avatar, deletes the photo). Retry redraws the master, or resumes failed frames.
 */
@Service
public class AvatarService {

    static final int MAX_PHOTO_BYTES = 10 * 1024 * 1024;

    /** The active avatar (or null) and the one being made (or null). */
    public record AvatarResponse(boolean available, ActiveAvatar active, Draft draft) {
    }

    /** URLs of every frame by {@code "POSE/FACE"}, blinks by pose, head anchors by pose. */
    public record ActiveAvatar(long id, String style, int styleVersion, Map<String, Anchor> poseAnchors,
                               Map<String, String> frames, Map<String, String> blinks) {
    }

    public record Draft(long id, Avatar.Status status, Avatar.Step step, int done, int total, String error,
                        String masterUrl) {
    }

    private final AvatarRepository avatars;
    private final AvatarStorage storage;
    private final AvatarGenerator generator;
    private final AvatarJobRunner jobs;
    private final ImageGenerationProvider images;
    private final Clock clock;

    public AvatarService(AvatarRepository avatars, AvatarStorage storage, AvatarGenerator generator,
                         AvatarJobRunner jobs, ImageGenerationProvider images, Clock clock) {
        this.avatars = avatars;
        this.storage = storage;
        this.generator = generator;
        this.jobs = jobs;
        this.images = images;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AvatarResponse view(User user) {
        Optional<Avatar> active = avatars.findByUserIdAndStatus(user.getId(), Avatar.Status.ACTIVE);
        Optional<Avatar> draft = draft(user);
        return new AvatarResponse(images.isConfigured(), active.map(this::toActive).orElse(null),
            draft.map(this::toDraft).orElse(null));
    }

    /** Replaces any draft that isn't drawing right now, then draws the master from the photo. */
    @Transactional
    public AvatarResponse upload(User user, byte[] photo) {
        if (!images.isConfigured()) {
            throw new UnavailableException("Drawing avatars isn't set up: start the server with OPENAI_API_KEY set.");
        }
        if (photo.length == 0) {
            throw new ValidationException("photo", "is empty");
        }
        if (photo.length > MAX_PHOTO_BYTES) {
            throw new ValidationException("photo", "is larger than 10 MB");
        }
        String type = AvatarStorage.sniff(photo);
        if (type == null) {
            throw new ValidationException("photo", "must be a JPEG, PNG or WebP image");
        }
        draft(user).ifPresent(old -> {
            requireIdle(old);
            remove(old);
        });
        avatars.flush(); // the old draft must be gone before the unique "one draft" index sees the new one

        Avatar avatar = avatars.save(new Avatar(user.getId(), AvatarStyle.VERSION, clock.instant()));
        storage.deleteAll(avatar); // leftovers from a database that was reset (ids start over)
        storage.write(avatar, AvatarStyle.PHOTO, new Image(photo, type));
        long avatarId = avatar.getId();
        jobs.submit(() -> generator.drawMaster(user.getId(), avatarId));
        return view(user);
    }

    /** The master looks right: draw the rest. */
    @Transactional
    public AvatarResponse approve(User user) {
        Avatar draft = requireDraft(user);
        if (draft.getStatus() != Avatar.Status.REVIEW) {
            throw new ConflictException("There's no drawing waiting for review.");
        }
        startFrames(user, draft);
        return view(user);
    }

    /** Redraw the master (in review, or after it failed), or resume frames that failed. */
    @Transactional
    public AvatarResponse retry(User user) {
        Avatar draft = requireDraft(user);
        requireIdle(draft);
        if (draft.getStep() == Avatar.Step.MASTER) {
            if (!storage.exists(draft, AvatarStyle.PHOTO)) {
                throw new ConflictException("The photo is gone. Upload it again.");
            }
            storage.delete(draft, AvatarStyle.MASTER.name());
            draft.start(Avatar.Step.MASTER, 0, 1, clock.instant());
            long avatarId = draft.getId();
            jobs.submit(() -> generator.drawMaster(user.getId(), avatarId));
        } else {
            startFrames(user, draft);
        }
        return view(user);
    }

    /** Cancel: deletes the draft and its images, even mid-drawing (the job stops before its next frame). */
    @Transactional
    public AvatarResponse discard(User user) {
        remove(requireDraft(user));
        return view(user);
    }

    /** One stored frame of the user's own avatar; the photo itself is never served. */
    @Transactional(readOnly = true)
    public Image file(User user, long avatarId, String name) {
        Avatar avatar = avatars.findByIdAndUserId(avatarId, user.getId())
            .orElseThrow(() -> new NotFoundException("Avatar " + avatarId + " not found"));
        if (!AvatarStorage.isValidName(name) || name.equals(AvatarStyle.PHOTO)) {
            throw new NotFoundException("Avatar image not found");
        }
        return storage.read(avatar, name).orElseThrow(() -> new NotFoundException("Avatar image not found"));
    }

    private void startFrames(User user, Avatar draft) {
        int total = AvatarStyle.FRAMES.size();
        draft.start(Avatar.Step.FRAMES, 0, total, clock.instant());
        long avatarId = draft.getId();
        jobs.submit(() -> generator.drawFrames(user.getId(), avatarId));
    }

    private Optional<Avatar> draft(User user) {
        return avatars.findFirstByUserIdAndStatusNot(user.getId(), Avatar.Status.ACTIVE);
    }

    private Avatar requireDraft(User user) {
        return draft(user).orElseThrow(() -> new NotFoundException("No avatar is being made"));
    }

    private static void requireIdle(Avatar draft) {
        if (draft.getStatus() == Avatar.Status.GENERATING) {
            throw new ConflictException("Your character is still being drawn. Wait for it, or cancel it first.");
        }
    }

    private void remove(Avatar draft) {
        avatars.delete(draft);
        storage.deleteAll(draft);
    }

    private ActiveAvatar toActive(Avatar avatar) {
        Map<String, String> frames = new LinkedHashMap<>();
        Map<String, String> blinks = new LinkedHashMap<>();
        for (String pose : AvatarStyle.POSES) {
            for (String face : AvatarStyle.FACES) {
                url(avatar, AvatarStyle.frameName(pose, face)).ifPresent(url -> frames.put(pose + "/" + face, url));
            }
            url(avatar, AvatarStyle.blinkName(pose)).ifPresent(url -> blinks.put(pose, url));
        }
        return new ActiveAvatar(avatar.getId(), AvatarStyle.NAME, avatar.getStyleVersion(), AvatarStyle.ANCHORS,
            frames, blinks);
    }

    private Draft toDraft(Avatar avatar) {
        String master = avatar.getStatus() == Avatar.Status.GENERATING && avatar.getStep() == Avatar.Step.MASTER
            ? null
            : url(avatar, AvatarStyle.MASTER.name()).orElse(null);
        return new Draft(avatar.getId(), avatar.getStatus(), avatar.getStep(), avatar.getProgressDone(),
            avatar.getProgressTotal(), avatar.getError(), master);
    }

    /**
     * {@code /api/v1/avatar/{id}/files/{NAME}?v=...}: the version changes whenever the avatar does
     * (a redrawn master), so browsers may cache each URL for good.
     */
    private Optional<String> url(Avatar avatar, String name) {
        return storage.exists(avatar, name)
            ? Optional.of("/api/v1/avatar/" + avatar.getId() + "/files/" + name + "?v=" + avatar.getUpdatedAt().toEpochMilli())
            : Optional.empty();
    }
}
