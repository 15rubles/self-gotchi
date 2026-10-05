package app.selfgotchi.user;

import java.time.Instant;
import java.time.ZoneId;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(nullable = false)
    private String timezone;

    @Column(name = "day_reset_hour", nullable = false)
    private short dayResetHour;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected User() {
    }

    public User(String email, String displayName, ZoneId timezone, int dayResetHour, Instant createdAt) {
        this.email = email;
        this.displayName = displayName;
        this.timezone = timezone.getId();
        this.dayResetHour = (short) dayResetHour;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getDisplayName() {
        return displayName;
    }

    public ZoneId getZoneId() {
        return ZoneId.of(timezone);
    }

    public int getDayResetHour() {
        return dayResetHour;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
