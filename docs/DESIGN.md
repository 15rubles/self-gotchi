# Self-Gotchi: Product & Technical Design

Oct 5, 2026 · @Aleksei

## Overview

Self-Gotchi is a habit tracker where the pet is a chibi version of you: every missed habit shows up on your character, every completed one fixes it. Version 1 is built for one user (Aleksei), but the data model, auth and asset pipeline are designed so it can become a multi-user product without a rewrite.

The core loop:

1. You define habits once (brush teeth twice, eat 3 times, work out 3x a week, clean, prep food, homework).
2. Each habit has a schedule and a deadline or time windows.
3. The State Engine checks every habit against the clock and produces a character state.
4. The character changes: physical habits change the body and add effects (smell, belly growl, messy room); mental habits change the face and add thought icons.
5. You tick a habit off, the effect disappears, the character recovers.

The working name "Self-Gotchi" is a placeholder.

## Decisions and assumptions

Five decisions are locked; six assumptions are my defaults and can be changed before development starts.

| Item | Choice | Status |
| --- | --- | --- |
| Art style | Cute cartoon / chibi | Decided |
| Image generation | Hybrid: AI generates body poses and face expressions of you; effects, room and icons are shared assets layered in code | Decided |
| Stack | Java Spring Boot backend + React frontend | Decided |
| Scope | Personal first, product-ready architecture | Decided |
| Task types | Checkmark with deadline + multi-time meter (plus suggested extras below) | Decided |
| Platform | Responsive web app installable as a PWA (phone home screen) | Assumption |
| Database | PostgreSQL; images in S3-compatible object storage | Assumption |
| Completion | Honor system: you tap "done", no proof required | Assumption |
| Time zone | One time zone per user; the day resets at a configurable hour (default 04:00, not midnight, so late nights count for the previous day) | Assumption |
| AI provider | Behind an interface, chosen after a consistency spike | Assumption |
| Photo handling | Original photo deleted after the avatar is approved | Assumption |

## Task model

The MVP needs four task types, not two: your workout ("few times a week") and cleaning do not fit a daily checkmark or a daily meter cleanly.

### Task types

| Type | How it works | Example | MVP? |
| --- | --- | --- | --- |
| Checkmark | Done once per period before a deadline (end of day, or a specific time) | Prepare food for tomorrow by 22:00; homework by 21:00 | Yes (you asked) |
| Meter | Done N times per day; each slot has a time window or a minimum gap since the last one | Brush teeth: morning by 10:00, evening by 23:30. Eat: 3 times, at least 3 h apart, first by 11:00 | Yes (you asked) |
| Weekly quota | Done X times per rolling or calendar week; judged against pace, not per day | Work out 3 times per week | Yes (suggested) |
| Freshness timer | No deadline; the effect grows with days since last done | Clean your place: fine for 2 days, messy at 3, filthy at 5 | Yes (suggested) |
| Avoidance | Starts as done; you tap it only if you failed | No phone in bed after 00:00 | Later |
| Recurring custom | Specific weekdays or every N days | Laundry every Sunday; water plants every 3 days | Later (checkmark with a recurrence rule covers it) |

A streak is not a type; it is a bonus any task can have (see Character state).

### Task lifecycle

Every task instance moves through `UPCOMING → DUE_SOON → DONE` or `UPCOMING → DUE_SOON → MISSED`. DUE\_SOON starts a configurable time before the deadline (default 60 min) and is what triggers a reminder and a mild "warning" visual. A missed task can still be completed late: the effect clears, but the day is recorded as late, not on time.

### Severity

Each task produces a severity from 0 (fine) to 3 (bad), which the character state reads.

| Type | Severity rule |
| --- | --- |
| Checkmark | 0 done or upcoming · 1 due soon · 2 missed · 3 missed 2+ days in a row |
| Meter | number of missed slots so far today, capped at 3 |
| Weekly quota | how far behind pace: 0 on pace · 1 one session behind · 2 two behind · 3 week lost |
| Freshness timer | 0 below the first threshold, then 1 / 2 / 3 at the thresholds you set |

