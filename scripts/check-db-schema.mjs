/**
 * Checks Supabase schema from .env.local (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 * Run: npm run db:check
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

const PROFILE_COLUMNS = [
  "city",
  "graduation_year",
  "coding_level",
  "english_level",
  "has_projects",
  "job_search_status",
  "joining_timeline",
  "work_experience",
  "onboarding_complete",
  "subscription_status",
  "discount_percent",
  "offer_expires_at",
  "trial_started_at",
  "trial_ends_at",
  "auto_pay_enabled",
  "trial_cancelled_at",
];

const TABLES = ["profiles", "analyses", "roadmaps", "guidance", "mock_interviews"];

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("\n❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n");
  console.error("Add them, then run this script again.\n");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let hasIssues = false;

console.log("\n🔍 Job Trainer — database schema check\n");

for (const table of TABLES) {
  const { error } = await supabase.from(table).select("*").limit(0);
  if (error) {
    hasIssues = true;
    console.log(`❌ Table "${table}": ${error.message}`);
  } else {
    console.log(`✅ Table "${table}"`);
  }
}

console.log("\n📋 Profile columns:\n");

for (const col of PROFILE_COLUMNS) {
  const { error } = await supabase.from("profiles").select(col).limit(0);
  if (error && /column|schema cache/i.test(error.message)) {
    hasIssues = true;
    console.log(`❌ profiles.${col} — missing`);
  } else if (error) {
    hasIssues = true;
    console.log(`⚠️  profiles.${col} — ${error.message}`);
  } else {
    console.log(`✅ profiles.${col}`);
  }
}

console.log("");
if (hasIssues) {
  console.log("➡️  Fix: npm run db:migrate  (needs SUPABASE_DB_PASSWORD or SUPABASE_DB_URL in .env.local)");
  console.log("    Or: Supabase SQL Editor → paste supabase/migrate-existing.sql → Run");
  console.log("    Then run: npm run db:check\n");
  process.exit(1);
}

console.log("✅ Schema looks good. Onboarding save should work.\n");
