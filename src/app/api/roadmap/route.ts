import { NextResponse } from "next/server";
import type { RoadmapPlan } from "@/types/career";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RoadmapInput = {
  degree?: string;
  skillLevel?: string;
  interestedRole?: string;
  targetDomain?: string;
  careerPreference?: string;
};

function buildFallbackRoadmap(input: RoadmapInput): RoadmapPlan {
  const degree = input.degree?.trim() || "your degree";
  const role = input.interestedRole?.trim() || "your target role";
  const domain = input.targetDomain?.trim() || "your selected domain";
  const level = input.skillLevel?.trim() || "Beginner";
  const preference = input.careerPreference?.trim() || "Switching to IT";

  return {
    technicalSkills: [
      `Build a ${role}-focused roadmap in ${domain} based on ${degree} fundamentals and current ${level} level.`,
      `Create 2 portfolio projects aligned to ${role} (one practical app + one production-style case study).`,
      `Deepen ${domain} tooling, frameworks, and deployment workflow expected in ${role} hiring.`,
      preference === "Same field"
        ? "Map your academic/core-field strengths directly to job requirements and measurable outcomes."
        : "Bridge to IT with fundamentals (Git, APIs, DB, cloud basics) and role-specific practical tasks.",
    ],
    communicationPlan: [
      `Prepare a 60-second pitch: who you are, your ${degree} background, and why ${role} is your focus.`,
      "Practice concise answers using Point -> Example -> Result structure.",
      "Record mock answers daily and remove filler words while improving pacing and clarity.",
      "Run weekly mock interviews and refine weak responses based on feedback.",
    ],
    hrPreparation: [
      `Prepare HR-ready answers: 'Why ${role}?', 'Why should we hire you?', and 'Tell me about yourself'.`,
      "Practice STAR stories for teamwork, conflict handling, and ownership.",
      "Prepare salary, joining timeline, relocation, and shift flexibility responses confidently.",
      "Use a polite closing statement and follow-up thank-you message after HR rounds.",
    ],
    jobApplicationStrategy: [
      "Complete your profile on Naukri, LinkedIn, Indeed, and 1-2 niche job boards.",
      `Apply daily to 10-15 ${domain}/${role} relevant roles using tailored resume keywords.`,
      "Track applications in a simple sheet: company, role, date, status, follow-up date.",
      "Follow up with recruiters after 5-7 days with concise project-focused message.",
    ],
    resumeApproach: [
      `Tailor your resume headline to ${role} with 6-10 matching ATS keywords.`,
      "Show quantified impact in projects (latency reduced, users served, accuracy improved, etc.).",
      "Optimize LinkedIn summary with role-specific skills and project links.",
      "Apply in a structured funnel and send concise recruiter follow-ups every 5-7 days.",
    ],
  };
}

function parseRoadmap(raw: string, fallback: RoadmapPlan): RoadmapPlan {
  try {
    const parsed = JSON.parse(raw) as Partial<RoadmapPlan>;
    const result = {
      technicalSkills: Array.isArray(parsed.technicalSkills) ? parsed.technicalSkills.map(String) : [],
      communicationPlan: Array.isArray(parsed.communicationPlan) ? parsed.communicationPlan.map(String) : [],
      hrPreparation: Array.isArray(parsed.hrPreparation) ? parsed.hrPreparation.map(String) : [],
      jobApplicationStrategy: Array.isArray(parsed.jobApplicationStrategy)
        ? parsed.jobApplicationStrategy.map(String)
        : [],
      resumeApproach: Array.isArray(parsed.resumeApproach) ? parsed.resumeApproach.map(String) : [],
    };
    const hasEnoughContent =
      result.technicalSkills.length >= 2 &&
      result.communicationPlan.length >= 2 &&
      result.hrPreparation.length >= 2 &&
      result.jobApplicationStrategy.length >= 2 &&
      result.resumeApproach.length >= 2;

    return hasEnoughContent ? result : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RoadmapInput;
    const personalizedFallback = buildFallbackRoadmap(body);

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    const usingOpenRouter = Boolean(openRouterKey);

    const prompt = `Generate a personalized fresher job roadmap.
Return valid JSON:
{
  "technicalSkills": string[],
  "communicationPlan": string[],
  "hrPreparation": string[],
  "jobApplicationStrategy": string[],
  "resumeApproach": string[]
}
Each array should contain 4-6 practical action items.
Use the user's exact degree, role, level, and preference context in multiple items.
Avoid generic advice unless customized with user details.`;

    const userInput = `Degree: ${body.degree ?? "Not provided"}
Skill level: ${body.skillLevel ?? "Beginner"}
Interested role: ${body.interestedRole ?? "Any role"}
Target domain: ${body.targetDomain ?? "Frontend"}
Career preference: ${body.careerPreference ?? "Switching to IT"}`;

    let roadmap: RoadmapPlan = personalizedFallback;
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
              { role: "user", content: userInput },
            ],
          }),
        },
      );
      source = "fallback-provider-error";

      if (response.ok) {
        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = json.choices?.[0]?.message?.content ?? "";
        roadmap = parseRoadmap(content, personalizedFallback);
        source = "ai";
      }
    }

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

    return NextResponse.json({ roadmap, source });
  } catch {
    return NextResponse.json({ roadmap: buildFallbackRoadmap({}), source: "fallback-server-error" });
  }
}
