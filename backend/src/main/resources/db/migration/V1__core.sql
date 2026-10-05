-- Core Phase 1 tables. Every row hangs off user_id.

CREATE TABLE users (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email           VARCHAR(320) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    timezone        VARCHAR(64)  NOT NULL,
    day_reset_hour  SMALLINT     NOT NULL DEFAULT 4 CHECK (day_reset_hour BETWEEN 0 AND 23),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users (id),
    name        VARCHAR(100) NOT NULL,
    category    VARCHAR(16)  NOT NULL CHECK (category IN ('PHYSICAL', 'MENTAL')),
    type        VARCHAR(16)  NOT NULL CHECK (type IN ('CHECK', 'METER', 'QUOTA', 'FRESHNESS')),
    effect_key  VARCHAR(32)  NOT NULL,
    schedule    JSONB        NOT NULL,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    archived_at TIMESTAMPTZ,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user_active ON tasks (user_id, active, sort_order);

-- Append-only event log; character state is computed from it.
CREATE TABLE task_completions (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_id      BIGINT      NOT NULL REFERENCES tasks (id),
    user_id      BIGINT      NOT NULL REFERENCES users (id),
    completed_at TIMESTAMPTZ NOT NULL,
    slot_index   SMALLINT,
    source       VARCHAR(16) NOT NULL DEFAULT 'APP' CHECK (source IN ('APP', 'NOTIFICATION')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_completions_user_time ON task_completions (user_id, completed_at);
CREATE INDEX idx_completions_task_time ON task_completions (task_id, completed_at);
