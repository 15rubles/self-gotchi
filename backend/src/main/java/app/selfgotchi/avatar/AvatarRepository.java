package app.selfgotchi.avatar;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;

/** Every query is scoped by userId, except the startup sweep of interrupted jobs. */
public interface AvatarRepository extends JpaRepository<Avatar, Long> {

    Optional<Avatar> findByIdAndUserId(Long id, Long userId);

    Optional<Avatar> findByUserIdAndStatus(Long userId, Avatar.Status status);

    /** The avatar being made, with {@link Avatar.Status#DRAFT} (at most one per user, see V6). */
    Optional<Avatar> findFirstByUserIdAndStatusIn(Long userId, Set<Avatar.Status> statuses);

    /** Finished avatars, newest first. */
    List<Avatar> findByUserIdAndStatusInOrderByCreatedAtDescIdDesc(Long userId, Set<Avatar.Status> statuses);

    /** Jobs that were running when the server stopped. */
    List<Avatar> findByStatus(Avatar.Status status);
}
