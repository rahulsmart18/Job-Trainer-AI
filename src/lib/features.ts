export const FEATURE_IDS = ["roadmap", "communication", "mock_interview", "hr_scripts"] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

export type PlanId = "roadmap" | "interview_pack" | "full_bundle" | "full_access";

export type FeatureMeta = {
  id: FeatureId;
  label: string;
  shortLabel: string;
  description: string;
};

export const FEATURES: Record<FeatureId, FeatureMeta> = {
  roadmap: {
    id: "roadmap",
    label: "Career Roadmap",
    shortLabel: "Roadmap",
    description: "Full skills path, portfolio projects, resume & job hunt strategy",
  },
  communication: {
    id: "communication",
    label: "Communication Coach",
    shortLabel: "Comm. Coach",
    description: "Tell me about yourself — scores, fixes, and practice scripts",
  },
  mock_interview: {
    id: "mock_interview",
    label: "Mock Interview",
    shortLabel: "Mock HR",
    description: "3-round AI HR simulation with instant feedback",
  },
  hr_scripts: {
    id: "hr_scripts",
    label: "HR Scripts",
    shortLabel: "HR Scripts",
    description: "Copy-paste HR answers, recruiter messages & scenarios",
  },
};

export type PlanMeta = {
  id: PlanId;
  name: string;
  tagline: string;
  basePrice: number;
  anchorPrice: number;
  currency: "INR";
  features: FeatureId[];
  highlightStat: string;
  badge?: string;
};

export const PLANS: Record<Exclude<PlanId, "full_access">, PlanMeta> = {
  roadmap: {
    id: "roadmap",
    name: "Career Roadmap",
    tagline: "Skills, projects & application strategy",
    basePrice: 499,
    anchorPrice: 1499,
    currency: "INR",
    features: ["roadmap"],
    highlightStat: "15+ personalized project & skill steps",
  },
  interview_pack: {
    id: "interview_pack",
    name: "Interview Pack",
    tagline: "Mock interviews + HR scripts (2 features)",
    basePrice: 799,
    anchorPrice: 1999,
    currency: "INR",
    features: ["mock_interview", "hr_scripts"],
    highlightStat: "7 HR scripts + unlimited mock rounds",
    badge: "Popular",
  },
  full_bundle: {
    id: "full_bundle",
    name: "Full Bundle",
    tagline: "All 4 features — best value",
    basePrice: 999,
    anchorPrice: 3499,
    currency: "INR",
    features: [...FEATURE_IDS],
    highlightStat: "Save ~40% vs buying separately",
    badge: "Best value",
  },
};

export const CHECKOUT_PLAN_IDS = ["roadmap", "interview_pack", "full_bundle"] as const;

export type CheckoutPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

export function isCheckoutPlanId(id: string): id is CheckoutPlanId {
  return (CHECKOUT_PLAN_IDS as readonly string[]).includes(id);
}

export function resolvePlanFeatures(planId: string | null | undefined): FeatureId[] {
  if (!planId) return [];
  if (planId === "full_access") return [...FEATURE_IDS];
  const plan = PLANS[planId as CheckoutPlanId];
  return plan?.features ?? [];
}

export function hasUnlockedFeature(planId: string | null | undefined, feature: FeatureId): boolean {
  return resolvePlanFeatures(planId).includes(feature);
}

export function planById(planId: CheckoutPlanId): PlanMeta {
  return PLANS[planId];
}

export function featureListForPlan(planId: CheckoutPlanId): FeatureMeta[] {
  return PLANS[planId].features.map((id) => FEATURES[id]);
}

/** Pick a stored plan id that best represents merged feature access. */
export function resolveMergedPlanId(existingPlan: string | null | undefined, newPlanId: string): string {
  const merged = new Set<FeatureId>([
    ...resolvePlanFeatures(existingPlan),
    ...resolvePlanFeatures(newPlanId),
  ]);
  if (merged.size >= FEATURE_IDS.length) return "full_bundle";
  if (merged.size >= 3) return "full_bundle";
  if (merged.has("mock_interview") && merged.has("hr_scripts")) return "interview_pack";
  if (merged.has("roadmap") && merged.size === 1) return "roadmap";
  return newPlanId;
}
