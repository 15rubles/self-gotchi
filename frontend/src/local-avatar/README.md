# Local avatar (not committed)

Everything in this folder except this README is gitignored, so your photos stay on your machine.

## 1. Your photo

Put a clear, front-facing photo here as `photo.jpg` (or .jpeg/.png/.webp).

## 2. Generate your character (sends the photo to OpenAI)

Default: a chibi of you on a transparent background, drawn over the app's illustrated room and
effects, made with OpenAI's image API.

```powershell
[Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'sk-...', 'User')   # once, then open a new terminal
npm run avatar:generate -- --only NORMAL/NEUTRAL   # the master first: check it looks like you
npm run avatar:generate                        # the rest: 4 poses x 6 expressions, skips existing ones
npm run avatar:generate -- --only TIRED/WORRIED   # redo one image you don't like
npm run avatar:generate -- --force             # redo everything
npm run avatar:generate -- --dry-run           # no API calls (copies the photo), to test the wiring
```

Every other frame is edited from the master, so if the master doesn't look like you, redo it
(`--only NORMAL/NEUTRAL` again) before generating the rest.

Options (environment variables): `OPENAI_IMAGE_MODEL` (default `gpt-image-2.5-flare`),
`OPENAI_IMAGE_QUALITY` (`low`, `medium` (default), `high`).

Other styles and providers:

- `--style photo`: photorealistic frames in a generated living room instead of the chibi.
- `--provider gemini` with `GEMINI_API_KEY`: Google Gemini (`GEMINI_IMAGE_MODEL`, default
  `gemini-3.1-flash-image`). Needs a billed project; the free tier allows no image generation.

Output goes to `generated/`: `<POSE>_<FACE>.webp` plus `avatar.json`. Check them
at http://localhost:5173/gallery. If the smell, "grrr" or thought bubble sit in the wrong place,
open `/gallery?anchors` and adjust `poseAnchors` in `generated/avatar.json` (canvas is 1024x1024;
`x`,`y` = middle of the face, `scale` 1 ≈ a 440px-wide face).

## What the app uses

1. `generated/` frames if present (one image per pose + expression),
2. otherwise the illustrated placeholders.

`photo.jpg` with overlays is only a dev preview (`/gallery?art=photo`).
