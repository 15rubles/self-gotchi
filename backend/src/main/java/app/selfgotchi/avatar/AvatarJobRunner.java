package app.selfgotchi.avatar;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import jakarta.annotation.PreDestroy;

import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Runs avatar jobs one at a time in the background (drawing takes minutes). A job submitted inside
 * a transaction starts after it commits, so it sees the rows the request just saved.
 * Integration tests replace this with a runner that runs jobs inline.
 */
@Component
public class AvatarJobRunner {

    private final ExecutorService executor = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "avatar-jobs");
        thread.setDaemon(true);
        return thread;
    });

    public void submit(Runnable job) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    executor.submit(job);
                }
            });
        } else {
            executor.submit(job);
        }
    }

    @PreDestroy
    void stop() {
        executor.shutdownNow();
    }
}
