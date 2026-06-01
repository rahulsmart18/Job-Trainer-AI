import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  formatTrialEnd,
  trialEndDate,
  TRIAL_DAYS,
  TRIAL_FULL_PRICE_INR,
  TRIAL_MANDATE_INR,
} from "@/lib/trial-constants";
import {
  clearMemoryTrial,
  getMemoryTrial,
  isMissingColumnError,
  setMemoryTrial,
  type TrialRecord,
} from "@/lib/trial-store";
import type { CheckoutPlanId } from "@/lib/features";
import { getUserProfile, type UserProfile } from "@/lib/subscription";

export type TrialStatus = {
  eligible: boolean;
  isTrialing: boolean;
  hasPremiumAccess: boolean;
  autoPayEnabled: boolean;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  daysRemaining: number;
  cancelled: boolean;
  chargeAfterTrialInr: number;
  mandateInr: number;
  message: string;
};

export type ExtendedProfile = UserProfile & TrialRecord;

const TRIAL_SELECT =
  "subscription_status, subscription_plan, paid_at, trial_started_at, trial_ends_at, auto_pay_enabled, trial_cancelled_at";

function emptyTrial(): TrialRecord {
  return {
    trialStartedAt: null,
    trialEndsAt: null,
    autoPayEnabled: false,
    trialCancelledAt: null,
  };
}

function mergeTrial(userId: string, row: Record<string, unknown> | null): TrialRecord {
  const mem = getMemoryTrial(userId);
  if (!row) return mem ?? emptyTrial();
  return {
    trialStartedAt:
      (row.trial_started_at as string | null) ?? mem?.trialStartedAt ?? null,
    trialEndsAt: (row.trial_ends_at as string | null) ?? mem?.trialEndsAt ?? null,
    autoPayEnabled: Boolean(row.auto_pay_enabled ?? mem?.autoPayEnabled ?? false),
    trialCancelledAt:
      (row.trial_cancelled_at as string | null) ?? mem?.trialCancelledAt ?? null,
  };
}

export async function loadTrialRecord(userId: string): Promise<TrialRecord> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getMemoryTrial(userId) ?? emptyTrial();

  const { data, error } = await supabase
    .from("profiles")
    .select(TRIAL_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (error && isMissingColumnError(error.message)) {
    return getMemoryTrial(userId) ?? emptyTrial();
  }

  return mergeTrial(userId, data as Record<string, unknown> | null);
}

async function persistTrial(userId: string, payload: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const mem = getMemoryTrial(userId) ?? emptyTrial();
    setMemoryTrial(userId, {
      trialStartedAt: (payload.trial_started_at as string) ?? mem.trialStartedAt,
      trialEndsAt: (payload.trial_ends_at as string) ?? mem.trialEndsAt,
      autoPayEnabled: Boolean(payload.auto_pay_enabled ?? mem.autoPayEnabled),
      trialCancelledAt: (payload.trial_cancelled_at as string | null) ?? mem.trialCancelledAt,
    });
    return { ok: true };
  }

  const { error } = await supabase.from("profiles").update(payload).eq("user_id", userId);
  if (error && isMissingColumnError(error.message)) {
    setMemoryTrial(userId, {
      trialStartedAt: String(payload.trial_started_at ?? ""),
      trialEndsAt: String(payload.trial_ends_at ?? ""),
      autoPayEnabled: Boolean(payload.auto_pay_enabled),
      trialCancelledAt: (payload.trial_cancelled_at as string | null) ?? null,
    });
    return { ok: true };
  }
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function isTrialActive(record: TrialRecord, status: string): boolean {
  if (status !== "trialing") return false;
  if (!record.autoPayEnabled) return false;
  if (record.trialCancelledAt) return false;
  if (!record.trialEndsAt) return false;
  return new Date(record.trialEndsAt) > new Date();
}

function daysRemaining(endsAt: string | null): number {
  if (!endsAt) return 0;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

async function loadProfileStatus(userId: string): Promise<{
  subscription_status: string;
  subscription_plan: string | null;
} | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_plan")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    subscription_status: String(data.subscription_status ?? "free"),
    subscription_plan: (data.subscription_plan as string | null) ?? null,
  };
}