### Your six habits as configured tasks

| Habit | Type | Rule | Category |
| --- | --- | --- | --- |
| Brush teeth | Meter | 2 slots: by 10:00, by 23:30 | Physical |
| Eat | Meter | 3 slots, 3 h minimum gap, first by 11:00, last by 21:00 | Physical |
| Work out | Weekly quota | 3 per week | Physical |
| Clean your place | Freshness timer | thresholds 3 / 5 / 7 days | Physical (environment) |
| Prepare food for tomorrow | Checkmark | by 22:00 | Mental |
| Homework | Checkmark | by 21:00 on class days | Mental |

All times are placeholders for you to set.

## Character state model

The character is five stacked layers, and each task feeds exactly one of them; this is what keeps the AI image count around 10 instead of 64+.

| Layer (back to front) | Source | Driven by | Personalized (AI)? |
| --- | --- | --- | --- |
| 1. Room | Shared art | Clean your place | No |
| 2. Body pose | AI image of you | Eating (energy) + Workout (motivation) | Yes |
| 3. Face expression | AI image of your face, placed on the head anchor | Highest-priority mood from all tasks | Yes |
| 4. Body effects | Shared animated sprites | Teeth (smell), Eating (belly growl) | No |
| 5. Thought icons | Shared icons above the head | Mental tasks (lunchbox, book) | No |

### Task to visual mapping

| Task | Layer | Severity 1 | Severity 2 | Severity 3 |
| --- | --- | --- | --- | --- |
| Brush teeth | Effect: mouth smell | faint wisp | green cloud | cloud + flies |
| Eat | Pose: energy + effect: belly | belly growl lines | tired pose | exhausted pose |
| Work out | Pose: motivation | slouch | lazy pose (couch slump) | lazy pose + sweatpants grey tint |
| Clean your place | Room | a few items on floor | messy room | filthy room |
| Prepare food | Thought icon + mood | small lunchbox icon | icon + worried face | icon pulses + very worried face |
| Homework | Thought icon + mood | small book icon | icon + worried face | icon pulses + very worried face |

### Resolving conflicts

Only one pose and one face can show at a time, so the engine picks by priority:

- **Pose**: exhausted > tired > lazy > normal. Hunger beats laziness because it is the more urgent need.
- **Face**: the mood with the highest severity wins; ties go to physical (exhausted, tired) over mental (worried). Everything fine and at least one streak active shows the happy face.
- **Effects and icons**: stack freely, up to 3 icons; extras collapse into a "+2" badge.

### State engine contract

The engine is a pure function: `computeState(tasks, completionLogs, now, timezone) → CharacterState`. No database writes, no randomness. That makes it trivially unit-testable ("at 23:40 with one brushing logged, smell severity is 1") and lets the frontend preview "what will I look like at 22:00" by calling it with a future time.

```json
{
  "pose": "TIRED",
  "face": "WORRIED",
  "room": 2,
  "effects": [{"key": "MOUTH_SMELL", "severity": 1}],
  "icons": [{"key": "HOMEWORK", "severity": 2}],
  "streakBonus": false
}
```

## Art and image generation pipeline

Your photo produces 11 personalized images once (1 master, 4 poses, 6 faces); everything else is shared art drawn once for all users.

### Personalized asset list

| Asset | Count | Variants |
| --- | --- | --- |
| Master character | 1 | Front-facing chibi, neutral, transparent background |
| Body poses (headless or with neutral head) | 4 | Normal, tired, exhausted, lazy |
| Face expressions (head only) | 6 | Neutral, happy, worried, very worried, tired, exhausted |

Chibi proportions help here: the head is big and separate, so swapping faces onto any pose at a fixed head anchor looks natural.

### Shared assets (drawn once, not AI-per-user)

Room backgrounds at 4 cleanliness levels, mouth smell (3 levels, animated), belly growl lines, flies, thought bubble + icons (lunchbox, book, dumbbell, generic), happy sparkles for streaks. These can be AI-assisted during development, then hand-cleaned, so their style matches the generated character.

