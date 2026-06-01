/**
 * Applies pending profile column migrations via direct Postgres (DDL).
 *
 * Requires ONE of in .env.local:
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-....pooler.supabase.com:6543/postgres
 *   DATABASE_URL=postgresql://...
 *   SUPABASE_DB_PASSWORD=[your database password]  (uses SUPABASE_URL project ref)
 *
 * Get password: Supabase Dashboard → Project Settings → Database → Database password
 *
 * Run: npm run db:migrate
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function resolveDatabaseUrl() {
  if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const supabaseUrl = process.env.SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!supabaseUrl || !password) return null;

  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
}

const MIGRATION_STATEMENTS = [
  "alter table public.profiles add column if not exists work_experience text;",
];

loadEnvLocal();

const dbUrl = resolveDatabaseUrl();

if (!dbUrl) {
  const ref = process.env.SUPABASE_URL
    ? new URL(process.env.SUPABASE_URL).hostname.split(".")[0]
    : "YOUR_PROJECT_REF";
  const sql = MIGRATION_STATEMENTS.join("\n");
  console.error("\n❌ Cannot connect to Postgres — no SUPABASE_DB_PASSWORD or SUPABASE_DB_URL in .env.local.\n");
  console.error("Option A — SQL Editor (no password needed):");
  console.error(`  https://supabase.com/dashboard/project/${ref}/sql/new\n`);
  console.error("  Paste and run:\n");
  console.error(`  ${sql}\n`);
  console.error("Option B — add to .env.local then re-run npm run db:migrate:");
  console.error("  SUPABASE_DB_PASSWORD=[Database password from Settings → Database]\n");
  // #region agent log
  try {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(
      "debug-5a9832.log",
      `${JSON.stringify({
        sessionId: "5a9832",
        hypothesisId: "H1",
        location: "db-migrate.mjs",
        message: "missing db credentials",
        data: { hasSupabaseUrl: Boolean(process.env.SUPABASE_URL), hasDbPassword: false, hasDbUrl: false },
        timestamp: Date.now(),
      })}\n`,
    );
  } catch {
    /* ignore */
  }
  // #endregion
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

console.log("\n🔧 Applying database migrations...\n");

try {
  await client.connect();
  for (const sql of MIGRATION_STATEMENTS) {
    await client.query(sql);
    console.log(`✅ ${sql.trim()}`);
  }
  console.log("\n✅ Migration complete. Run: npm run db:check\n");
} catch (err) {
  console.error("\n❌ Migration failed:", err instanceof Error ? err.message : err);
  console.error("\nTip: Use the Session pooler URI from Supabase → Connect → OR paste migrate-existing.sql in SQL Editor.\n");
  process.exit(1);
} finally {
  await client.end();
}
