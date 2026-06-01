import { NextResponse } from "next/server";
import type { RoadmapPlan } from "@/types/career";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserProfileWithSync } from "@/lib/trial";
import { partialRoadmap } from "@/lib/subscription";
import { hasPremiumFeatureAccess } from "@/lib/usage-limits";
import { getAiUserContext } from "@/lib/ai/context";
import { chatCompletionJson } from "@/lib/ai/client";
import {
  buildRoadmapUserPrompt,
  buildSmartFallbackRoadmap,
  parseRoadmapResponse,
  ROADMAP_SYSTEM_PROMPT,
  type RoadmapInput,
} from "@/lib/ai/roadmap";
import { enforceRateLimit } from "@/lib/rate-limit";
import { cleanString, LIMITS, parseJsonBody } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit(request, "roadmap", session.user.id, { limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    const raw = await parseJsonBody<RoadmapInput>(request);
    if (!raw) {
      return NextResponse.json({ error: "Invalid or oversized request body." }, { status: 400 });
    }
    const body: RoadmapInput = {
      degree: cleanString(raw.degree, LIMITS.shortText),
      skillLevel: cleanString(raw.skillLevel, LIMITS.shortText),
      interestedRole: cleanString(raw.interestedRole, LIMITS.shortText),
      targetDomain: cleanString(raw.targetDomain, LIMITS.shortText),
      careerPreference: cleanString(raw.careerPreference, LIMITS.mediumText),
    };
    const ctx = await getAiUserContext(session.user.id);
    const personalizedFallback = buildSmartFallbackRoadmap(body, ctx);

    let roadmap: RoadmapPlan = personalizedFallback;
    let source = "fallback-no-key";

    const result = await chatCompletionJson(
      [
        { role: "system", content: ROADMAP_SYSTEM_PROMPT },
        { role: "user", content: buildRoadmapUserPrompt(ctx, body) },
      ],
      { temperature: 0.45 },
    );

    if (result.source === "ai" && result.content) {
      roadmap = parseRoadmapResponse(result.content, personalizedFallback);
      source = "ai";
    } else {
      source = result.source;
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openRouterKey && !openAiKey) source = "fallback-no-key";

    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from("profiles").upsert(
        {
          user_id: session.user.id,
          email: session.user.email,
          degree: body.degree ?? "",
          skill_level: body.skillLevel ?? "",
          interested_role: body.interestedRole ?? "",
          target_domain: body.targetDomain ?? "",
          career_preference: body.careerPreference ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      await supabase.from("roadmaps").insert({
        user_id: session.user.id,
        degree: body.degree ?? "",
        skill_level: body.skillLevel ?? "",
        interested_role: body.interestedRole ?? "",
        target_domain: body.targetDomain ?? "",
        career_preference: body.careerPreference ?? "",
        source,
        technical_skills: roadmap.technicalSkills,
        communication_plan: roadmap.communicationPlan,
        hr_preparation: roadmap.hrPreparation,
        job_application_strategy: roadmap.jobApplicationStrategy,
        resume_approach: roadmap.resumeApproach,
      });
    }

    const profile = await getUserProfileWithSync(session.user.id);
    const fullRoadmap = await hasPremiumFeatureAccess(session.user.id, profile, "roadmap");

    if (!fullRoadmap) {
      return NextResponse.json({
        roadmap: partialRoadmap(roadmap),
        source,
        locked: true,
        upgradeUrl: "/checkout?plan=roadmap",
        projectTeaser:
          "Your step-by-step portfolio project plan is ready — unlock Career Roadmap to see builds matched to your target role.",
      });
    }

    return NextResponse.json({ roadmap, source, locked: false });
  } catch {
    return NextResponse.json({
      roadmap: buildSmartFallbackRoadmap({}),
      source: "fallback-server-error",
      locked: false,
    });
  }
}
