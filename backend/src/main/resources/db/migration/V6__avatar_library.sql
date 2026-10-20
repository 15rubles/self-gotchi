-- Finished avatars are kept (READY) so the user can switch between them; at most one is ACTIVE.
-- No ACTIVE row = the app's built-in art.

ALTER TABLE avatars DROP CONSTRAINT avatars_status_check;
ALTER TABLE avatars ADD CONSTRAINT avatars_status_check
    CHECK (status IN ('GENERATING', 'REVIEW', 'FAILED', 'READY', 'ACTIVE'));

DROP INDEX uq_avatars_one_draft;
CREATE UNIQUE INDEX uq_avatars_one_draft ON avatars (user_id) WHERE status IN ('GENERATING', 'REVIEW', 'FAILED');
