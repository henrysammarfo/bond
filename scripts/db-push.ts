#!/usr/bin/env bun
/**
 * Apply schema via drizzle-kit push when DATABASE_URL is set.
 * Usage: bun run db:push
 */
import { config } from "dotenv";
import { spawnSync } from "node:child_process";

config({ path: ".env.local", override: true });
config({ override: false }); // fallback .env without clobbering

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for db:push");
  process.exit(1);
}

const result = spawnSync("bunx", ["drizzle-kit", "push"], {
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);
