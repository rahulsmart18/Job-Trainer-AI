import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { cancelTrialWithinPeriod, getTrialStatusForUser, startTrialWithAutoPay } from "@/lib/trial";
import { isCheckoutPlanId } from "@/lib/features";
import { enforceRateLimit } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/validation";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getTrialStatusForUser(session.user.id);
  return NextResponse.json({ trial: status });
}

type StartBody = {
  acceptAutoPay?: boolean;
  planId?: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = enforceRateLimit(request, "trial-start", session.user.id, { limit: 8, windowMs: 60_000 });
  if (limited) return limited;

  const body = (await parseJsonBody<StartBody>(request)) ?? {};

  if (!body.acceptAutoPay) {
    return NextResponse.json(
      {
        error:
          "You must enable auto-pay to start the 7-day trial. Without it, only limited free tools are available.",
      },
      { status: 400 },
    );
  }

  const planId = body.planId && isCheckoutPlanId(body.planId) ? body.planId : "full_bundle";
  const result = await startTrialWithAutoPay(session.user.id, planId);

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not start trial." }, { status: 400 });
  }

  const status = await getTrialStatusForUser(session.user.id);
  return NextResponse.json({
    ok: true,
    trialEndsAt: result.trialEndsAt,
    trial: status,
  });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = enforceRateLimit(request, "trial-cancel", session.user.id, { limit: 8, windowMs: 60_000 });
  if (limited) return limited;

  const result = await cancelTrialWithinPeriod(session.user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not cancel trial." }, { status: 400 });
  }

  const status = await getTrialStatusForUser(session.user.id);
  return NextResponse.json({ ok: true, trial: status });
}
