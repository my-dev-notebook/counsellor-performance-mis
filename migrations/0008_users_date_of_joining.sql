-- Migration number: 0008 	 2026-09-15T13:00:00.000Z

-- Date the person joined, as an ISO date (YYYY-MM-DD). Nullable: existing
-- rows are left NULL and get filled in by hand. ADD COLUMN is non-destructive.
ALTER TABLE users ADD COLUMN date_of_joining TEXT
    CHECK (date_of_joining IS NULL OR date_of_joining GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
