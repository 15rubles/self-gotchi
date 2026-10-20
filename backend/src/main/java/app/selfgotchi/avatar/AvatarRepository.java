package app.selfgotchi.avatar;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/** Every query is scoped by userId, except the startup sweep of interrupted jobs. */
public interface AvatarRepository extends JpaRepository<Avatar, Long> {

    Optional<Avatar> findByIdAndUserId(Long id, Long userId);

    Optional<Avatar> findByUserIdAndStatus(Long userId, Avatar.Status status);

    /** The avatar being made (at most one per user, see V5). */
    Optional<Avatar> findFirstByUserIdAndStatusNot(Long userId, Avatar.Status status);

    /** Jobs that were running when the server stopped. */
    List<Avatar> findByStatus(Avatar.Status status);
}
