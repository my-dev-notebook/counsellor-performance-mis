-- Drops every application table AND wrangler's migration ledger, so the next
-- `wrangler d1 migrations apply` re-runs 0000 onwards from scratch. Needed
-- whenever migrations/0000_init_schema.sql is rewritten in place (the seed
-- migrations are rewritten, not appended, in this project). Destructive.
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS user_changes;
DROP TABLE IF EXISTS admissions;
DROP TABLE IF EXISTS counsellor_perf_monthly;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS agencies;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS d1_migrations;
