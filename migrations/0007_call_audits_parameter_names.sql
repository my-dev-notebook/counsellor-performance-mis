-- Migration number: 0007 	 2026-09-15T12:00:00.000Z

-- The eight audit parameters were stored as rating_a..rating_h / reason_a..
-- reason_h, which nobody can read without the label table in
-- src/schemas/call-audit.ts. Name the columns after the parameter instead.
-- RENAME COLUMN rewrites the CHECK constraints and indexes that reference
-- the column, so nothing else needs to change and no data is touched.
--
--   a  Opening of the call                                   -> opening
--   b  Language / Grammar / Sentence construction / Punct.   -> language
--   c  Active listening                                      -> listening
--   d  Politeness                                            -> politeness
--   e  Was correct & complete information provided           -> information
--   f  USP informed                                          -> usp
--   g  Call closure                                          -> closure
--   h  Lead conversion                                       -> conversion
ALTER TABLE call_audits RENAME COLUMN rating_a TO rating_opening;
ALTER TABLE call_audits RENAME COLUMN rating_b TO rating_language;
ALTER TABLE call_audits RENAME COLUMN rating_c TO rating_listening;
ALTER TABLE call_audits RENAME COLUMN rating_d TO rating_politeness;
ALTER TABLE call_audits RENAME COLUMN rating_e TO rating_information;
ALTER TABLE call_audits RENAME COLUMN rating_f TO rating_usp;
ALTER TABLE call_audits RENAME COLUMN rating_g TO rating_closure;
ALTER TABLE call_audits RENAME COLUMN rating_h TO rating_conversion;
ALTER TABLE call_audits RENAME COLUMN reason_a TO reason_opening;
ALTER TABLE call_audits RENAME COLUMN reason_b TO reason_language;
ALTER TABLE call_audits RENAME COLUMN reason_c TO reason_listening;
ALTER TABLE call_audits RENAME COLUMN reason_d TO reason_politeness;
ALTER TABLE call_audits RENAME COLUMN reason_e TO reason_information;
ALTER TABLE call_audits RENAME COLUMN reason_f TO reason_usp;
ALTER TABLE call_audits RENAME COLUMN reason_g TO reason_closure;
ALTER TABLE call_audits RENAME COLUMN reason_h TO reason_conversion;
