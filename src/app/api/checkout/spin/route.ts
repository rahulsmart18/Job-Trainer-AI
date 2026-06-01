import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getCheckoutOffer, saveCheckoutOffer } from "@/lib/checkout-store";
import { OFFER_DURATION_MS, resolveSpinDiscount } from "@/lib/checkout-constants";
import { finalPrice, formatInr } from "@/lib/payments/plans";
import { planById } from "@/lib/features";
import { devModeFromRequest } from "@/lib/dev-access";
import { getUserProfile, hasFullBundle } from "@/lib/subscription";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = enforceRateLimit(request, "checkout-spin", session.user.id, { limit: 6, windowMs: 60_000 });
  if (limited) return limited;

  const profile = await getUserProfile(session.user.id);
  const devMode = devModeFromRequest(request);
  if (hasFullBundle(profile) && !devMode) {
    return NextResponse.json({ error: "Already subscribed." }, { status: 400 });
  }

  const offer = await getCheckoutOffer(session.user.id);
  const discountPercent = offer.discountPercent;
  const existingDiscount = discountPercent > 0 ? discountPercent : resolveSpinDiscount();
  let offerExpiresAt = offer.offerExpiresAt;

  if (discountPercent === 0) {
    offerExpiresAt = new Date(Date.now() + OFFER_DURATION_MS).toISOString();
    const saved = await saveCheckoutOffer(session.user.id, existingDiscount, offerExpiresAt);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error ?? "Failed to save spin result." }, { status: 400 });
    }
  }

  const price = finalPrice(planById("full_bundle").basePrice, existingDiscount);

  return NextResponse.json({
    discountPercent: existingDiscount,
    formattedFinal: formatInr(price),
    offerExpiresAt,
    alreadySpun: discountPercent > 0,
  });
}
