package app.selfgotchi.notify;

import java.util.List;

/** Port for the {@code push_subscriptions} table. No implementation in Phase 1. */
public interface PushSubscriptionStore {

    record PushSubscription(long userId, String endpoint, String p256dh, String auth) {
    }

    void save(PushSubscription subscription);

    List<PushSubscription> findByUser(long userId);
}
