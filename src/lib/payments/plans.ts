export {
  PLANS,
  CHECKOUT_PLAN_IDS,
  FEATURES,
  FEATURE_IDS,
  type CheckoutPlanId,
  type FeatureId,
  type PlanId,
  isCheckoutPlanId,
  planById,
  featureListForPlan,
  resolvePlanFeatures,
  hasUnlockedFeature,
} from "@/lib/features";

export function finalPrice(basePrice: number, discountPercent: number): number {
  return Math.max(0, Math.round(basePrice * (1 - discountPercent / 100)));
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** @deprecated Use PLANS.full_bundle — kept for legacy references */
export const LEGACY_FULL_PLAN = "full_access";
