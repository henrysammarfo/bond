import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Set Neon Postgres connection string in secrets.",
    );
  }
  return url;
}

export function getDb() {
  if (cached) return cached;
  const sql = neon(requireDatabaseUrl());
  cached = drizzle(sql, { schema });
  return cached;
}
