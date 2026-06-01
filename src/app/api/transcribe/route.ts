import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit(request, "transcribe", session.user.id, { limit: 15, windowMs: 60_000 });
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Audio file is too large (max 15 MB)." }, { status: 413 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured. Use voice recording transcription instead." },
        { status: 400 },
      );
    }

    const providerFormData = new FormData();
    providerFormData.append("file", file);
    providerFormData.append("model", "whisper-large-v3-turbo");
    providerFormData.append("response_format", "verbose_json");
    providerFormData.append("temperature", "0");

    const transcribeResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}` },
      body: providerFormData,
    });

    if (!transcribeResponse.ok) {
      const details = await transcribeResponse.text();
      console.error("[transcribe] provider error:", transcribeResponse.status, details.slice(0, 300));
      return NextResponse.json({ error: "Transcription service is unavailable. Please try again." }, { status: 502 });
    }

    const json = (await transcribeResponse.json()) as { text?: string };
    return NextResponse.json({ text: json.text ?? "" });
  } catch {
    return NextResponse.json({ error: "Unexpected server error while transcribing." }, { status: 500 });
  }
}
