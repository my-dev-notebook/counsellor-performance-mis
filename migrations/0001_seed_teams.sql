-- Migration number: 0001 	 2026-09-05T19:55:34.252Z
-- Seeds the fixed set of 6 teams from CANONICAL_TEAMS (src/lib/parser/schemas.ts).
-- DATA_ENTRY_INTERFACE.md §3: no "add team" UI is planned; this is the only
-- place these rows are ever created.
INSERT INTO teams (name) VALUES
  ('Design'),
  ('Engineering'),
  ('Inbound'),
  ('Law'),
  ('Management'),
  ('Media/Liberal Arts');
