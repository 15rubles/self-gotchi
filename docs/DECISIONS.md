# Decisions

Choices made where `DESIGN.md` is ambiguous or silent. Newest at the bottom of each section.

## Tooling
- Spring Boot **3.5.x** (the user fixed Boot 3; start.spring.io only offers 4.x now, so the POM is hand-written).
- Compiled with `--release 21`; builds on any JDK ≥ 21.
- Root package `app.selfgotchi`. The Spring-facing adapter for the engine lives in `stateapi`, because `state` must stay free of Spring.
- Frontend uses `react-router` for the three screens (home, tasks/editor, history).

## Defaults given for the doc's open questions
- A late completion fully clears the effect; history records the day as LATE.
- Tapping "cleaned" resets the freshness timer fully.
- Work out = weekly quota, 3 per week, weeks start Monday.

## Schema and schedules (milestone 2)
- IDs are `BIGINT GENERATED ALWAYS AS IDENTITY`, timestamps `TIMESTAMPTZ` mapped to `Instant` (Hibernate `jdbc.time_zone=UTC`).
- The later-phase tables (avatars, avatar_assets, generation_jobs, push_subscriptions, notification_log) are created in `V2` exactly as listed in DESIGN.md but nothing uses them yet.
- `tasks.archived_at` added next to `active` so history can show when a task was archived.
- The schedule records live in `state.model` (the engine consumes them). JSON mapping is a hand-written `ScheduleCodec` in `task`, so the engine model has no Jackson annotations and errors point at exact fields (`schedule.slots[1].by`).
- `schedule.type` is the single source of truth for the task type; the `tasks.type` column mirrors it.
- Schedule JSON is strict: unknown fields are rejected (catches typos like `dedline`). Times are `HH:mm`; weekdays are `MON`..`SUN`.
- Defaults: `recurrence` DAILY, `days` [] = every day, `dueSoonMinutes` 60 (per-task, max 720), `minGapMinutes` 0, `weekStarts` MON.
- CHECK supports only `recurrence: DAILY` + optional `days`; "every N days" is left for later (DESIGN.md: "Later").
- METER has two shapes, never mixed: explicit `slots[].by`, or `count` + `firstBy` (+ `lastBy` when count > 1). Max 12 slots. Slot times must be in order within the logical day (so `23:30` then `01:00` is valid with a 04:00 reset).
- METER with `count`: the deadlines between `firstBy` and `lastBy` are spaced evenly (eat x3 11:00–21:00 → 11:00, 16:00, 21:00). Validation rejects a `minGapMinutes` larger than that spacing.
- QUOTA: 1–7 times per week.
- FRESHNESS: exactly 3 strictly increasing thresholds (one per severity level), 1–365 days.
- `effectKey` must belong to the task's category: physical = MOUTH_SMELL, HUNGER, MOTIVATION, ROOM; mental = LUNCHBOX, BOOK, GENERIC.
- Integration tests are named `*IntegrationTest` so plain `./mvnw test` (Surefire) runs them; no Failsafe split.

