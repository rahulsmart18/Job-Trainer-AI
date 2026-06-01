import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { formatAiContext, getAiUserContext } from "@/lib/ai/context";
import { chatCompletionJson } from "@/lib/ai/client";
import { saveMockInterviewSession } from "@/lib/mock-interview-store";
import { getUserProfileWithSync } from "@/lib/trial";
import { canStartMockInterview, countMockSessions } from "@/lib/usage-limits";
import { isJobSwitchProfile } from "@/lib/experience-segment";
import type { MockInterviewTurn } from "@/types/communication";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clampNumber, cleanString, LIMITS, parseJsonBody } from "@/lib/validation";

const QUESTIONS_FRESHER = [
  "Tell me about yourself and why you are interested in this role.",
  "Why should we hire you over other freshers?",
  "Describe a challenge you faced and how you handled it.",
];

const QUESTIONS_EXPERIENCED = [
  "Tell me about yourself and your recent work experience.",
  "Why are you looking to leave your current role?",
  "Describe a project where you delivered measurable impact.",
];

type Body = {
  action?: "start" | "answer";
  answer?: string;
  turn?: number;
};

function parseTurn(raw: string, fallback: string): MockInterviewTurn {
  try {
    return JSON.parse(raw) as MockInterviewTurn;
  } catch {
    return { question: fallback };
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = enforceRateLimit(request, "mock-interview", session.user.id, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const parsed = await parseJsonBody<Body>(request);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid or oversized request body." }, { status: 400 });
  }
  const body: Body = {
    action: parsed.action === "start" || parsed.action === "answer" ? parsed.action : undefined,
    answer: cleanString(parsed.answer, LIMITS.longText),
    turn: clampNumber(parsed.turn, 1, 3) ?? 1,
  };
  const ctx = await getAiUserContext(session.user.id);
  const profileBlock = formatAiContext(ctx);
  const jobSwitch = isJobSwitchProfile(ctx);
  const questions = jobSwitch ? QUESTIONS_EXPERIENCED : QUESTIONS_FRESHER;
  const audienceLabel = jobSwitch ? "early-career professional (1–2+ years) switching jobs" : "fresher";

  if (body.action === "start") {
    const profile = await getUserProfileWithSync(session.user.id);
    const mockCount = await countMockSessions(session.user.id);
    const access = await canStartMockInterview(session.user.id, profile, mockCount);

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.message,
          locked: true,
          upgradeUrl: "/checkout?plan=interview_pack",
        },
        { status: 402 },
      );
    }

    const result = await chatCompletionJson([
      {
        role: "system",
        content: `You are an HR interviewer for ${audienceLabel} in India. Ask ONE interview question tailored to the candidate profile.
Return JSON: { "question": string }`,
      },
      { role: "user", content: profileBlock },
    ]);

    if (result.source === "ai" && result.content) {
      const parsed = parseTurn(result.content, questions[0]);
      return NextResponse.json({ question: parsed.question || questions[0] });
    }

    return NextResponse.json({ question: questions[0] });
  }

  if (body.action === "answer") {
    const turn = body.turn ?? 1;
    const answer = body.answer?.trim() ?? "";

    if (!answer) {
      return NextResponse.json({ error: "Answer is required." }, { status: 400 });
    }

    const isLast = turn >= 3;

    const result = await chatCompletionJson([
      {
        role: "system",
        content: `You are an HR interview coach. Evaluate the candidate's answer for a ${audienceLabel} ${ctx.interestedRole || "IT"} role.
Return JSON:
{
  "feedback": string,
  "score": number (1-10),
  "improvementTip": string,
  ${isLast ? '"done": true, "summary": string' : '"done": false, "question": string (next HR question)'}
}
Be specific, encouraging, and interview-ready.`,
      },
      {
        role: "user",
        content: `${profileBlock}\n\nInterview question ${turn}.\nCandidate answer:\n${answer}`,
      },
    ]);

    if (result.source === "ai" && result.content) {
      const parsed = parseTurn(result.content, questions[0]);
      const score = parsed.score ?? 6;
      const summary =
        parsed.summary ??
        "You completed 3 rounds. Focus on shorter answers with STAR structure and practice daily.";

      if (isLast) {
        await saveMockInterviewSession(session.user.id, score, summary);
      }

      return NextResponse.json({
        feedback: parsed.feedback ?? "Good effort. Add measurable outcomes to strengthen your answer.",
        score,
        improvementTip: parsed.improvementTip ?? "Use STAR: Situation, Task, Action, Result.",
        done: isLast,
        summary: isLast ? summary : undefined,
        question: isLast ? undefined : parsed.question ?? questions[turn] ?? questions[0],
      });
    }

    const fallbackSummary =
      "You completed 3 rounds. Focus on shorter answers with STAR structure and practice daily.";

    if (isLast) {
      await saveMockInterviewSession(session.user.id, 6, fallbackSummary);
    }

    return NextResponse.json({
      feedback: "Solid start. Add a concrete example with measurable impact.",
      score: 6,
      improvementTip: "Keep answers under 90 seconds with one clear example.",
      done: isLast,
      summary: isLast
        ? "You completed 3 rounds. Focus on shorter answers with STAR structure and practice daily."
        : undefined,
      question: isLast ? undefined : questions[turn] ?? questions[0],
    });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}
