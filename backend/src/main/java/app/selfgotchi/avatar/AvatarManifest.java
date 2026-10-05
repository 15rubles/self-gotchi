package app.selfgotchi.avatar;

import java.util.Map;

/**
 * Asset URLs for the renderer, in the shape from DESIGN.md ("Asset manifest").
 * Served by {@code GET /avatar/manifest} in Phase 2; Phase 1 uses a frontend placeholder
 * manifest with the same shape.
 */
public record AvatarManifest(
    String avatarId,
    int styleVersion,
    HeadAnchor headAnchor,
    Map<String, String> poses,
    Map<String, String> faces) {

    public record HeadAnchor(int x, int y, double scale) {
    }
}