## State Engine (milestone 3)
- API: `StateEngine(EngineConfig)` with `computeState(tasks, completionLogs, now, zoneId) -> CharacterState` (the doc's signature) and `evaluate(...)`, which also returns each task's status for the home screen. The reset hour goes in through `EngineConfig` so the signature stays as specified.
- Completions after `now` are ignored, so `/state?at=` in the past shows the past correctly.
- **Creation grace:** a deadline that fell before the task was created is never "missed" (a checkmark created after today's deadline is OFF today; meter slots before creation don't count). A task is OFF entirely before its creation time. The quota's creation week is a grace week (severity 0).
- **Checkmark:** DUE_SOON while `deadline - dueSoonMinutes <= now < deadline`; MISSED from the deadline on. "Missed 2+ days in a row" = today missed and the previous *scheduled* occurrence (skipping unscheduled weekdays, within 7 days, not before creation) also had no completion. Any completion within the logical day clears it, even after the deadline.
- **Meter:** counted completions (respecting `minGapMinutes` from the previous *counted* one) fill slots in order, so a late completion fills the earliest open slot. Extra completions beyond the slot count are ignored. Severity = deadlines passed minus slots filled, capped at 3. DUE_SOON uses a fixed 60 min before the next open slot.
- **Quota:** `expected = floor(timesPerWeek * fullDaysElapsed / 7)`, severity = `expected - done` clamped to 0..2; 3 when the sessions still needed exceed the days left including today (assumes at most one session per day). Every completion counts as a session, even two on one day. Status DUE_SOON when every remaining day is needed.
- **Freshness:** days = logical days between the last completion and today; never done counts from creation. `dueAt` = when the first threshold will be reached.
- **Layers:** MOUTH_SMELL severity → smell effect (severity 3 = cloud + flies, drawn by the frontend). HUNGER: belly growl at every severity ≥ 1 (not only 1), TIRED pose and face at 2, EXHAUSTED at 3. MOTIVATION: SLOUCH effect at 1, LAZY pose at 2–3, SWEATPANTS effect at 3. ROOM: room level = severity. Several tasks on one physical key take the max.
- **Mental:** each mental task with severity ≥ 1 gets its own icon (so "+2" overflow is meaningful); WORRIED face at 2, VERY_WORRIED at 3; severity 1 is icon only.
- **Face:** a mood exists only at severity ≥ 2. Highest wins; ties go to physical. Only HUNGER produces a physical mood (smell, laziness and the room show elsewhere).
- **Icons:** ordered by severity (desc), then sort order, then task id; first 3 shown, the rest is `iconOverflow`.
- **Streaks:** an active streak is ≥ 2 consecutive periods (`EngineConfig.streakMinLength`). Checkmark = scheduled days with any completion (late counts); meter = days with every slot filled; quota = weeks met; freshness has none. Today counts once done; until then the streak runs through yesterday.
- **`streakBonus`** is true only in the happy state (everything at severity 0 and an active streak), so the frontend can tie sparkles to the happy face.

## REST API (milestone 4)
- **Login name = the user's email** (`APP_USERNAME`, default `aleksei@selfgotchi.local`), so the security principal maps straight onto `users.email`; OAuth later yields an email too.
- `UserBootstrap` creates the users row on startup. `APP_USER_TIMEZONE` / `APP_DAY_RESET_HOUR` are applied to the row whenever set, which is the only way to change them until a settings screen exists. Unset time zone = the JVM default when the row is first created.
- CSRF stays on: the SPA reads the `XSRF-TOKEN` cookie and sends `X-XSRF-TOKEN` (Spring Security 6's documented SPA recipe; `csrf.spa()` only exists in Security 7). Unauthenticated `/api/**` calls get 401 instead of a login redirect.
- Extra endpoints beyond DESIGN.md's table: `GET /tasks/{id}` (editor) and `GET /me` (display name, time zone, reset hour for the frontend).
- `POST /tasks/{id}/complete` returns `{completion, state}` where `state` is the full `/state` payload (a superset of CharacterState), so the home screen updates from one response including the undo id. `DELETE /completions/{id}` returns the new state too.
- `completedAt` may be up to 1 minute in the future (clock skew) and not before the task was created. Stored times are truncated to microseconds (Postgres precision).
- Completing or editing an archived task is 409; archiving is idempotent. Other users' rows are 404.
- `slot_index` is left null: the engine recomputes slot assignment from the log every time, so a stored value could only go stale.
- `/state` loads the last 400 days of completions (bounds streak length on the home screen); `/history` loads the whole log for best streaks. Fine for one user; revisit for the product phase.
- `/history` defaults to the 12 weeks ending today, max 400 days per request, includes archived tasks (`active: false`), and reports per-day results `ON_TIME / LATE / PARTIAL / MISSED / PENDING / OFF / NONE`. Quota and freshness tasks only mark days with a completion (`ON_TIME`); their streaks are weekly / none.
- The `complete`/`undo` controller lives in `stateapi` (it composes the log with the engine), so `task` never depends on `stateapi`.

## Home screen and character (milestone 5)
- `CharacterStage` stacks the five layers as absolutely positioned elements on one 1024x1024 coordinate space, scaled to the container. Faces are drawn in a 440x440 box centered on `headAnchor` (scaled by `headAnchor.scale`).
- `placeholderManifest` has the exact DESIGN.md manifest shape; its URLs are `placeholder:pose/<POSE>` / `placeholder:face/<FACE>`. `AssetImage` renders the inline SVG for those and a plain `<img>` for anything else, so Phase 2 only swaps the manifest.
- Placeholder poses are headless bodies (the face asset is the whole head), so every pose keeps the neck at the same spot under the fixed head anchor.
- Mouth, belly and thought-bubble anchors are fixed offsets from `headAnchor` (the manifest format has no other anchors).
- Effects map: smell 1 wisps / 2 cloud / 3 dark cloud + flies; belly growl lines with a shake every 9 s; SLOUCH = CSS lean on the body; SWEATPANTS = grey CSS filter on the pose layer only (works on real images too); room level 3 also gets flies.
- Removed effects fade out over 0.7 s (`useFadeOut`); a completion plays a hop + sparkle burst. All motion stops under `prefers-reduced-motion`.
- Task groups: Due soon, Needs attention (MISSED), Later, Done, Not today; within a group by severity, then deadline. DONE checkmark/meter/freshness and OFF rows can't be tapped; quota rows always can (extra sessions are allowed).
- Undo is a 6 s toast after each completion.
- Times are shown in the user's time zone from `/state`, not the browser's.
- A dev-only `/gallery` route renders every placeholder layer and state without the backend (`?only=<text>` filters).
- Engine fix found via the UI: on the creation day, meter slots due before the task was created don't exist (target shrinks; all slots before creation → OFF that day).

## Photo avatar (user request after milestone 5)
- The user didn't like the illustrated placeholders and asked for a realistic look using their own photo. Image generation is out of scope (Phase 2, needs a provider), so the chosen option is **your photo + overlays**: the photo is the whole scene and states are realistic treatments on it. The expression itself can't change on a single photo.
- The photo stays local: `docs/*.jpg|png` and everything in `frontend/src/local-avatar/` except its README are gitignored. The app picks up `src/local-avatar/photo.{jpg,jpeg,png,webp}` at build time; without one it falls back to the illustrated placeholders (also on `/gallery?art=illustrated`).
- The manifest keeps the DESIGN.md shape (all poses point at the photo, faces at `overlay:face/<FACE>`) plus an optional `photo` extension: crop offset and facial landmarks in face units. Landmark pixels are set by hand in `photo/photoAvatar.ts`; the head anchor and scale are derived from them so the shared anchors (mouth, belly, thought bubble) land on the real face.
- Poses: TIRED / EXHAUSTED / LAZY = increasing slump and tilt plus a desaturating, darkening color grade (scaled up so the photo's edges never show). SWEATPANTS = grey tint on the photo.
- Faces: soft overlays at the real eye positions: blush and warmth (happy), cool tint and a sweat drop (worried), more of both and three drops (very worried), under-eye shadows (tired), stronger shadows and pallor (exhausted).
- Effects: blurred green haze beside the mouth instead of cartoon clouds; flies, room mess and thought icons use the OS emoji font, which looks much closer to a photo than line art. Room level 2–3 adds a grimy color cast, vignette and blotches on the photo itself.
- Breathing is a very slow zoom instead of the bob (bobbing a full photo looks like camera shake); the completion hop is a small lift + zoom.

## Generated realistic avatar (user request: "when I'm tired I actually look tired")
- The user rejected photo overlays and asked for generated images. Chosen: a **one-off local generator** (`npm run avatar:generate`, `frontend/scripts/generate-avatar.mjs`), photorealistic, Google Gemini as the default provider. The full in-app Phase 2 pipeline (upload, jobs, review, approval) is still not built.
- Gemini API: `POST /v1beta/interactions` with `x-goog-api-key`, default model `gemini-3.1-flash-image` (`GEMINI_IMAGE_MODEL` to switch, e.g. `gemini-3-pro-image`), `response_format` image/jpeg 1:1 1K. Image bytes are found anywhere in the response (`{type: "image", data}` or `inlineData`), since the nesting isn't pinned down in the docs. 429/5xx retried with backoff.
- **Full frames, not layers:** realistic faces can't be pasted onto bodies convincingly, so each pose + expression is its own image (4 x 6 = 24). Consistency follows DESIGN.md: photo -> master (normal/neutral) -> 3 poses edited from the master (with the photo as a second reference) -> each pose's face edited into 5 expressions with "change only the expression" prompts. One fixed living-room scene for all frames.
- The manifest keeps the DESIGN.md fields (poses = each pose's neutral frame, faces = the normal pose's frames) plus extensions `frames` (`"TIRED/WORRIED"` -> url) and `poseAnchors` (head position per pose, since a lying pose moves the head). Missing frames fall back to the same pose's neutral, then the normal pose.
- Anchors can't be known before generation; defaults are guesses and get tuned by looking at the frames (`/gallery?anchors`). They only place the haze, growl caption and thought bubble.
- In frames mode the generated room replaces the drawn one; mess, smell, flies and icons stay as realistic overlays (emoji, haze). The LAZY frames already wear grey sweatpants, so the grey tint isn't applied on top.
- Privacy: generation sends the photo to Google; nothing is sent until the user sets `GEMINI_API_KEY` and runs the command. Outputs live in the gitignored `src/local-avatar/generated/`. `--dry-run` tests the wiring without any API call.
- Generator is a Node script rather than a Java `ImageGenerationProvider` implementation: it's a one-off local task with no server state. The Java interface stays for the Phase 2 in-app pipeline.

## Back to illustrated art, exaggerated (user decision)
- Image generation needs a paid API tier (Gemini's free tier allows 0 image requests per day), so the user chose the illustrated chibi style for now, with **over-the-top emotions**: happy = squeezed eyes, huge grin, sparkles; worried = anxious eyes, steep brows, wobbly mouth, sliding sweat; very worried = bulging pinprick eyes, clenched teeth, tears, flying sweat, trembling head; tired = heavy lids, deep bags, animated yawn, floating z's; exhausted = pale, spiral eyes, tongue out, drool, z's and a little soul drifting out. Poses: tired buckles at the knees with arms to the knees, exhausted collapses flat on the floor, lazy sinks into the couch with a snack bag.
- Default art is now: generated frames if present, otherwise the illustrated placeholders. The single-photo overlay look stays available at `/gallery?art=photo` but is no longer used by the app.

## Task editor and History (milestone 6)
- Routes: `/tasks` (list, "show archived"), `/tasks/new`, `/tasks/:id` (editor), `/history`. The header nav sits on its own row on phones.
- The editor keeps values for every task type, so switching the type picker doesn't lose input. Client-side checks mirror the server for quick feedback and use the server's field paths (`schedule.slots[1].by`); rules only the server can check (slot order relative to the reset hour) come back from the API and show on the same field.
- "Live effect preview" has two parts: (1) a severity ladder: three small characters showing what this effect looks like at severity 1/2/3, drawn client-side from the effect key (it mirrors the engine's layer mapping and is only an illustration); (2) for saved tasks, a time slider over the next 48 h in 30-minute steps that calls `GET /state?at=` and shows the real character and this task's status at that moment. Unsaved edits aren't previewed by the engine (a note says so), because `/state?at=` only knows saved tasks.
- Archiving from the editor asks for confirmation; archived tasks open read-only.
- History: range 4 / 12 / 26 weeks ending on today's logical date, starting on a Monday so columns are whole weeks. Day results use the fixed status palette (good/warning/serious/critical) plus a shape per result (missed = slash, late = dot, partial = half fill, today = dashed outline), a labelled legend, hover/tap tooltips and a "Show as table" view, so color is never the only cue. Streaks show in days, weeks for quotas, none for freshness.
- `/history` now includes `effectKey` per task (for the icons) instead of the page fetching the task list too.
- The Vite proxy target can be overridden with `API_TARGET` (default `http://localhost:8080`).
- New meter habits default to no minimum gap (the eat preset sets 180 min itself).

## Seed, PWA, README (milestone 7)
- The six habits from DESIGN.md are seeded through `TaskService` (same validation as the API) **once per user**, recorded in `users.seeded_at` (migration V3). Habits the user already has with the same name are skipped, so a user who started with their own habits gets the rest added, and archiving or renaming never brings a default back. Homework uses MON–THU (the doc's JSON example); all times are the doc's placeholders.
- One deployable: Spring serves `frontend/dist` (`STATIC_DIR`) and forwards app routes (`/tasks`, `/tasks/{id}`, `/history`, `/gallery`) to `index.html`. Needed because the installed PWA, the API and the server's login page must share one origin.
- Only the files a browser needs to recognise and install the app are public (manifest, icons, service worker); the app shell and its assets, including any generated avatar images, require a session.
- vite-plugin-pwa: `autoUpdate`, standalone, portrait; icons generated from `public/favicon.svg` by `@vite-pwa/assets-generator` (minimal 2023 preset). The service worker precaches the app shell but never serves `/api`, `/login`, `/logout` from cache.
- The single-photo overlay mode is now dev-only and lazily loaded, so a personal photo in `src/local-avatar/` is never part of a production build.
- No push notifications (Phase 1 scope); the PWA is installable only.

## Chibi avatar with OpenAI (user request)
- The user got an OpenAI API key and chose a **chibi of themselves** (DESIGN.md's original style) over the photorealistic frames. Still the local opt-in generator, not the Phase 2 in-app pipeline, so the "no AI image generation in Phase 1" rule keeps the same exception as before: nothing in the app calls a provider.
- `--provider openai|gemini` (OpenAI by default when `OPENAI_API_KEY` is set) and `--style chibi|photo` (chibi by default). OpenAI: `POST /v1/images/edits`, multipart with every reference as `image[]`, model `gpt-image-2.5-flare` (`OPENAI_IMAGE_MODEL`), 1024x1024 PNG, quality `medium` (`OPENAI_IMAGE_QUALITY`). `input_fidelity=high` is only sent to `gpt-image-1`/`1.5`, the models that accept it. Errors for an empty balance (`insufficient_quota`, billing) aren't retried.
- Chibi frames have a **transparent background**, so they sit on the drawn room and get the cartoon smell, growl, flies, thought bubble and bob, exactly like the illustrated placeholders. `avatar.json` gains `style`; the manifest carries it as `frameStyle`, and `CharacterStage` treats only `photo` frames as realistic. Files without `style` are photo frames (they predate it).
- Same derivation chain as the photo style: photo -> master; poses edited from [master, photo]; expressions edited from each pose's neutral frame. Pose and expression prompts reuse the exaggerated illustrated look (buckled knees, collapsed on the floor, couch + chips + sweatpants; squeezed-eye grin, sweat drops, tears, spiral eyes and a drifting soul).
- Default head anchors per style; hand-tuned anchors are kept across runs only while the style stays the same.
- Head anchors may carry an optional `belly` point, for poses where the belly isn't below the head (the chibi EXHAUSTED frame lies on its side). Chibi defaults were measured on the first generated set.
- Network errors (`fetch failed`, socket resets) are retried like 5xx; the first full run hit three.
- Frames are stored as **WebP** (quality 90, alpha kept; converted with `sharp`, now an explicit dev dependency). The PWA precaches every frame, and 24 PNGs made the install 27 MB; WebP brings it to 2.6 MB while keeping the character available offline. Older PNG/JPG frames are converted on the next run without any API call, and the app only bundles `generated/*.webp`, so leftovers aren't shipped.
