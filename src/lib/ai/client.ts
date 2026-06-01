export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiCompletionResult = {
  content: string;
  source: "ai" | "fallback-no-key" | "fallback-provider-error";
};

function getConfig() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const usingOpenRouter = Boolean(openRouterKey);

  return {
    url: usingOpenRouter
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions",
    key: usingOpenRouter ? openRouterKey : openAiKey,
    model: usingOpenRouter ? "meta-llama/llama-3.3-70b-instruct:free" : "gpt-4o-mini",
    usingOpenRouter,
  };
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

export async function chatCompletionJson(
  messages: ChatMessage[],
  options?: { temperature?: number },
): Promise<AiCompletionResult> {
  const config = getConfig();

  if (!config.key) {
    return { content: "", source: "fallback-no-key" };
  }

  const payload = JSON.stringify({
    model: config.model,
    temperature: options?.temperature ?? 0.3,
    response_format: { type: "json_object" },
    messages,
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(config.url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.key}`,
          ...(config.usingOpenRouter
            ? { "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000", "X-Title": "Job Trainer AI" }
            : {}),
        },
        body: payload,
      });

      if (!response.ok) {
        // Retry once on transient upstream errors (429 / 5xx); fail fast otherwise.
        const transient = response.status === 429 || response.status >= 500;
        if (transient && attempt < MAX_ATTEMPTS) {
          await delay(400 * attempt);
          continue;
        }
        return { content: "", source: "fallback-provider-error" };
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      return {
        content: json.choices?.[0]?.message?.content ?? "",
        source: "ai",
      };
    } catch {
      // Network error or timeout (abort) — retry if attempts remain.
      if (attempt < MAX_ATTEMPTS) {
        await delay(400 * attempt);
        continue;
      }
      return { content: "", source: "fallback-provider-error" };
    } finally {
      clearTimeout(timeout);
    }
  }

  return { content: "", source: "fallback-provider-error" };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function enrichTextMetrics(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const fillers = ["um", "uh", "like", "actually", "basically", "you know"];
  const found = fillers.filter((f) => new RegExp(`\\b${f}\\b`, "i").test(text));
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgWordsPerSentence = sentences.length ? words.length / sentences.length : words.length;

  return {
    wordCount: words.length,
    fillerWords: found,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
  };
}
