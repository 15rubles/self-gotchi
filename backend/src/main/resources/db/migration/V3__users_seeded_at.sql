-- When the default habits were created for this user; seeding happens at most once per user.
ALTER TABLE users ADD COLUMN seeded_at TIMESTAMPTZ;
