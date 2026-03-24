import { NextResponse } from "next/server";
import type { AnalyzeApiResponse, CommunicationAnalysis } from "@/types/communication";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DEFAULT_ANALYSIS: CommunicationAnalysis = {
  score: 6,
  grammarMistakes: ["No AI key configured. This is a local fallback response."],
  correctedSentences: ["Configure OPENAI_API_KEY or OPENROUTER_API_KEY for real analysis."],
  suggestions: [
    "Speak in shorter sentences with clear pauses.",
    "Practice interview responses using STAR format.",
  ],
};

function buildLocalFallbackAnalysis(text: string, reason: string): CommunicationAnalysis {
  const sentenceCount = text.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const score = Math.max(4, Math.min(8, Math.round((wordCount / Math.max(sentenceCount, 1)) * 0.9)));

  return {
    score,
    grammarMistakes: [
      `AI provider unavailable: ${reason}`,
      "Potential filler words and pauses may reduce fluency (manual estimate).",
    ],
    correctedSentences: [
      "Use short, clear sentences with one idea at a time.",
      "Replace filler words (like um/uh) with brief pauses.",
    ],
    suggestions: [
      "Practice 60-second self-introduction daily and record your voice.",
      "Use STAR structure (Situation, Task, Action, Result) for interview answers.",
      "Speak 10-15% slower and emphasize keywords for better clarity.",
    ],
  };
}

function safeJsonParse(raw: string): CommunicationAnalysis {
  try {
    const parsed = JSON.parse(raw) as Partial<CommunicationAnalysis>;
    const score = typeof parsed.score === "number" ? Math.max(0, Math.min(10, parsed.score)) : 0;
    return {
      score,
      grammarMistakes: Array.isArray(parsed.grammarMistakes) ? parsed.grammarMistakes.map(String) : [],
      correctedSentences: Array.isArray(parsed.correctedSentences) ? parsed.correctedSentences.map(String) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
    };
  } catch {
    return DEFAULT_ANALYSIS;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!openRouterKey && !openAiKey) {
      const payload = { extractedText: text, analysis: DEFAULT_ANALYSIS } satisfies AnalyzeApiResponse;
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from("analyses").insert({
          user_id: session.user.id,
          extracted_text: payload.extractedText,
          score: payload.analysis.score,
          grammar_mistakes: payload.analysis.grammarMistakes,
          corrected_sentences: payload.analysis.correctedSentences,
          suggestions: payload.analysis.suggestions,
        });
      }
      return NextResponse.json(payload, { status: 200 });
    }

    const usingOpenRouter = Boolean(openRouterKey);
    const url = usingOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";
    const model = usingOpenRouter ? "meta-llama/llama-3.3-70b-instruct:free" : "gpt-4o-mini";

    const prompt = `You are an HR interviewer. Analyze the candidate's communication skills.
Check grammar, fluency, clarity, and confidence.
Give:
1. Grammar mistakes
2. Corrected sentences
3. Communication score (out of 10)
4. Suggestions to improve for job interviews

Return valid JSON with this exact schema:
{
  "score": number,
  "grammarMistakes": string[],
  "correctedSentences": string[],
  "suggestions": string[]
}`;

    const completionResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${usingOpenRouter ? openRouterKey : openAiKey}`,
        ...(usingOpenRouter ? { "HTTP-Referer": "http://localhost:3000", "X-Title": "Job Trainer AI" } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text },
        ],
      }),
    });

    if (!completionResponse.ok) {
      const rawError = await completionResponse.text();
      let providerMessage = `HTTP ${completionResponse.status}`;

      try {
        const parsed = JSON.parse(rawError) as {
          error?: { message?: string; code?: number | string };
          message?: string;
        };
        providerMessage = parsed.error?.message ?? parsed.message ?? providerMessage;
      } catch {
        providerMessage = rawError || providerMessage;
      }

      // Do not hard-fail the UX on provider rate limits; return graceful fallback analysis.
      const fallback = buildLocalFallbackAnalysis(text, providerMessage);
      const payload = { extractedText: text, analysis: fallback } satisfies AnalyzeApiResponse;
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase.from("analyses").insert({
          user_id: session.user.id,
          extracted_text: payload.extractedText,
          score: payload.analysis.score,
          grammar_mistakes: payload.analysis.grammarMistakes,
          corrected_sentences: payload.analysis.correctedSentences,
          suggestions: payload.analysis.suggestions,
        });
      }
      return NextResponse.json(payload, { status: 200 });
    }

    const completionJson = (await completionResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = completionJson.choices?.[0]?.message?.content ?? "";
    const analysis = safeJsonParse(content);

    const payload = { extractedText: text, analysis } satisfies AnalyzeApiResponse;
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from("analyses").insert({
        user_id: session.user.id,
        extracted_text: payload.extractedText,
        score: payload.analysis.score,
        grammar_mistakes: payload.analysis.grammarMistakes,
        corrected_sentences: payload.analysis.correctedSentences,
        suggestions: payload.analysis.suggestions,
      });
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "Unexpected server error while analyzing text." }, { status: 500 });
  }
}
