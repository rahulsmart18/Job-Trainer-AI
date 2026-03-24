import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  // Guard against accidentally using anon key as service role key.
  if (serviceRoleKey.startsWith("eyJ")) {
    try {
      const [, payload] = serviceRoleKey.split(".");
      const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { role?: string };
      if (json.role !== "service_role") {
        return null;
      }
    } catch {
      return null;
    }
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
