package app.selfgotchi.task;

import java.time.Instant;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import app.selfgotchi.state.model.Category;
import app.selfgotchi.state.model.EffectKey;
import app.selfgotchi.state.model.TaskType;

/**
 * A habit definition. The schedule is kept as raw JSON here and decoded by
 * {@link ScheduleCodec}; {@code type} mirrors {@code schedule.type} for querying.
 */
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TaskType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "effect_key", nullable = false)
    private EffectKey effectKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String schedule;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "archived_at")
    private Instant archivedAt;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** The calendar event (iCalendar UID) this habit was imported from, or null. */
    @Column(name = "import_uid", updatable = false)
    private String importUid;

    protected Task() {
    }

    public Task(Long userId, Instant createdAt) {
        this.userId = userId;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    public void update(String name, Category category, TaskType type, EffectKey effectKey, String scheduleJson,
                       int sortOrder, Instant now) {
        this.name = name;
        this.category = category;
        this.type = type;
        this.effectKey = effectKey;
        this.schedule = scheduleJson;
        this.sortOrder = sortOrder;
        this.updatedAt = now;
    }

    public void setImportUid(String importUid) {
        this.importUid = importUid;
    }

    public String getImportUid() {
        return importUid;
    }

    public void archive(Instant now) {
        this.active = false;
        this.archivedAt = now;
        this.updatedAt = now;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public Category getCategory() {
        return category;
    }

    public TaskType getType() {
        return type;
    }

    public EffectKey getEffectKey() {
        return effectKey;
    }

    public String getSchedule() {
        return schedule;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getArchivedAt() {
        return archivedAt;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
