-- Migration number: 0002 	 2026-09-10T00:00:00.000Z

-- Real counsellor roster, generated from the Meritto user dump (tmp/users.json)
-- using the same filter as tmp/filter-users.ts: numeric Meritto user id,
-- @bennett.edu.in email, non-empty `teams`. Two Meritto users matching that
-- filter are excluded -- Madhur Tandon (team 'Admin') and Chainika Pandey (team
-- 'Madhur Tandon Team') are leadership, not counsellors carrying targets. 56
-- users remain.
--
-- `meritto_user_id` is the Meritto id itself -- the join key for the admissions
-- auto-fetch (`counsellorId` in src/utils/meritto/fetch-applicants.ts).
--
-- team_id: Meritto's team label minus the trailing " Team" maps 1:1 onto
-- CANONICAL_TEAMS (src/lib/parser/schemas.ts) for every counselling team. Users
-- carrying several teams take the first canonical one -- the extras are all
-- leader-named groupings ('Neha verma Team', 'Ritesh Uniyal Team', 'Call Centre
-- Team'), so the pick is unambiguous.
--
-- agency_id is NULL for everyone: the Meritto dump carries no agency field, so
-- there is nothing to derive it from. Agencies get assigned through the roster
-- UI (§4.1 "Edit profile") rather than being invented here.
--
-- id == person_id on seed, per the assignment-period rules in §4.1 -- person_id
-- is copied forward, never regenerated, on reassignment.

INSERT INTO agencies (name) VALUES
  ('AM2PM'),
  ('SKS Enterprises');

INSERT INTO users (id, name, email, meritto_user_id, team_id, agency_id, is_active, person_id) VALUES
  (1, 'Abhishek Kumar', 'c-abhishek.singh@bennett.edu.in', 13092325, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 1),
  (2, 'Arvind Kumar', 'c-arvind.kumar@bennett.edu.in', 13092476, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 2),
  (3, 'Sanjana Pal', 'c-sanjana.pal@bennett.edu.in', 13102706, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 3),
  (4, 'AJIT SINGH', 'ajit.singh@bennett.edu.in', 13103853, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 4),
  (5, 'PARTHA PARTIM DHARA', 'partha.dhara@bennett.edu.in', 13106715, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 5),
  (6, 'Nidhi Khandelwal', 'c-nidhi.khandelwal@bennett.edu.in', 16044516, (SELECT id FROM teams WHERE name = 'Media/Liberal Arts'), NULL, 1, 6),
  (7, 'Ritika Dakolia', 'c-ritika.dakolia@bennett.edu.in', 16044517, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 7),
  (8, 'Jyoti Chauhan', 'c-jyoti.chauhan@bennett.edu.in', 16058172, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 8),
  (9, 'Tanushree Bansal', 'c-tanushree.bansal@bennett.edu.in', 16063206, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 9),
  (10, 'Riya Chugh', 'c-riya.chugh@bennett.edu.in', 16063244, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 10),
  (11, 'Kuljeet Kaur', 'c-kuljeet.kaur@bennett.edu.in', 16077523, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 11),
  (12, 'Harsh Vardhan', 'c-harsh.vardhan@bennett.edu.in', 16078227, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 12),
  (13, 'Hemant singh', 'c-hemant.singh@bennett.edu.in', 16078230, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 13),
  (14, 'Sumitra', 'c-sumitra.bharti@bennett.edu.in', 16088891, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 14),
  (15, 'Shraddha Sharma', 'c-shraddha.sharma@bennett.edu.in', 16088893, (SELECT id FROM teams WHERE name = 'Media/Liberal Arts'), NULL, 1, 15),
  (16, 'Ankita Yadav', 'c-ankita.yadav@bennett.edu.in', 16088894, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 16),
  (17, 'Mishika Jindal', 'c-mishika.jindal@bennett.edu.in', 16088898, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 17),
  (18, 'Amrit Verma', 'c-amrit.verma@bennett.edu.in', 16088900, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 18),
  (19, 'Agrim Chaudhary', 'c-agrim.chaudhary@bennett.edu.in', 16090025, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 19),
  (20, 'Debanjani Saha', 'c-debanjani.saha@bennett.edu.in', 16091091, (SELECT id FROM teams WHERE name = 'Law'), NULL, 1, 20),
  (21, 'Shalini Panjiyar', 'c-shalini.paniyar@bennett.edu.in', 16091096, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 21),
  (22, 'Ashutosh Pandey', 'c-ashutosh.pandey@bennett.edu.in', 16091100, (SELECT id FROM teams WHERE name = 'Media/Liberal Arts'), NULL, 1, 22),
  (23, 'Taniya Adhikari', 'c-tanya.adhikari@bennett.edu.in', 16091101, (SELECT id FROM teams WHERE name = 'Media/Liberal Arts'), NULL, 1, 23),
  (24, 'Shalini Kumari', 'c-shalini.kumari@bennett.edu.in', 16091104, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 24),
  (25, 'Shweta Gupta', 'c-shweta.gupta@bennett.edu.in', 16092313, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 25),
  (26, 'Adiba Farid', 'c-abida.farid@bennett.edu.in', 16092314, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 26),
  (27, 'Shahid Mirza', 'c-shahid.mirza@bennett.edu.in', 16092316, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 27),
  (28, 'Vishwadeep Saxena', 'c-vishwadeep.saxena@bennett.edu.in', 16092318, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 28),
  (29, 'Alok Raj', 'c-alok.raj@bennett.edu.in', 16094075, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 29),
  (30, 'Nikhil Pal', 'c-nikhil.pal@bennett.edu.in', 16094403, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 30),
  (31, 'Abhinav Kumar', 'c-abhinav.kumar@bennett.edu.in', 16094405, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 31),
  (32, 'Anshika Garg', 'c-anshika.garg@bennett.edu.in', 16094406, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 32),
  (33, 'Bashar Nasir', 'c-bashar.nasir@bennett.edu.in', 16095366, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 33),
  (34, 'himanshu shahi', 'c-himanshu.shahi@bennett.edu.in', 16100476, (SELECT id FROM teams WHERE name = 'Law'), NULL, 1, 34),
  (35, 'Surbhi Yadav', 'c-surbhi.yadav@bennett.edu.in', 16100477, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 35),
  (36, 'Abquari Akhtar', 'c-abquar.akhtar@bennett.edu.in', 16101107, (SELECT id FROM teams WHERE name = 'Media/Liberal Arts'), NULL, 1, 36),
  (37, 'Karnika Sharma', 'c-karnika.sharma@bennett.edu.in', 16101111, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 37),
  (38, 'Prajukta Kashyap', 'c-prajukta.kashyap@bennett.edu.in', 16101114, (SELECT id FROM teams WHERE name = 'Media/Liberal Arts'), NULL, 1, 38),
  (39, 'Sanjay Rawat', 'c-sanjay.rawat@bennett.edu.in', 16101117, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 39),
  (40, 'Deepali Yadav', 'c-deepali.yadav@bennett.edu.in', 16101699, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 40),
  (41, 'Supriya Singh', 'c-supriya.singh@bennett.edu.in', 16101702, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 41),
  (42, 'Shivansh Tyagi', 'c-shivansh.tyagi@bennett.edu.in', 16101703, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 42),
  (43, 'Sukriti Shukla', 'c-sukriti.shukla@bennett.edu.in', 16101709, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 43),
  (44, 'Sneha Gupta', 'c-sneha.gupta@bennett.edu.in', 16101712, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 44),
  (45, 'Roshan Singh', 'c-roshan.singh@bennett.edu.in', 16101714, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 45),
  (46, 'Vikash Pal', 'c-vikas.pal@bennett.edu.in', 16101715, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 46),
  (47, 'Sneha Kumari', 'c-sneha.kumarri@bennett.edu.in', 16101721, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 47),
  (48, 'Yash Chaudhary', 'c-yash.chaudhary@bennett.edu.in', 16101727, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 48),
  (49, 'Tanya Yadav', 'c-tanya.yadav@bennett.edu.in', 16101730, (SELECT id FROM teams WHERE name = 'Management'), NULL, 1, 49),
  (50, 'Ishika Singh', 'c-ishika.singh@bennett.edu.in', 16101732, (SELECT id FROM teams WHERE name = 'Media/Liberal Arts'), NULL, 1, 50),
  (51, 'Sakshi Singh', 'c-sakshi.singh@bennett.edu.in', 16101735, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 51),
  (52, 'Mihir Kumar', 'cc-mihir.kumar@bennett.edu.in', 16101737, (SELECT id FROM teams WHERE name = 'Law'), NULL, 1, 52),
  (53, 'Sakaar Srivastava', 'c-sakaar.srivastava@bennett.edu.in', 16102196, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 53),
  (54, 'Palki Mittal', 'c-palki.mittal@bennett.edu.in', 16102197, (SELECT id FROM teams WHERE name = 'Media/Liberal Arts'), NULL, 1, 54),
  (55, 'Akansha sanger', 'c-akanksha.sengar@bennett.edu.in', 16104477, (SELECT id FROM teams WHERE name = 'Inbound'), NULL, 1, 55),
  (56, 'Bhumika Kohli', 'c-bhumika.kohli@bennett.edu.in', 16104478, (SELECT id FROM teams WHERE name = 'Engineering'), NULL, 1, 56)
;
