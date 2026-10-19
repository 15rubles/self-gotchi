-- The calendar event (iCalendar UID) a habit was imported from, so importing again skips it.
ALTER TABLE tasks ADD COLUMN import_uid VARCHAR(255);
CREATE UNIQUE INDEX tasks_user_import_uid ON tasks (user_id, import_uid) WHERE import_uid IS NOT NULL;
