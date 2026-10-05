# Self-Gotchi

Habit tracker where a chibi avatar reacts to completed or missed habits.
`docs/DESIGN.md` is the source of truth; `docs/DECISIONS.md` records choices made where it is ambiguous.

## Layout
- `backend/` — Java 21, Spring Boot 3.5, Maven wrapper. Root package `app.selfgotchi`, package-by-module:
  `task`, `state` (pure engine), `stateapi` (Spring adapter for the engine), `user`, `avatar` and `notify` (interfaces only), `config`.
- `frontend/` — React + TypeScript + Vite, Tailwind v4, TanStack Query, vite-plugin-pwa.
- `docker-compose.yml` — Postgres 16 for local dev.

## Commands
```sh
docker compose up -d                       # Postgres on :5432 (selfgotchi/selfgotchi)

cd backend
./mvnw spring-boot:run                     # API on :8080 (login aleksei@selfgotchi.local / changeme by default)
./mvnw test                                # all tests; integration tests need Docker running
./mvnw test -Dtest='app.selfgotchi.state.**'   # State Engine only, no Docker
./mvnw -DskipTests package                 # build jar

cd frontend
npm install
npm run dev                                # :5173, proxies /api, /login, /logout to :8080
npm run build                              # type-check + production build
npm run lint
npm run avatar:generate                    # realistic avatar frames from src/local-avatar/photo.jpg (needs GEMINI_API_KEY; sends the photo to Google)

# One origin (installable PWA): build the frontend, then the backend serves frontend/dist on :8080
cd frontend && npm run build && cd ../backend && ./mvnw spring-boot:run
```
On this machine the JDK is not on PATH: `export JAVA_HOME=~/.jdks/corretto-24.0.2` first (it compiles with `--release 21`).

Windows PowerShell 5.1 equivalents (no `&&`, no `export`; run one command per line):
```powershell
$env:JAVA_HOME = "$env:USERPROFILE\.jdks\corretto-24.0.2"   # or set once: [Environment]::SetEnvironmentVariable('JAVA_HOME', "$env:USERPROFILE\.jdks\corretto-24.0.2", 'User')
cd backend
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run
```

## Hard rules
- The State Engine lives in `app.selfgotchi.state` as plain Java with **zero Spring, JPA or Jackson imports**
  (enforced by an ArchUnit test). Pure, deterministic, no I/O:
  `computeState(tasks, completionLogs, now, zoneId) -> CharacterState`.
- All time logic uses `java.time`. Store instants in UTC, compute in the user's `ZoneId`.
  Inject `java.time.Clock` everywhere "now" is needed; never call `Instant.now()`/`LocalDate.now()` without a clock.
  Respect `day_reset_hour` (default 04:00): a completion at 01:30 belongs to the previous day.
- Every row is scoped by `user_id`, and every repository query filters by it, even though there is one user.
- Task schedules are JSONB, decoded into the sealed interface `Schedule`
  (`CheckSchedule`, `MeterSchedule`, `QuotaSchedule`, `FreshnessSchedule`) and validated on create/update.
- State Engine changes start with a failing test.
- Phase 1 scope only: no AI image generation, photo upload, Web Push, OAuth, signup or monetization.
  `avatar` and `notify` hold interfaces only.
- Ambiguity in the design doc: pick the simplest option, record it in `docs/DECISIONS.md`.
- Never commit personal photos or generated avatar images: `docs/*.jpg|png` and `frontend/src/local-avatar/*` are gitignored on purpose.

## Conventions
- Integration tests use `@IntegrationTest` (Testcontainers Postgres, MockMvc, `MutableClock`, rolled-back transaction) and are named `*IntegrationTest`.
- Errors are RFC 7807 problem details; validation errors carry `errors: [{field, message}]` (`common.ApiExceptionHandler`).
- Rows of other users are reported as 404, never 403.
- Seeding (`task.SeedRunner`) runs once per user (`users.seeded_at`); never make it depend on the task count.
- Only PWA install files are public (`SecurityConfig`); the app shell and assets need a session.
