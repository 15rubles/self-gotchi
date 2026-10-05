package app.selfgotchi.avatar;

import java.util.List;

/**
 * Port to whichever AI image provider wins the Phase 0 spike (DESIGN.md, "Provider").
 * Phase 1 has no implementation; the character renders placeholder art from a local manifest.
 */
public interface ImageGenerationProvider {

    /** Image bytes plus their media type, e.g. {@code image/png}. */
    record Image(byte[] data, String mediaType) {
    }

    /** Master candidates from the user's photo, using the locked style prompt. */
    List<Image> generateFromPhoto(Image photo, String stylePrompt, int candidates);

    /** A new variant (e.g. a pose) generated from the approved master as the reference. */
    Image generateWithReference(Image reference, String prompt);

    /** Edits only the masked region (e.g. the face) of the source image. */
    Image inpaint(Image source, Image mask, String prompt);

    Image removeBackground(Image source);
}
