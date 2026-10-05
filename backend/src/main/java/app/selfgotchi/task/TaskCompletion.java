package app.selfgotchi.task;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** One entry in the append-only completion log. Undo deletes the row. */
@Entity
@Table(name = "task_completions")
public class TaskCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "task_id", nullable = false, updatable = false)
    private Long taskId;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "completed_at", nullable = false, updatable = false)
    private Instant completedAt;

    /** Informational: the slot the engine assigned at insert time. The engine recomputes it. */
    @Column(name = "slot_index")
    private Short slotIndex;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private CompletionSource source;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TaskCompletion() {
    }

    public TaskCompletion(Long taskId, Long userId, Instant completedAt, CompletionSource source, Instant createdAt) {
        this.taskId = taskId;
        this.userId = userId;
        this.completedAt = completedAt;
        this.source = source;
        this.createdAt = createdAt;
    }

    public void setSlotIndex(Integer slotIndex) {
        this.slotIndex = slotIndex == null ? null : slotIndex.shortValue();
    }

    public Long getId() {
        return id;
    }

    public Long getTaskId() {
        return taskId;
    }

    public Long getUserId() {
        return userId;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public Integer getSlotIndex() {
        return slotIndex == null ? null : slotIndex.intValue();
    }

    public CompletionSource getSource() {
        return source;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
