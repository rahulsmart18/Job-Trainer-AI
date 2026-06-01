import { NextResponse } from "next/server";
import type { AnalyzeApiResponse, CommunicationAnalysis } from "@/types/communication";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getAiUserContext } from "@/lib/ai/context";
import {
  buildCommunicationUserPrompt,
  buildSmartCommunicationAnalysis,
  COMMUNICATION_SYSTEM_PROMPT,
  parseCommunicationAnalysis,
} from "@/lib/ai/communication-analysis";
import { chatCompletionJson, enrichTextMetrics } from "@/lib/ai/client";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserProfileWithSync } from "@/lib/trial";
import { canUseCommunication, countAnalyses } from "@/lib/usage-limits";
import { enforceRateLimit } from "@/lib/rate-limit";
import { cleanString, LIMITS, parseJsonBody } from "@/lib/validation";

async function saveAnalysis(userId: string, payload: AnalyzeApiResponse) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase.from("analyses").insert({
    user_id: userId,
    extracted_text: payload.extractedText,
    score: payload.analysis.score,
    grammar_mistakes: payload.analysis.grammarMistakes,
    corrected_sentences: payload.analysis.correctedSentences,
    suggestions: payload.analysis.suggestions,
  });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit(request, "analyze", session.user.id, { limit: 12, windowMs: 60_000 });
    if (limited) return limited;

    const body = await parseJsonBody<{ text?: string }>(request);
    if (!body) {
      return NextResponse.json({ error: "Invalid or oversized request body." }, { status: 400 });
    }
    const text = cleanString(body.text, LIMITS.longText);
    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const profile = await getUserProfileWithSync(session.user.id);
    const analysisCount = await countAnalyses(session.user.id);
    const access = await canUseCommunication(session.user.id, profile, analysisCount);

    if (!access.allowed) {
      return NextResponse.json(
        {
          error: access.message,
          locked: true,
          upgradeUrl: "/checkout?plan=full_bundle",
        },
        { status: 402 },
      );
    }

    const metrics = enrichTextMetrics(text);
    const ctx = await getAiUserContext(session.user.id);

    const supabase = getSupabaseAdmin();
    let previousScore: number | null = null;
    if (supabase) {
      const { data } = await supabase
        .from("analyses")
        .select("score")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]) previousScore = Number(data[0].score);
    }

    const smartFallback = buildSmartCommunicationAnalysis(text, ctx, metrics);

    let source: AnalyzeApiResponse["source"] = "smart-coach";
    let analysis: CommunicationAnalysis = smartFallback;

    const result = await chatCompletionJson(
      [
        { role: "system", content: COMMUNICATION_SYSTEM_PROMPT },
        { role: "user", content: buildCommunicationUserPrompt(ctx, text, metrics) },
      ],
      { temperature: 0.4 },
    );

    if (result.source === "ai" && result.content) {
      analysis = parseCommunicationAnalysis(result.content, text, ctx, metrics);
      source = "ai";
    } else if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
      source = "smart-coach";
    } else {
      source = "smart-coach";
    }

    const payload: AnalyzeApiResponse = {
      extractedText: text,
      analysis,
      source,
      previousScore,
    };

    await saveAnalysis(session.user.id, payload);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Unexpected server error while analyzing text." }, { status: 500 });
  }
}
