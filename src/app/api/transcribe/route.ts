import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
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
      return NextResponse.json({ error: `Transcription failed: ${details}` }, { status: 502 });
    }

    const json = (await transcribeResponse.json()) as { text?: string };
    return NextResponse.json({ text: json.text ?? "" });
  } catch {
    return NextResponse.json({ error: "Unexpected server error while transcribing." }, { status: 500 });
  }
}
