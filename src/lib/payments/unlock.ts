import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isMissingColumnError } from "@/lib/checkout-store";
import { resolveMergedPlanId } from "@/lib/features";
import { getUserProfile } from "@/lib/subscription";
import type { UnlockMeta } from "./types";

export async function unlockUserSubscription(userId: string, meta: UnlockMeta): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ok: false, error: "Database is not configured." };
  }

  const profile = await getUserProfile(userId);
  const mergedPlanId = resolveMergedPlanId(profile?.subscription_plan, meta.planId);

  const payload: Record<string, unknown> = {
    subscription_status: "active",
    subscription_plan: mergedPlanId,
    paid_at: new Date().toISOString(),
    payment_provider: meta.provider,
    payment_reference: meta.reference,
    updated_at: new Date().toISOString(),
  };

  if (meta.discountPercent !== undefined) {
    payload.discount_percent = meta.discountPercent;
  }

  let { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);

  if (error && isMissingColumnError(error.message) && "discount_percent" in payload) {
    const { discount_percent: _removed, ...withoutDiscount } = payload;
    const retry = await supabase.from("profiles").update(withoutDiscount).eq("user_id", userId);
    error = retry.error;
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
