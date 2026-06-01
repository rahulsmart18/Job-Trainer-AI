import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserProfileWithSync } from "@/lib/trial";
import { partialGuidance } from "@/lib/subscription";
import { hasPremiumFeatureAccess } from "@/lib/usage-limits";
import { getAiUserContext } from "@/lib/ai/context";
import { chatCompletionJson } from "@/lib/ai/client";
import {
  buildHrUserPrompt,
  buildSmartHrFallback,
  HR_GUIDANCE_SYSTEM_PROMPT,
  parseHrGuidanceResponse,
  type HrGuidanceInput,
} from "@/lib/ai/hr-guidance";
import { enforceRateLimit } from "@/lib/rate-limit";
import { cleanString, LIMITS, parseJsonBody } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit(request, "hr-guidance", session.user.id, { limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    const raw = await parseJsonBody<HrGuidanceInput>(request);
    if (!raw) {
      return NextResponse.json({ error: "Invalid or oversized request body." }, { status: 400 });
    }
    const body: HrGuidanceInput = {
      interestedRole: cleanString(raw.interestedRole, LIMITS.shortText),
      targetDomain: cleanString(raw.targetDomain, LIMITS.shortText),
      skillLevel: cleanString(raw.skillLevel, LIMITS.shortText),
      careerPreference: cleanString(raw.careerPreference, LIMITS.mediumText),
      degree: cleanString(raw.degree, LIMITS.shortText),
    };
    const ctx = await getAiUserContext(session.user.id);
    const fallback = buildSmartHrFallback(
      { ...body, degree: body.degree ?? ctx.degree },
      ctx,
    );

    let guidance = fallback;
    let source = "fallback-no-key";

    const result = await chatCompletionJson(
      [
        { role: "system", content: HR_GUIDANCE_SYSTEM_PROMPT },
        { role: "user", content: buildHrUserPrompt(ctx, { ...body, degree: body.degree ?? ctx.degree }) },
      ],
      { temperature: 0.45 },
    );

    if (result.source === "ai" && result.content) {
      guidance = parseHrGuidanceResponse(result.content, fallback);
      source = "ai";
    } else {
      source = result.source;
    }

    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
      source = "fallback-no-key";
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from("guidance").insert({
        user_id: session.user.id,
        hr_communication_tips: guidance.hrCommunicationTips,
        recruiter_approach_scripts: guidance.recruiterApproachScripts,
        common_hr_questions: guidance.commonHrQuestions,
        real_world_scenarios: guidance.realWorldScenarios,
      });
    }

    const profile = await getUserProfileWithSync(session.user.id);
    const fullHr = await hasPremiumFeatureAccess(session.user.id, profile, "hr_scripts");

    if (!fullHr) {
      return NextResponse.json({
        guidance: partialGuidance(guidance),
        source,
        locked: true,
        upgradeUrl: "/checkout?plan=interview_pack",
      });
    }

    return NextResponse.json({ guidance, source, locked: false });
  } catch {
    return NextResponse.json({
      guidance: buildSmartHrFallback({}),
      source: "fallback-server-error",
      locked: false,
    });
  }
}
