# Self-Gotchi

A habit tracker where the pet is a chibi version of you: every missed habit shows up on your
character (bad breath, a growling stomach, a messy room, worried thoughts), and every completed
one fixes it.

This is **Phase 1 (core MVP)** from [`docs/DESIGN.md`](docs/DESIGN.md): four task types, a pure
State Engine, the REST API, and an installable web app with an illustrated character. Choices
made where the design doc was open are in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## What's in it

- **Four habit types:** checkmark (by a deadline, optionally on certain weekdays), meter
  (N times a day, at set times or spaced out), weekly quota (judged on pace) and freshness
  (gets worse every few days).
- **State Engine:** a pure Java function `computeState(tasks, completionLogs, now, zoneId)`.
  It respects your time zone, a configurable day-reset hour (default 04:00, so 01:30 counts
  for the day before) and daylight-saving changes.
- **Home:** your character on top, today's habits grouped by status (due soon first),
  one-tap complete with undo, and an automatic refresh every minute.
- **Habit editor:** the form adapts to the habit type, and a live preview shows how you'll
  look at any moment in the next 48 hours.
- **History:** a calendar heatmap per habit, with current and best streaks.
- **Installable PWA** (no push notifications yet).
- **Not in Phase 1:** AI avatar generation, push notifications, sign-up/OAuth and
  monetization. Interfaces for the avatar and notification parts exist; the implementations
  don't.

## Requirements

- Docker (for Postgres and for the integration tests)
- JDK 21 or newer (the build targets Java 21). On this machine: `~/.jdks/corretto-24.0.2`.
- Node.js 22 or newer

## Run it (development)

Three terminals. PowerShell:

```powershell
# 1. Database
docker compose up -d

# 2. API on http://localhost:8080
cd backend
$env:JAVA_HOME = "$env:USERPROFILE\.jdks\corretto-24.0.2"   # if java isn't on PATH
.\mvnw.cmd spring-boot:run

# 3. Web app on http://localhost:5173 (proxies /api, /login, /logout to :8080)
cd frontend
npm install
npm run dev
```

The same in bash: `docker compose up -d`, `cd backend && ./mvnw spring-boot:run`, and
`cd frontend && npm install && npm run dev`.

Open http://localhost:5173 and sign in with **`aleksei@selfgotchi.local` / `changeme`**.

On first start the backend:

