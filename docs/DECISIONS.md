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
