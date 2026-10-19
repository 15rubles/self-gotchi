package app.selfgotchi.task;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Every query is scoped by userId. */
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByUserIdAndActiveTrueOrderBySortOrderAscIdAsc(Long userId);

    List<Task> findByUserIdOrderBySortOrderAscIdAsc(Long userId);

    Optional<Task> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    boolean existsByUserIdAndImportUid(Long userId, String importUid);

    List<Task> findByUserIdAndImportUidIsNotNull(Long userId);
}