- creates your user (time zone = your computer's, unless `APP_USER_TIMEZONE` is set; change it any time in **Settings**);
- adds the six habits from the design doc: brush teeth, eat, work out, clean your place,
  prepare food for tomorrow, homework (Mon–Thu). This happens once per user and never again
  after you edit or archive them.

Stop each server with **Ctrl+C**. Stop the database with `docker compose stop`.

## Run it as an installable app (one origin)

The installed app, the API and the login page must share one origin, so the backend can
serve the built frontend itself:

```powershell
cd frontend; npm run build          # writes frontend/dist
cd ..\backend; .\mvnw.cmd spring-boot:run
```

Open **http://localhost:8080**, sign in, then install it. In Chrome or Edge, use the install
icon in the address bar (or the menu, then "Install Self-Gotchi").

**On a phone:** browsers only install PWAs from HTTPS (or `localhost`). Deploy the backend
behind HTTPS, or expose your local port through an HTTPS tunnel (e.g. `cloudflared tunnel
--url http://localhost:8080`), then use "Add to Home Screen" (iPhone: Safari, Share menu).

## Configuration

Environment variables (all optional):

| Variable | Default | Meaning |
| --- | --- | --- |
| `APP_USERNAME` / `APP_PASSWORD` | `aleksei@selfgotchi.local` / `changeme` | The single login (the username is the user's email). **Change both for any real use.** |
| `APP_USER_DISPLAY_NAME` | `Aleksei` | Display name |
| `APP_USER_TIMEZONE` | your computer's zone | IANA zone, e.g. `Europe/Berlin`. Only used when your user is first created; change it later in Settings. |
| `APP_DAY_RESET_HOUR` | `4` | Hour (0–23) a new day starts. Only used when your user is first created; change it later in Settings. |
| `APP_SEED` | `true` | Add the six default habits once for a new user |
| `DB_URL` / `DB_USER` / `DB_PASSWORD` | local Docker Postgres | Database connection |
| `PORT` | `8080` | API port |
| `STATIC_DIR` | `file:../frontend/dist/` | Where the backend serves the built frontend from |
| `API_TARGET` (frontend dev) | `http://localhost:8080` | Backend the Vite dev server proxies to |

## Tests and checks

```powershell
cd backend
.\mvnw.cmd test                                   # everything (needs Docker for Testcontainers)
.\mvnw.cmd test "-Dtest=app.selfgotchi.state.**"  # State Engine only, no Docker

cd frontend
npm run build    # type-check + production build
npm run lint
```

The State Engine tests read like a spec: see
`backend/src/test/java/app/selfgotchi/state/StateEngineTest.java`.

## Using the API directly

All endpoints are under `/api/v1` and need a session. The quickest way to get one is to sign
in through the browser. With curl:

```bash
# sign in (the login form needs its CSRF token)
tok=$(curl -s -c jar http://localhost:8080/login | grep -o 'name="_csrf" type="hidden" value="[^"]*"' | sed 's/.*value="//;s/"//')
curl -s -b jar -c jar -d "username=aleksei@selfgotchi.local&password=changeme&_csrf=$tok" http://localhost:8080/login

curl -s -b jar http://localhost:8080/api/v1/state                                # now
curl -s -b jar "http://localhost:8080/api/v1/state?at=2026-10-05T21:40:00Z"      # preview a moment
curl -s -b jar "http://localhost:8080/api/v1/history?from=2026-09-01&to=2026-10-05"
```

Writes (POST/PUT/DELETE) also need the `X-XSRF-TOKEN` header, set to the value of the
`XSRF-TOKEN` cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/state?at=` | Character + today's habits with statuses; `at` previews another moment |
| GET / POST | `/tasks` | List (`?includeArchived=true`) / create |
| GET / PUT / DELETE | `/tasks/{id}` | Read / edit / archive (soft delete, history kept) |
| POST | `/tasks/{id}/complete` | Log a completion (optional `{"completedAt": "..."}`); returns the new state |
| DELETE | `/completions/{id}` | Undo a completion; returns the new state |
| GET | `/history?from=&to=` | Per-day results and streaks |
| GET | `/me` | Current user and time settings |

## The character's art

The default art is an illustrated chibi with exaggerated expressions, drawn as inline SVG. To
see every pose, face, room level and effect, open `/gallery` in the dev server.

The renderer reads an asset manifest in the design doc's format, so other art can be dropped
in without changing the screen:

- **An AI-generated chibi of you** (optional, sends your photo to OpenAI): put a photo at
  `frontend/src/local-avatar/photo.jpg`, set `OPENAI_API_KEY` (an OpenAI API account with
  credit), and run `npm run avatar:generate` in `frontend/`. A photorealistic style
  (`--style photo`) and Google Gemini (`--provider gemini`) are also supported. See
  [`frontend/src/local-avatar/README.md`](frontend/src/local-avatar/README.md).
- Your photos and generated images are gitignored and never committed.

## Project layout

```
backend/   Spring Boot 3.5, Java 21. Packages: task, state (pure engine), stateapi (Spring adapter),
           user, avatar + notify (interfaces only), common, config
frontend/  React + TypeScript + Vite, Tailwind, TanStack Query, vite-plugin-pwa
docs/      DESIGN.md (source of truth), DECISIONS.md (choices made along the way)
docker-compose.yml  Postgres 16 for local development
```

More details for contributors (and coding agents) are in [`CLAUDE.md`](CLAUDE.md).
