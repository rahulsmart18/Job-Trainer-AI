import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function getOnboardingStatus(userId: string): Promise<{ complete: boolean; paid: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { complete: false, paid: false };

  const full = await supabase
    .from("profiles")
    .select("onboarding_complete, subscription_status, degree")
    .eq("user_id", userId)
    .maybeSingle();

  if (full.error && /column.*does not exist/i.test(full.error.message)) {
    const legacy = await supabase
      .from("profiles")
      .select("degree, subscription_status")
      .eq("user_id", userId)
      .maybeSingle();

    return {
      complete: Boolean(legacy.data?.degree),
      paid: legacy.data?.subscription_status === "active",
    };
  }

  return {
    complete: full.data?.onboarding_complete ?? Boolean(full.data?.degree),
    paid: full.data?.subscription_status === "active",
  };
}
