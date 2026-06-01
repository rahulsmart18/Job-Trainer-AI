import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hasPremiumAccess, loadTrialRecord } from "@/lib/trial";
import { hasUnlockedFeature, resolvePlanFeatures, type FeatureId } from "@/lib/features";
import type { UserProfile } from "@/lib/subscription";

export const FREE_COMM_LIMIT = 2;
export const FREE_MOCK_LIMIT = 1;

export type FeatureUsage = {
  used: number;
  limit: number;
  remaining: number;
  unlimited: boolean;
};

export type UsageSnapshot = {
  communication: FeatureUsage;
  mockInterview: FeatureUsage;
  unlockedFeatures: FeatureId[];
  hasAnyPaid: boolean;
};

function usageRow(used: number, limit: number, unlimited: boolean): FeatureUsage {
  if (unlimited) {
    return { used, limit: -1, remaining: -1, unlimited: true };
  }
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    unlimited: false,
  };
}

export async function countAnalyses(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("analyses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

export async function countMockSessions(userId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("mock_interviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}

export function isProfileActive(profile: UserProfile | null): boolean {
  return profile?.subscription_status === "active";
}

export async function hasPremiumFeatureAccess(
  userId: string,
  profile: UserProfile | null,
  feature: FeatureId,
): Promise<boolean> {
  const trial = await loadTrialRecord(userId);
  if (hasPremiumAccess(profile, trial)) {
    if (profile?.subscription_status === "trialing") return true;
    return hasUnlockedFeature(profile?.subscription_plan, feature);
  }
  return false;
}

export function hasFeatureAccess(profile: UserProfile | null, feature: FeatureId): boolean {
  if (profile?.subscription_status !== "active") return false;
  return hasUnlockedFeature(profile.subscription_plan, feature);
}

export function getUnlockedFeatures(profile: UserProfile | null): FeatureId[] {
  if (!profile || profile.subscription_status !== "active") return [];
  return resolvePlanFeatures(profile.subscription_plan);
}

export async function canUseCommunication(
  userId: string,
  profile: UserProfile | null,
  analysisCount: number,
) {
  if (await hasPremiumFeatureAccess(userId, profile, "communication")) {
    return { allowed: true, remaining: -1, message: "" };
  }
  const remaining = FREE_COMM_LIMIT - analysisCount;
  if (remaining > 0) {
    return { allowed: true, remaining, message: "" };
  }
  return {
    allowed: false,
    remaining: 0,
    message: `Free limit reached. Start a 7-day trial with auto-pay enabled for unlimited access, or buy a plan.`,
  };
}

export async function canStartMockInterview(
  userId: string,
  profile: UserProfile | null,
  mockCount: number,
) {
  if (await hasPremiumFeatureAccess(userId, profile, "mock_interview")) {
    return { allowed: true, remaining: -1, message: "" };
  }
  const remaining = FREE_MOCK_LIMIT - mockCount;
  if (remaining > 0) {
    return { allowed: true, remaining, message: "" };
  }
  return {
    allowed: false,
    remaining: 0,
    message: `Free limit reached. Enable auto-pay to start your 7-day full trial, or buy Interview Pack.`,
  };
}

export async function getUsageSnapshot(userId: string, profile: UserProfile | null): Promise<UsageSnapshot> {
  const [analysisCount, mockCount] = await Promise.all([
    countAnalyses(userId),
    countMockSessions(userId),
  ]);

  const trial = await loadTrialRecord(userId);
  const premium = hasPremiumAccess(profile, trial);
  const commUnlimited = premium || hasFeatureAccess(profile, "communication");
  const mockUnlimited = premium || hasFeatureAccess(profile, "mock_interview");

  return {
    communication: usageRow(analysisCount, FREE_COMM_LIMIT, commUnlimited),
    mockInterview: usageRow(mockCount, FREE_MOCK_LIMIT, mockUnlimited),
    unlockedFeatures: getUnlockedFeatures(profile),
    hasAnyPaid: premium,
  };
}
