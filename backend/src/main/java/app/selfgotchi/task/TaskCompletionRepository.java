package app.selfgotchi.task;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Every query is scoped by userId. */
public interface TaskCompletionRepository extends JpaRepository<TaskCompletion, Long> {

    /** Completions in {@code [from, to]}, oldest first. */
    List<TaskCompletion> findByUserIdAndCompletedAtGreaterThanEqualAndCompletedAtLessThanEqualOrderByCompletedAtAsc(
        Long userId, Instant from, Instant to);

    Optional<TaskCompletion> findByIdAndUserId(Long id, Long userId);
}
