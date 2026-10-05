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
