package app.selfgotchi.notify;

/**
 * Port for Web Push delivery (DESIGN.md, "Notifications"). Phase 1 has no implementation
 * and no scheduler; the minute tick and dedup log arrive with Web Push.
 */
public interface NotificationSender {

    enum Kind {
        DUE_SOON,
        MISSED
    }

    /**
     * @param actionTaskId task the "Done" action button completes, or {@code null} for no button
     */
    record Notification(long userId, Kind kind, String title, String body, String imageUrl, Long actionTaskId) {
    }

    void send(Notification notification);
}
