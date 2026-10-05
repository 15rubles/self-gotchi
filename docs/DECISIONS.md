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
