/**
 * Wipe app data for local development (keeps profiles + login rows).
 *
 * Clears: analyses, roadmaps, guidance, mock_interviews
 * Resets: subscription, trial, payment, checkout offer fields on profiles
 *
 * Run: npm run db:reset
 * Full wipe (delete all profiles too): npm run db:reset -- --full
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

const fullWipe = process.argv.includes("--full");

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("\n❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CHILD_TABLES = ["analyses", "roadmaps", "guidance", "mock_interviews"];

async function deleteAllFrom(table) {
  const { error, count } = await supabase.from(table).delete({ count: "exact" }).neq("id", 0);
  if (error) {
    // mock_interviews / guidance may use bigint id — fallback delete all rows
    const fallback = await supabase.from(table).delete({ count: "exact" }).gte("id", 0);
    if (fallback.error) throw new Error(`${table}: ${fallback.error.message}`);
    return fallback.count ?? 0;
  }
  return count ?? 0;
}

async function resetProfiles() {
  const { data: profiles, error: listError } = await supabase.from("profiles").select("user_id");
  if (listError) throw new Error(`profiles list: ${listError.message}`);
  if (!profiles?.length) return 0;

  let updated = 0;
  for (const row of profiles) {
    const payload = {
      subscription_status: "free",
      subscription_plan: null,
      paid_at: null,
      payment_provider: null,
      payment_reference: null,
      discount_percent: 0,
      offer_expires_at: null,
      trial_started_at: null,
      trial_ends_at: null,
      auto_pay_enabled: false,
      trial_cancelled_at: null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("profiles").update(payload).eq("user_id", row.user_id);
    if (error && !/column|schema cache/i.test(error.message)) {
      // Older schema without trial columns — retry without them
      const minimal = {
        subscription_status: "free",
        subscription_plan: null,
        paid_at: null,
        payment_provider: null,
        payment_reference: null,
        discount_percent: 0,
        offer_expires_at: null,
        updated_at: new Date().toISOString(),
      };
      const retry = await supabase.from("profiles").update(minimal).eq("user_id", row.user_id);
      if (retry.error) throw new Error(`profiles update: ${retry.error.message}`);
    } else if (error) {
      throw new Error(`profiles update: ${error.message}`);
    }
    updated += 1;
  }
  return updated;
}

async function deleteAllProfiles() {
  const { error, count } = await supabase.from("profiles").delete({ count: "exact" }).neq("user_id", "");
  if (error) throw new Error(`profiles delete: ${error.message}`);
  return count ?? 0;
}

console.log("\n🧹 Job Trainer — dev data reset\n");

try {
  for (const table of CHILD_TABLES) {
    const n = await deleteAllFrom(table);
    console.log(`✅ Cleared ${table} (${n ?? "all"} rows)`);
  }

  if (fullWipe) {
    const n = await deleteAllProfiles();
    console.log(`✅ Deleted all profiles (${n ?? "all"} rows)`);
    console.log("\n⚠️  Full wipe: sign in again and redo onboarding.\n");
  } else {
    const n = await resetProfiles();
    console.log(`✅ Reset subscription/trial on ${n} profile(s)`);
    console.log("\n💡 Profiles + onboarding kept. Clear browser localStorage for journey progress:");
    console.log("   DevTools → Application → Local Storage → remove keys starting with journey-\n");
  }

  console.log("Done.\n");
} catch (err) {
  console.error(`\n❌ Reset failed: ${err.message}\n`);
  process.exit(1);
}
