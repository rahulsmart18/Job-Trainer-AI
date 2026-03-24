import { NextResponse } from "next/server";
import type { HrGuidancePlan } from "@/types/career";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const FALLBACK_GUIDANCE: HrGuidancePlan = {
  hrCommunicationTips: [
    "Greet HR confidently and introduce yourself in 20-30 seconds.",
    "Keep answers concise and positive; avoid negative phrasing.",
    "Ask clear follow-up questions about role and growth path.",
  ],
  recruiterApproachScripts: [
    "Hi [Name], I am a fresher interested in [Role]. I built [Project]. Can I share my resume?",
    "Thank you for connecting. I would appreciate any opening recommendations for [Role].",
    "Following up on my earlier message regarding [Role]. Happy to provide more details.",
  ],
  commonHrQuestions: [
    "Q: Tell me about yourself. A: Give a concise intro, skills, project proof, and role fit in 60-90 seconds.",
    "Q: Why should we hire you? A: Connect your strengths to role outcomes and mention measurable project impact.",
    "Q: Where do you see yourself in 3 years? A: Share growth plan aligned with role and company goals.",
  ],
  realWorldScenarios: [
    "If asked about weaknesses, share one and explain your improvement action.",
    "If asked salary expectation, give a market-aligned range and emphasize learning.",
    "If rejected, thank them and ask what skill to improve for future roles.",
  ],
};

type GuidanceInput = {
  interestedRole?: string;
  targetDomain?: string;
  skillLevel?: string;
  careerPreference?: string;
};

function buildPersonalizedFallback(input: GuidanceInput): HrGuidancePlan {
  const role = input.interestedRole?.trim() || "your target role";
  const domain = input.targetDomain?.trim() || "your selected domain";
  const level = input.skillLevel?.trim() || "current level";
  const preference = input.careerPreference?.trim() || "your career preference";

  return {
    hrCommunicationTips: [
      `Start with a confident 30-second intro linking your ${domain} interest to ${role}.`,
      `At ${level} level, keep answers short: point -> example -> result.`,
      `Frame your journey and ${preference} decision positively with clear intent.`,
    ],
    recruiterApproachScripts: [
      `Hi [Name], I am targeting ${role} roles in ${domain}. I built [Project]. May I share my resume?`,
      `Hello [Name], I am actively applying for ${domain} opportunities and would value any suitable opening updates.`,
      `Following up regarding ${role} roles. I can share portfolio links and availability immediately.`,
    ],
    commonHrQuestions: [
      `Q: Why ${role}? A: Explain your domain motivation, skills built, and project outcomes.`,
      "Q: Why should we hire you? A: Match your strengths with role responsibilities and measurable impact.",
      "Q: Are you open to learning new tools? A: Confirm flexibility with examples of quick learning.",
    ],
    realWorldScenarios: [
      "If HR challenges your background, connect transferable strengths to role requirements.",
      "If asked salary expectations, provide a realistic band and emphasize growth-first mindset.",
      "If rejected, ask for feedback and convert it into a 30-day improvement plan.",
    ],
  };
}

function parseGuidance(raw: string): HrGuidancePlan {
  try {
    const parsed = JSON.parse(raw) as Partial<HrGuidancePlan>;
    return {
      hrCommunicationTips: Array.isArray(parsed.hrCommunicationTips) ? parsed.hrCommunicationTips.map(String) : [],
      recruiterApproachScripts: Array.isArray(parsed.recruiterApproachScripts)
        ? parsed.recruiterApproachScripts.map(String)
        : [],
      commonHrQuestions: Array.isArray(parsed.commonHrQuestions) ? parsed.commonHrQuestions.map(String) : [],
      realWorldScenarios: Array.isArray(parsed.realWorldScenarios) ? parsed.realWorldScenarios.map(String) : [],
    };
  } catch {
    return FALLBACK_GUIDANCE;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    const usingOpenRouter = Boolean(openRouterKey);

    const body = (await request.json()) as GuidanceInput;
    const fallback = buildPersonalizedFallback(body);

    const prompt = `You are an HR coach.
Create practical HR interaction guidance for freshers.
Return valid JSON:
{
  "hrCommunicationTips": string[],
  "recruiterApproachScripts": string[],
  "commonHrQuestions": string[],
  "realWorldScenarios": string[]
}
Each list should contain 4-6 items and be direct and interview-ready.`;

    const context = `Interested role: ${body.interestedRole ?? "Any role"}
Target domain: ${body.targetDomain ?? "General"}
Skill level: ${body.skillLevel ?? "Not specified"}
Career preference: ${body.careerPreference ?? "Not specified"}`;

    let guidance = fallback;
    let source = "fallback-no-key";
    if (openRouterKey || openAiKey) {
      const response = await fetch(
        usingOpenRouter ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${usingOpenRouter ? openRouterKey : openAiKey}`,
            ...(usingOpenRouter ? { "HTTP-Referer": "http://localhost:3000", "X-Title": "Job Trainer AI" } : {}),
          },
          body: JSON.stringify({
            model: usingOpenRouter ? "meta-llama/llama-3.3-70b-instruct:free" : "gpt-4o-mini",
            temperature: 0.3,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: context },
            ],
          }),
        },
      );

      if (response.ok) {
        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = json.choices?.[0]?.message?.content ?? "";
        guidance = parseGuidance(content);
        source = "ai";
      } else {
        source = "fallback-provider-error";
      }
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
    return NextResponse.json({ guidance, source });
  } catch {
    return NextResponse.json({ guidance: FALLBACK_GUIDANCE, source: "fallback-server-error" });
  }
}
