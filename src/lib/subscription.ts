import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCheckoutOffer, isMissingColumnError } from "@/lib/checkout-store";
import type { FeatureId } from "@/lib/features";
import { FEATURE_IDS, hasUnlockedFeature, resolvePlanFeatures } from "@/lib/features";
import type { HrGuidancePlan, RoadmapPlan } from "@/types/career";

export { OFFER_DURATION_MS, resolveSpinDiscount, SPIN_JACKPOT_DISCOUNT } from "@/lib/checkout-constants";

export type UserProfile = {
  user_id: string;
  email: string;
  full_name: string | null;
  subscription_status: string;
  subscription_plan: string | null;
  discount_percent: number;
  offer_expires_at: string | null;
  paid_at: string | null;
};

const PROFILE_SELECT_FULL =
  "user_id, email, full_name, subscription_status, subscription_plan, discount_percent, offer_expires_at, paid_at";
const PROFILE_SELECT_PAYMENT =
  "user_id, email, full_name, subscription_status, subscription_plan, paid_at";
const PROFILE_SELECT_BASIC = "user_id, email, full_name";

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

  for (const select of [PROFILE_SELECT_FULL, PROFILE_SELECT_PAYMENT, PROFILE_SELECT_BASIC]) {
    const result = await supabase.from("profiles").select(select).eq("user_id", userId).maybeSingle();
    data = result.data as Record<string, unknown> | null;
    error = result.error;
    if (!error) break;
    if (!isMissingColumnError(error.message)) break;
  }

  if (error || !data) return null;

  const offer = await getCheckoutOffer(userId);

  return {
    user_id: String(data.user_id),
    email: String(data.email ?? ""),
    full_name: (data.full_name as string | null) ?? null,
    subscription_status: (data.subscription_status as string | undefined) ?? "free",
    subscription_plan: (data.subscription_plan as string | null) ?? null,
    discount_percent: (data.discount_percent as number | undefined) ?? offer.discountPercent,
    offer_expires_at: (data.offer_expires_at as string | null | undefined) ?? offer.offerExpiresAt,
    paid_at: (data.paid_at as string | null) ?? null,
  };
}

export function isUserPaid(profile: UserProfile | null): boolean {
  return profile?.subscription_status === "active";
}

/** True when user has an active paid subscription with full bundle plan. */
export function hasFullBundle(profile: UserProfile | null): boolean {
  if (!profile || profile.subscription_status !== "active") return false;
  return resolvePlanFeatures(profile.subscription_plan).length >= FEATURE_IDS.length;
}

export function hasFeature(profile: UserProfile | null, feature: FeatureId): boolean {
  if (profile?.subscription_status !== "active") return false;
  return hasUnlockedFeature(profile.subscription_plan, feature);
}

export function getPlanFeatures(profile: UserProfile | null): FeatureId[] {
  if (!profile || profile.subscription_status !== "active") return [];
  return resolvePlanFeatures(profile.subscription_plan);
}

const PREVIEW_ITEMS = 2;

export function partialRoadmap(roadmap: RoadmapPlan): RoadmapPlan {
  const slice = (items: string[]) => items.slice(0, PREVIEW_ITEMS);
  return {
    headline: roadmap.headline,
    primaryFocus: roadmap.primaryFocus,
    bridgeNote: roadmap.bridgeNote,
    technicalSkills: slice(roadmap.technicalSkills),
    communicationPlan: slice(roadmap.communicationPlan),
    hrPreparation: [],
    jobApplicationStrategy: [],
    resumeApproach: [],
  };
}

export function partialGuidance(guidance: HrGuidancePlan): HrGuidancePlan {
  return {
    headline: guidance.headline,
    roleFocus: guidance.roleFocus,
    bridgeNote: guidance.bridgeNote,
    hrCommunicationTips: guidance.hrCommunicationTips.slice(0, PREVIEW_ITEMS),
    recruiterApproachScripts: [],
    commonHrQuestions: guidance.commonHrQuestions.slice(0, 1),
    realWorldScenarios: [],
  };
}
