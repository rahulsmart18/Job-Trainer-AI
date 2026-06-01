import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getPaymentProvider } from "@/lib/payments/provider";

type ConfirmBody = {
  sessionId?: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ConfirmBody;
  if (!body.sessionId) {
    return NextResponse.json({ error: "Missing checkout session." }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const result = await provider.confirmCheckout(body.sessionId, session.user.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Payment failed." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, redirectUrl: "/checkout/success" });
}
