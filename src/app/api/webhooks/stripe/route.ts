import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Stripe webhook is not configured yet. Set PAYMENT_PROVIDER=stripe and STRIPE_WEBHOOK_SECRET." },
    { status: 501 },
  );
}
