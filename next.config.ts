import type { NextConfig } from "next";

const nextConfig: NextConfig = {/* config options here */};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// `environment: "staging"` picks up the D1 binding from wrangler.jsonc's
// `env.staging` block. No `remoteBindings` flag, so this stays a local,
// disposable SQLite emulation (persisted under .wrangler/) — not the real
// remote staging database. Run `pnpm db:migrate:local` to set up its schema.
initOpenNextCloudflareForDev({ environment: "staging" });
