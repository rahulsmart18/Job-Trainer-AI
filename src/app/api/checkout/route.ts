import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getPaymentProvider } from "@/lib/payments/provider";
import { finalPrice, formatInr } from "@/lib/payments/plans";
import {
  CHECKOUT_PLAN_IDS,
  isCheckoutPlanId,
  planById,
  type CheckoutPlanId,
} from "@/lib/features";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { devModeFromRequest } from "@/lib/dev-access";
import { getUserProfile, getPlanFeatures, hasFullBundle } from "@/lib/subscription";

function formatPlanPrice(planId: CheckoutPlanId, discountPercent: number) {
  const plan = planById(planId);
  const final = finalPrice(plan.basePrice, discountPercent);
  return {
    id: plan.id,
    name: plan.name,
    tagline: plan.tagline,
    highlightStat: plan.highlightStat,
    badge: plan.badge ?? null,
    featureCount: plan.features.length,
    features: plan.features,
    anchorPrice: plan.anchorPrice,
    basePrice: plan.basePrice,
    finalPrice: final,
    formattedAnchor: formatInr(plan.anchorPrice),
    formattedBase: formatInr(plan.basePrice),
    formattedFinal: formatInr(final),
    currency: plan.currency,
  };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(session.user.id);
  const devMode = devModeFromRequest(request);
  const discountPercent = profile?.discount_percent ?? 0;
  const paid = hasFullBundle(profile) && !devMode;
  const unlockedFeatures = getPlanFeatures(profile);

  const url = new URL(request.url);
  const suggested = url.searchParams.get("plan");
  const selectedPlanId: CheckoutPlanId =
    suggested && isCheckoutPlanId(suggested) ? suggested : "full_bundle";

  if (!paid) {
    const supabase = getSupabaseAdmin();
    if (supabase && session.user.email && !profile) {
      await supabase.from("profiles").upsert(
        {
          user_id: session.user.id,
          email: session.user.email,
          full_name: session.user.name ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  }

  const plans = CHECKOUT_PLAN_IDS.map((id) => formatPlanPrice(id, discountPercent));
  const selectedPlan = formatPlanPrice(selectedPlanId, discountPercent);

  return NextResponse.json({
    paid,
    devMode,
    unlockedFeatures,
    selectedPlanId,
    selectedPlan,
    plans,
    discountPercent,
    offerExpiresAt: profile?.offer_expires_at ?? null,
    hasSpun: discountPercent > 0,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getUserProfile(session.user.id);
  const devMode = devModeFromRequest(request);
  if (hasFullBundle(profile) && !devMode) {
    return NextResponse.json({ error: "Already subscribed.", redirectUrl: "/dashboard" }, { status: 400 });
  }

  let planId: CheckoutPlanId = "full_bundle";
  try {
    const body = (await request.json()) as { planId?: string };
    if (body.planId && isCheckoutPlanId(body.planId)) {
      planId = body.planId;
    }
  } catch {
    /* default plan */
  }

  const discountPercent = profile?.discount_percent ?? 0;
  const provider = getPaymentProvider();
  const checkout = await provider.createCheckout({
    userId: session.user.id,
    planId,
    discountPercent,
  });

  return NextResponse.json({
    sessionId: checkout.sessionId,
    planId,
    amount: checkout.amount,
    formattedAmount: formatInr(checkout.amount),
    currency: checkout.currency,
  });
}
