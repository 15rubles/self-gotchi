-- Tables for later phases (avatar pipeline, Web Push). Created now so the schema
-- matches DESIGN.md; nothing in Phase 1 reads or writes them.

CREATE TABLE avatars (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT      NOT NULL REFERENCES users (id),
    status         VARCHAR(16) NOT NULL CHECK (status IN ('GENERATING', 'REVIEW', 'ACTIVE')),
    style_version  INT         NOT NULL DEFAULT 1,
    style_prompt   TEXT,
    head_anchor    JSONB,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_avatars_one_active ON avatars (user_id) WHERE status = 'ACTIVE';

CREATE TABLE avatar_assets (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    avatar_id   BIGINT       NOT NULL REFERENCES avatars (id),
    kind        VARCHAR(16)  NOT NULL CHECK (kind IN ('MASTER', 'POSE', 'FACE')),
    variant     VARCHAR(32)  NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    approved    BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE generation_jobs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    avatar_id   BIGINT      NOT NULL REFERENCES avatars (id),
    step        VARCHAR(32) NOT NULL,
    status      VARCHAR(16) NOT NULL,
    provider    VARCHAR(64),
    error       TEXT,
    cost_cents  INT,
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE TABLE push_subscriptions (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id),
    endpoint   TEXT        NOT NULL,
    keys       JSONB       NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_log (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT      NOT NULL REFERENCES users (id),
    task_id BIGINT      NOT NULL REFERENCES tasks (id),
    kind    VARCHAR(16) NOT NULL CHECK (kind IN ('DUE_SOON', 'MISSED')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