### Pipeline steps

1. **Upload** a clear front-facing photo. Validate one face, decent resolution.
2. **Generate master**: 4 candidates from a locked style prompt (chibi, flat colors, thick outline, fixed canvas 1024x1024, fixed head position). You pick one or regenerate.
3. **Generate poses** using the approved master as the reference image, changing only the body.
4. **Generate faces** by editing (inpainting) only the face region of the master, so hair, head shape and colors stay identical.
5. **Post-process**: remove background, normalize scale, align to the head anchor, export WebP.
6. **Review screen**: all 10 variants side by side; regenerate any single one.
7. **Save manifest** and delete the original photo.

Generation runs as an async job (a few minutes is fine); the UI shows progress.

### Consistency strategy

Drift (the character not looking like the same person across images) is the number one risk. The defenses, in order of impact:

- Always generate variants from the approved master image, never from the photo again.
- Edit regions (inpainting) instead of regenerating whole images where possible.
- One locked style prompt and palette, stored per avatar so regenerations match.
- Human approval step before anything is saved.

### Provider

The backend talks to an `ImageGenerationProvider` interface (`generateFromPhoto`, `generateWithReference`, `inpaint`, `removeBackground`), so the provider can change without touching the rest. Pick the provider in a 1-2 day spike (Roadmap phase 0): test 2-3 providers or hosted models that support reference images and inpainting, on your own photo, and choose the one whose 10 variants look most like one character. Cost per avatar should be measured in that spike, not guessed now.

### Asset manifest

```json
{
  "avatarId": "a1",
  "styleVersion": 1,
  "headAnchor": {"x": 512, "y": 300, "scale": 1.0},
  "poses": {"NORMAL": "url", "TIRED": "url", "EXHAUSTED": "url", "LAZY": "url"},
  "faces": {"NEUTRAL": "url", "HAPPY": "url", "WORRIED": "url", "VERY_WORRIED": "url", "TIRED": "url", "EXHAUSTED": "url"}
}
```

## Architecture

Build one Spring Boot application (a modular monolith), not microservices: one user, one deploy, and the module boundaries below are enough to split later if the product ever needs it.

&#91;embedded content: system architecture · 1 backend, 4 external parts\]

The app talks to the API only; the API asks the State Engine how you look, and the Scheduler asks the same engine when to nag you.

### Backend modules (Java packages)

| Module | Responsibility |
| --- | --- |
| `task` | Task CRUD, schedule validation, completion log |
| `state` | State Engine: severity per task, layer resolution, CharacterState. No Spring dependencies, plain Java, heavily tested |
| `avatar` | Photo upload, generation jobs, `ImageGenerationProvider` adapters, manifest |
| `notify` | `@Scheduled` minute tick, push subscriptions, dedup log |
| `user` | Account, settings, time zone; auth in the product phase |

### Key libraries

Spring Boot 3 (Web, Data JPA, Security, Validation), Flyway for migrations, PostgreSQL, AWS SDK S3 client (works with any S3-compatible storage), `web-push` for notifications, JUnit 5 + Testcontainers for tests.

### Deployment

One container on a small PaaS or VPS, managed Postgres, S3-compatible bucket. The React build can be served by Spring as static files, which keeps it to one deployable for the personal phase.

## Data model

Eight tables; every row hangs off `user_id` from day one, which is the whole trick to being product-ready while having one user.

| Table | Key columns | Notes |
| --- | --- | --- |
| `users` | id, email, display\_name, timezone, day\_reset\_hour, created\_at | One row for now; auth added in the product phase |
| `tasks` | id, user\_id, name, category (PHYSICAL / MENTAL), type (CHECK / METER / QUOTA / FRESHNESS), effect\_key, schedule (JSONB), active, sort\_order | `schedule` holds type-specific rules (below) |
| `task_completions` | id, task\_id, user\_id, completed\_at, slot\_index, source (APP / NOTIFICATION) | Append-only event log; state is computed from it |
| `avatars` | id, user\_id, status (GENERATING / REVIEW / ACTIVE), style\_version, style\_prompt, head\_anchor (JSONB) | One active avatar per user |
| `avatar_assets` | id, avatar\_id, kind (MASTER / POSE / FACE), variant, storage\_key, approved | Points to object storage |
| `generation_jobs` | id, avatar\_id, step, status, provider, error, cost\_cents, started\_at, finished\_at | Tracks async generation and measures cost |
| `push_subscriptions` | id, user\_id, endpoint, keys (JSONB), created\_at | Web Push |
| `notification_log` | id, user\_id, task\_id, kind (DUE\_SOON / MISSED), sent\_at | Prevents duplicate reminders |