/** Expire trial → active paid, or revoke if invalid. Call on read paths. */
export async function syncTrialLifecycle(userId: string): Promise<void> {
  const profile = await loadProfileStatus(userId);
  if (!profile) return;

  const trial = await loadTrialRecord(userId);
  const now = new Date();

  if (profile.subscription_status === "trialing" && trial.trialCancelledAt) {
    await persistTrial(userId, {
      subscription_status: "free",
      auto_pay_enabled: false,
      updated_at: now.toISOString(),
    });
    return;
  }

  if (
    profile.subscription_status === "trialing" &&
    trial.autoPayEnabled &&
    trial.trialEndsAt &&
    new Date(trial.trialEndsAt) <= now &&
    !trial.trialCancelledAt
  ) {
    await persistTrial(userId, {
      subscription_status: "active",
      subscription_plan: profile.subscription_plan ?? "full_bundle",
      paid_at: now.toISOString(),
      payment_provider: "trial_auto",
      payment_reference: `trial_convert_${userId}_${now.getTime()}`,
      updated_at: now.toISOString(),
    });
    clearMemoryTrial(userId);
  }

  if (profile.subscription_status === "trialing" && !trial.autoPayEnabled) {
    await persistTrial(userId, {
      subscription_status: "free",
      updated_at: now.toISOString(),
    });
  }
}

export function hasPremiumAccess(
  profile: UserProfile | null,
  trial: TrialRecord,
): boolean {
  if (!profile) return false;
  if (profile.subscription_status === "active") return true;
  return isTrialActive(trial, profile.subscription_status);
}

export function buildTrialStatus(profile: UserProfile | null, trial: TrialRecord): TrialStatus {
  const trialing = isTrialActive(trial, profile?.subscription_status ?? "free");
  const premium = hasPremiumAccess(profile, trial);
  const cancelled = Boolean(trial.trialCancelledAt);
  const ends = trial.trialEndsAt;
  const days = daysRemaining(ends);

  const alreadyUsed =
    profile?.subscription_status === "active" ||
    profile?.subscription_status === "trialing" ||
    cancelled;

  return {
    eligible: !alreadyUsed && profile?.subscription_status !== "active",
    isTrialing: trialing,
    hasPremiumAccess: premium,
    autoPayEnabled: trial.autoPayEnabled,
    trialEndsAt: ends,
    trialStartedAt: trial.trialStartedAt,
    daysRemaining: days,
    cancelled,
    chargeAfterTrialInr: TRIAL_FULL_PRICE_INR,
    mandateInr: TRIAL_MANDATE_INR,
    message: trialing
      ? `Full access until ${ends ? formatTrialEnd(ends) : "trial end"}. Cancel before then — no ${TRIAL_FULL_PRICE_INR} charge.`
      : premium
        ? "Premium active."
        : `Enable auto-pay (₹${TRIAL_MANDATE_INR} verify now) to unlock ${TRIAL_DAYS}-day full trial. Without it, only limited free tools apply.`,
  };
}

export async function startTrialWithAutoPay(
  userId: string,
  planId: CheckoutPlanId = "full_bundle",
): Promise<{ ok: boolean; error?: string; trialEndsAt?: string }> {
  await syncTrialLifecycle(userId);
  const profile = await getUserProfile(userId);
  const trial = await loadTrialRecord(userId);

  if (hasPremiumAccess(profile, trial)) {
    return { ok: false, error: "You already have full access." };
  }

  if (profile?.subscription_status === "trialing") {
    return { ok: false, error: "Trial already started." };
  }

  const started = new Date();
  const ends = trialEndDate(started);

  const result = await persistTrial(userId, {
    subscription_status: "trialing",
    subscription_plan: planId,
    trial_started_at: started.toISOString(),
    trial_ends_at: ends,
    auto_pay_enabled: true,
    trial_cancelled_at: null,
    payment_provider: "demo_mandate",
    payment_reference: `mandate_${userId}_${started.getTime()}`,
    updated_at: started.toISOString(),
  });

  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, trialEndsAt: ends };
}

export async function cancelTrialWithinPeriod(userId: string): Promise<{ ok: boolean; error?: string }> {
  const profile = await getUserProfile(userId);
  const trial = await loadTrialRecord(userId);

  if (profile?.subscription_status !== "trialing") {
    return { ok: false, error: "No active trial to cancel." };
  }

  if (trial.trialCancelledAt) {
    return { ok: false, error: "Trial already cancelled." };
  }

  const now = new Date().toISOString();
  const result = await persistTrial(userId, {
    subscription_status: "free",
    auto_pay_enabled: false,
    trial_cancelled_at: now,
    updated_at: now,
  });

  clearMemoryTrial(userId);
  return result;
}

export async function getTrialStatusForUser(userId: string): Promise<TrialStatus> {
  await syncTrialLifecycle(userId);
  const profile = await getUserProfile(userId);
  const trial = await loadTrialRecord(userId);
  return buildTrialStatus(profile, trial);
}

export async function getUserProfileWithSync(userId: string): Promise<UserProfile | null> {
  await syncTrialLifecycle(userId);
  return getUserProfile(userId);
}
