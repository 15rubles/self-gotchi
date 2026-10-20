package app.selfgotchi.avatar;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A character drawn from the user's photo. While it's being made it's the user's draft
 * (GENERATING / REVIEW / FAILED); once every frame exists it becomes the ACTIVE avatar and
 * replaces the previous one. The images themselves are files in {@link AvatarStorage}.
 */
@Entity
@Table(name = "avatars")
public class Avatar {

    public enum Status { GENERATING, REVIEW, ACTIVE, FAILED }

    /** MASTER: the one image you approve first. FRAMES: every other pose, face and blink, drawn from it. */
    public enum Step { MASTER, FRAMES }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Step step;

    @Column(name = "style_version", nullable = false)
    private int styleVersion;

    @Column(name = "progress_done", nullable = false)
    private int progressDone;

    @Column(name = "progress_total", nullable = false)
    private int progressTotal;

    private String error;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected Avatar() {
    }

    /** A new draft, about to draw its master image. */
    public Avatar(Long userId, int styleVersion, Instant now) {
        this.userId = userId;
        this.styleVersion = styleVersion;
        this.createdAt = now;
        start(Step.MASTER, 0, 1, now);
    }

    void start(Step step, int done, int total, Instant now) {
        this.status = Status.GENERATING;
        this.step = step;
        this.progressDone = done;
        this.progressTotal = total;
        this.error = null;
        this.updatedAt = now;
    }

    void progress(int done, Instant now) {
        this.progressDone = done;
        this.updatedAt = now;
    }

    void finish(Status status, Instant now) {
        this.status = status;
        this.updatedAt = now;
    }

    void fail(String error, Instant now) {
        this.status = Status.FAILED;
        this.error = error;
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Status getStatus() {
        return status;
    }

    public Step getStep() {
        return step;
    }

    public int getStyleVersion() {
        return styleVersion;
    }

    public int getProgressDone() {
        return progressDone;
    }

    public int getProgressTotal() {
        return progressTotal;
    }

    public String getError() {
        return error;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
