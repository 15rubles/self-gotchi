# Local avatar (not committed)

Everything in this folder except this README is gitignored, so your photos stay on your machine.

## 1. Your photo

Put a clear, front-facing photo here as `photo.jpg` (or .jpeg/.png/.webp).

## 2. Generate realistic variants (sends the photo to Google Gemini)

```powershell
$env:GEMINI_API_KEY = "<key from https://aistudio.google.com/apikey>"
npm run avatar:generate                        # 24 images: 4 poses x 6 expressions, skips existing ones
npm run avatar:generate -- --only TIRED/WORRIED   # redo one image you don't like
npm run avatar:generate -- --force             # redo everything
npm run avatar:generate -- --dry-run           # no API calls (copies the photo), to test the wiring
```

Optional: `$env:GEMINI_IMAGE_MODEL = "gemini-3-pro-image"` for the higher-quality (slower, pricier) model;
the default is `gemini-3.1-flash-image`.

Output goes to `generated/`: `<POSE>_<FACE>.jpg` plus `avatar.json`. Check them at
http://localhost:5173/gallery. If the breath haze, "grrr" or thought bubble sit in the wrong place,
open `/gallery?anchors` and adjust `poseAnchors` in `generated/avatar.json` (canvas is 1024x1024;
`x`,`y` = middle of the face, `scale` 1 ≈ a 440px-wide face).

## What the app uses

1. `generated/` frames if present (one realistic image per pose + expression),
2. otherwise `photo.jpg` with overlays,
3. otherwise the illustrated placeholders.
