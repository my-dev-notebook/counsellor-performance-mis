import { defineConfig } from "drizzle-kit";

// `out` matches wrangler.jsonc's `migrations_dir` ("migrations") so
// `drizzle-kit generate` and `wrangler d1 migrations apply` share one folder.
export default defineConfig({
    dialect: "sqlite",
    schema: "./src/db/schema.ts",
    out: "./migrations",
});
