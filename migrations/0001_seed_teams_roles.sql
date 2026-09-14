-- Migration number: 0001 	 2026-09-05T19:55:34.252Z
-- Seeds the fixed set of 6 teams from CANONICAL_TEAMS (src/schemas/parser.ts)
-- and the initial roles. No "add team" UI is planned; a new role is one more
-- INSERT here plus an entry in the permission map (src/lib/auth/permissions.ts).
--
-- Ids are explicit because migrations/0002_seed_users.sql and the backfill
-- migrations reference them directly.
INSERT INTO teams (id, name) VALUES
  (1, 'Design'),
  (2, 'Engineering'),
  (3, 'Inbound'),
  (4, 'Law'),
  (5, 'Management'),
  (6, 'Media/Liberal Arts');

INSERT INTO roles (id, name) VALUES
  (1, 'counsellor'),
  (2, 'team_leader'),
  (3, 'mis_executive'),
  (4, 'admin'),
  (5, 'quality_analyst');
