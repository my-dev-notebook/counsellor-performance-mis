-- One-off for databases that already ran the pre-roster 0002 seed and grew
-- extra users through the UI. Deactivates every active counsellor that is
-- NOT in ~/Downloads/Counsellors_Team_Wise.csv (2026-09-15 roster), logging
-- the change and dropping their sessions. Non-counsellor accounts (admin,
-- mis_executive, quality_analyst) are untouched. Matched by email; ids are
-- listed for readability only.
--
-- Local:   sqlite3 <miniflare .sqlite> < scripts/deactivate-departed-counsellors.sql
-- Remote:  wrangler d1 execute DB --env staging --remote --file scripts/deactivate-departed-counsellors.sql
--
-- Idempotent: already-inactive users are skipped by the is_active = 1 guard.

CREATE TEMP TABLE departed (email TEXT PRIMARY KEY);
INSERT INTO departed (email) VALUES
  ('ajit.singh@bennett.edu.in'),            -- 4  AJIT SINGH
  ('partha.dhara@bennett.edu.in'),          -- 5  PARTHA PARTIM DHARA
  ('c-jyoti.chauhan@bennett.edu.in'),       -- 8  Jyoti Chauhan
  ('c-kuljeet.kaur@bennett.edu.in'),        -- 11 Kuljeet Kaur
  ('c-debanjani.saha@bennett.edu.in'),      -- 20 Debanjani Saha
  ('c-alok.raj@bennett.edu.in'),            -- 29 Alok Raj
  ('c-abquar.akhtar@bennett.edu.in'),       -- 36 Abquari Akhtar
  ('c-sanjay.rawat@bennett.edu.in'),        -- 39 Sanjay Rawat
  ('c-sakaar.srivastava@bennett.edu.in'),   -- 53 Sakaar Srivastava
  ('c-ashna.sidiqqui@bennett.edu.in'),      -- 72 Ashna Sidiqqui
  ('c-deepanshi.sharma@bennett.edu.in'),    -- 73 Deepanshi Sharma
  ('c-ankita.singh1@bennett.edu.in'),       -- 74 Ankita Singh
  ('c-deepali.gupta@bennett.edu.in'),       -- 75 Deepali Gupta
  ('c-safiya.farheen@bennett.edu.in'),      -- 76 Safiya Farheen
  ('c-bhoomi.kanujiya@bennett.edu.in'),     -- 77 Bhoomi Kanujiya
  ('c-shubham.kumar@bennett.edu.in'),       -- 87 Shubham Kumar
  ('c-bhumika.kumari@bennett.edu.in'),      -- 88 Bhumika Kumari
  ('c-ayushi.aggarwal@bennett.edu.in'),     -- 89 Ayushi Aggarwal
  ('c-vansh.aggarwal@bennett.edu.in'),      -- 90 Vansh Aggarwal
  ('c-sarang.patel@bennett.edu.in'),        -- 91 Sarang Patel
  ('c-sonal.singh@bennett.edu.in'),         -- 92 Sonal Singh
  ('c-yashika.gupta@bennett.edu.in'),       -- 93 Yashika Gupta
  ('c-riya.singh@bennett.edu.in'),          -- 94 Riya Singh
  ('c-archi.singh@bennett.edu.in');         -- 99 Archi Singh

INSERT INTO user_changes (user_id, field, old_value, new_value, changed_by)
SELECT u.id, 'is_active', 1, 0, NULL
FROM users u JOIN departed d ON d.email = u.email
WHERE u.is_active = 1 AND u.role_id = 1;

DELETE FROM sessions
WHERE user_id IN (SELECT u.id FROM users u JOIN departed d ON d.email = u.email WHERE u.is_active = 1 AND u.role_id = 1);

UPDATE users
SET is_active = 0, updated_at = datetime('now')
WHERE is_active = 1 AND role_id = 1 AND email IN (SELECT email FROM departed);

DROP TABLE departed;

-- Team corrections from the same roster (team ids per migrations/0001).
-- Guarded by the current team so re-running logs nothing twice.
CREATE TEMP TABLE team_moves (email TEXT PRIMARY KEY, team_id INTEGER NOT NULL);
INSERT INTO team_moves (email, team_id) VALUES
  ('c-nidhi.khandelwal@bennett.edu.in', 1),  -- 6  Nidhi Khandelwal: Media/Liberal Arts -> Design
  ('c-sumitra.bharti@bennett.edu.in', 4),    -- 14 Sumitra: Inbound -> Law
  ('c-bashar.nasir@bennett.edu.in', 5),      -- 33 Bashar Nasir: Engineering -> Management
  ('c-karnika.sharma@bennett.edu.in', 4),    -- 37 Karnika Sharma: Inbound -> Law
  ('c-ishika.singh@bennett.edu.in', 2),      -- 50 Ishika Singh: Media/Liberal Arts -> Engineering
  ('c-palki.mittal@bennett.edu.in', 2);      -- 54 Palki Mittal: Media/Liberal Arts -> Engineering

INSERT INTO user_changes (user_id, field, old_value, new_value, changed_by)
SELECT u.id, 'team_id', u.team_id, m.team_id, NULL
FROM users u JOIN team_moves m ON m.email = u.email
WHERE u.team_id IS NOT m.team_id;

UPDATE users
SET team_id = (SELECT team_id FROM team_moves m WHERE m.email = users.email),
    updated_at = datetime('now')
WHERE email IN (SELECT email FROM team_moves)
  AND team_id IS NOT (SELECT team_id FROM team_moves m WHERE m.email = users.email);

DROP TABLE team_moves;