### Schedule JSON by task type

```json
{ "type": "CHECK", "recurrence": "DAILY", "days": ["MON","TUE","WED","THU"], "deadline": "21:00" }
{ "type": "METER", "slots": [{"by": "10:00"}, {"by": "23:30"}] }
{ "type": "METER", "count": 3, "minGapMinutes": 180, "firstBy": "11:00", "lastBy": "21:00" }
{ "type": "QUOTA", "timesPerWeek": 3, "weekStarts": "MON" }
{ "type": "FRESHNESS", "thresholdsDays": [3, 5, 7] }
```

JSONB keeps new task types from needing migrations; validate it with one Java record per type (sealed interface `Schedule` with `CheckSchedule`, `MeterSchedule`, and so on).

## API design

A small REST API under `/api/v1`; the one endpoint the home screen lives on is `GET /state`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/state?at=` | Computed CharacterState + today's task list with statuses; `at` optional for previews |
| GET | `/tasks` | List task definitions |
| POST | `/tasks` | Create a task (schedule validated by type) |
| PUT | `/tasks/{id}` | Edit a task |
| DELETE | `/tasks/{id}` | Archive a task (soft delete, keeps history) |
| POST | `/tasks/{id}/complete` | Log a completion (optional `completedAt` for "I did it earlier") |
| DELETE | `/completions/{id}` | Undo a mistaken tap |
| GET | `/history?from=&to=` | Per-day results for stats and streaks |
| POST | `/avatar` | Upload photo, start a generation job |
| GET | `/avatar/jobs/{id}` | Job progress |
| POST | `/avatar/assets/{id}/regenerate` | Redo one variant |
| POST | `/avatar/approve` | Approve, activate, delete the original photo |
| GET | `/avatar/manifest` | Asset URLs (signed) for the renderer |
| POST | `/push/subscribe` | Register a Web Push subscription |

The `POST /complete` response returns the new CharacterState too, so the character reacts instantly without a second request.

Auth: for the personal phase, a single account with Spring Security session login is enough. The product phase swaps in OAuth (Google / Apple sign-in) without changing endpoints, since everything already resolves the current user from the security context rather than a URL parameter.

## Frontend

One main screen does 90% of the work: the character on top, today's tasks below, one tap to complete.

### Screens

| Screen | What it shows |
| --- | --- |
| Home | Character stage (room + you + effects + icons), today's tasks grouped by status (due soon first), tap to complete, streak counter |
| Task editor | Create/edit a task; type picker changes the form (deadline, slots, times per week, thresholds); live preview of the effect |
| Avatar setup | Photo upload, pick from 4 master candidates, review all 10 variants, regenerate any one, approve |
| History | Calendar heatmap per task, current and best streaks |
| Settings | Time zone, day reset hour, quiet hours, notification toggles |

### Rendering the character

Use stacked absolutely positioned images (or one `<canvas>` later if performance needs it), in the layer order from Character state. A `CharacterStage` component takes `CharacterState` + the asset manifest and renders:

- Room background (`room` level 0-3)
- Pose image
- Face image positioned at `headAnchor`
- Effect sprites anchored to mouth and belly points
- Thought bubble with icons above the head

### Animations

Keep them CSS-first; add Lottie or sprite sheets only where CSS looks cheap.

| Animation | Technique |
| --- | --- |
| Idle breathing bob (always on, sells the "alive" feeling) | CSS `transform: translateY` keyframes |
| Mouth smell wisps | Sprite sheet or Lottie, opacity by severity |
| Belly growl | Short shake + growl lines every 8-10 s |
| Worried icon pulse | CSS scale pulse |
| Task completed | Sparkle burst + character hop, then the effect fades out |
| Blink | Swap to a closed-eyes frame for 120 ms every few seconds (needs 1 extra face asset, optional) |

### State updates

Fetch `/state` on load, after every completion, and every 60 s while the tab is visible (states change on the clock, not only on taps). Use TanStack Query for fetching and caching; React state is enough, no Redux.

### Stack details

React + TypeScript + Vite, Tailwind for layout, `vite-plugin-pwa` for the service worker and install prompt.

## Notifications

Web Push through the PWA is the only channel needed; a Tamagotchi that never nags you is just a picture.

- **Due soon**: once per task instance, at the DUE\_SOON threshold ("Your teeth are getting spicy. 30 min left.").
- **Missed**: once, at the deadline, with the character's current face as the notification image.
- **Daily recap** (optional): evening summary of what is still open.
- **Quiet hours**: no pushes inside a configurable window; anything due inside it is sent at the window's end.
- **Action button**: "Done" directly on the notification calls `/complete` (source = NOTIFICATION).

A Spring `@Scheduled` job runs every minute, calls the State Engine for each user, and sends pushes for transitions it has not already logged in `notification_log`. Library: `nl.martijndwars:web-push` (Java) with VAPID keys.

On iPhone, Web Push only works after the app is added to the Home Screen, so onboarding must prompt for that.

## Privacy and security

A face photo is the most sensitive thing this app touches, so the rule is: keep it only as long as generation needs it.

- Original photo stored in a private bucket, deleted on avatar approval (or after 7 days if never approved).
- Generated assets served through short-lived signed URLs, never public links.
- Choose an AI provider that does not train on submitted images, and check its retention terms in the spike.
- Habit data is personal but low-risk; standard practice is enough: HTTPS, hashed passwords or OAuth, per-user authorization checks on every query.
- **Product phase**: explicit consent screen for photo processing, account deletion that removes all assets, and a legal review of face-data rules in target markets (some US states and the EU treat face-derived data strictly). Not needed while you are the only user.

## Roadmap

Start with a throwaway spike on the AI images before writing app code: if the avatar can't stay consistent, you want to know in 2 days, not 2 months.

&#91;embedded content: roadmap · 4 phases, 3 gates\]

Phase 1 deliberately ships with generic placeholder chibi art, so the task logic and State Engine get real daily use while Phase 2 builds the personalized pipeline. Each gate is a go/no-go: failing Gate 1 means switching to a customizable generic avatar instead of photo generation; failing Gate 3 means the idea needs rework before any product work.

## Risks and open questions

The two risks that can kill this are avatar drift and you getting bored of tapping; everything else is normal engineering.

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AI variants do not look like the same person | High: the whole hook breaks | Phase 0 spike before any app code; master-reference + inpainting; manual review step; fallback to a hand-tuned generic chibi |
| Novelty wears off after 2 weeks | High | Streaks, happy states, unlockable outfits/rooms later; keep completion to one tap or one notification button |
| Honor system makes it easy to cheat | Medium (it's you vs you) | Accept for personal phase; optional photo proof as a later feature |
| Time logic bugs (time zones, day reset, DST) | Medium | Pure State Engine with heavy unit tests on edge times; store everything in UTC, compute in user's zone |
| Image generation cost per user | Medium for product phase | Measured in the spike; generate once, cache forever; regenerations limited |
| Scope creep (social features, pets, shop) | Medium | Nothing outside the MVP list until you have used it daily for 30 days |

### Open questions

- [ ] Real deadlines and slot times for each of your six habits
- [ ] Should a late completion fully clear the effect, or leave a smaller "recovering" state until tomorrow?
- [ ] Does the room reset instantly when you tap "cleaned", or step down one level per tap?
- [ ] Name for the app
- [ ] Product-phase monetization model (one-time avatar fee, subscription, cosmetics) - decide only after the personal phase
