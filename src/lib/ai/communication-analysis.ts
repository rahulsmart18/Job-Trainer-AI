import type { AiUserContext } from "@/lib/ai/context";
import type { CommunicationAnalysis, CommunicationCorrection } from "@/types/communication";
import { enrichTextMetrics } from "@/lib/ai/client";
import { experiencePromptLine, isJobSwitchProfile, workExperienceLabel } from "@/lib/experience-segment";

export const COMMUNICATION_SYSTEM_PROMPT = `You are an expert HR communication coach for Indian tech interviews (freshers and 1–2 yr job switchers).
The candidate is practicing spoken answers (often "Tell me about yourself").

Analyze the transcript for interview readiness — NOT academic grammar alone.

Return ONLY valid JSON:
{
  "score": number (0-10),
  "detectedAnswerType": "Tell me about yourself" | "Why this role" | "General" | etc.,
  "grammarMistakes": string[] (specific issues in THIS transcript — never mention API or errors),
  "correctedSentences": string[] (2-3 rewritten sentences from their actual content),
  "corrections": [{ "original": "exact phrase they actually said", "improved": "professional corrected version", "issue": "short reason (e.g. Missing article, Filler word)" }] (2-4 items, quote their real words),
  "improvedIntro": "Full 60-90 second spoken intro script they should practice, using their facts",
  "suggestions": string[] (4-5 short beginner-friendly tips, max ~8 words each),
  "fluency": number (0-10),
  "clarity": number (0-10),
  "confidence": number (0-10),
  "grammarScore": number (0-10),
  "professionalismScore": number (0-10),
  "nextBestAction": string (one specific action for next recording)
}

RULES:
- If they mention multiple conflicting roles (e.g. DevOps + Project Manager + Full Stack), flag clarity and pick ONE aligned to profile target role.
- improvedIntro must be speakable aloud — short sentences, confident tone.
- Never return generic advice without referencing their transcript.
- grammarMistakes must be human-readable (e.g. "Run-on sentence mixing 3 career goals").`;

const ROLE_KEYWORDS = [
  "devops",
  "project manager",
  "full stack",
  "fullstack",
  "frontend",
  "backend",
  "data analyst",
  "mobile",
  "android",
  "ios",
  "qa",
  "tester",
];

function countRoleMentions(text: string): string[] {
  const lower = text.toLowerCase();
  return ROLE_KEYWORDS.filter((r) => lower.includes(r));
}

function isRunOn(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  const hasBreak = /[.!?]/.test(text);
  return words.length > 35 && !hasBreak;
}

function lacksIntroStructure(text: string): boolean {
  const lower = text.toLowerCase();
  const hasNameCue = /\b(i am|i'm|my name is|this is)\b/.test(lower);
  const hasGoalCue = /\b(looking for|interested in|targeting|want to become|aspiring)\b/.test(lower);
  return !hasNameCue || !hasGoalCue;
}

function scoreFromMetrics(
  text: string,
  metrics: ReturnType<typeof enrichTextMetrics>,
  roleMentions: string[],
): number {
  let score = 7;
  if (metrics.fillerWords.length > 0) score -= metrics.fillerWords.length * 0.5;
  if (isRunOn(text)) score -= 1.5;
  if (roleMentions.length > 1) score -= 1.5;
  if (lacksIntroStructure(text)) score -= 1;
  if (metrics.avgWordsPerSentence > 25) score -= 0.5;
  if (metrics.wordCount < 20) score -= 1;
  return Math.max(3, Math.min(9, Math.round(score * 10) / 10));
}

function buildImprovedIntro(text: string, ctx: AiUserContext): string {
  const name = ctx.fullName?.split(" ")[0] || "I";
  const degree = ctx.degree || "a graduate";
  const role = ctx.interestedRole || "an IT role";
  const domain = ctx.targetDomain || "technology";

  const rolesMentioned = countRoleMentions(text);
  const focusRole = ctx.interestedRole || rolesMentioned[0] || role;
  const jobSwitch = isJobSwitchProfile(ctx);
  const exp = ctx.workExperience ? workExperienceLabel(ctx.workExperience).toLowerCase() : "no prior work experience";

  if (jobSwitch) {
    return `"Good morning. I'm ${name}, with ${exp} in ${domain}. In my recent role I [specific achievement with a number]. I'm targeting ${focusRole} opportunities where I can [one growth goal]. I'm especially strong in [your core stack] and I'm ready to contribute from day one. Thank you."`;
  }

  return `"Good morning. I'm ${name}, ${degree.includes("—") ? "with a background in" : "a"} ${degree}. I'm targeting ${focusRole} roles in ${domain}. I have hands-on experience from [your project or internship — add one specific example]. I'm especially interested in ${focusRole} because I enjoy [one concrete reason]. I'm eager to learn, contribute to the team, and grow in this role. Thank you."`;
}

function rewriteSentences(text: string, ctx: AiUserContext): string[] {
  const name = ctx.fullName?.split(" ")[0] || "I";
  const role = ctx.interestedRole || "my target role";

  const sentences: string[] = [];

  if (isRunOn(text)) {
    sentences.push(
      `"Good morning. I'm ${name}. I'm interested in ${role}. I have [X months/years] of experience in [specific skill]. I'm looking for a team where I can grow and contribute."`,
    );
  }

  if (countRoleMentions(text).length > 1) {
    sentences.push(
      `Pick ONE role for this answer: ${role}. Save other interests for later questions — HR wants clarity, not a list.`,
    );
  }

  const cleaned = text
    .replace(/\bbasically\b/gi, "")
    .replace(/\bactually\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > 20) {
    const firstChunk = cleaned.split(/[,;.!?]/)[0]?.trim();
    if (firstChunk && firstChunk.length > 15) {
      sentences.push(`Shorter opening: "${firstChunk.charAt(0).toUpperCase() + firstChunk.slice(1)}." — then stop and let HR respond.`);
    }
  }

  if (sentences.length === 0) {
    sentences.push(`"I'm ${name}, focused on ${role}. My strongest project is [name] where I [result]."`);
    sentences.push("Replace filler words with a one-second pause — silence sounds more confident than 'basically'.");
  }

  return sentences.slice(0, 3);
}

function buildGrammarIssues(text: string, metrics: ReturnType<typeof enrichTextMetrics>): string[] {
  const issues: string[] = [];
  const roles = countRoleMentions(text);

  if (isRunOn(text)) {
    issues.push("Run-on answer — too many ideas in one breath without pauses or full stops.");
  }
  if (roles.length > 1) {
    issues.push(`Unclear career focus — you mentioned ${roles.length} different paths (${roles.join(", ")}). HR expects ONE target role per answer.`);
  }
  if (lacksIntroStructure(text)) {
    issues.push("Missing intro structure — start with name, then background, then ONE clear role goal.");
  }
  if (metrics.fillerWords.length > 0) {
    issues.push(`Filler words weaken confidence: "${metrics.fillerWords.join('", "')}" — replace with brief pauses.`);
  }
  if (metrics.avgWordsPerSentence > 22) {
    issues.push(`Sentences too long (avg ${metrics.avgWordsPerSentence} words). Aim for 12–18 words per sentence when speaking.`);
  }
  if (/roadmap|skill growth|help me/i.test(text) && !/interview|role|hire|team/i.test(text)) {
    issues.push("Sounds like a coaching request, not an interview answer — focus on what you offer the employer, not what you need.");
  }

  if (issues.length === 0) {
    issues.push("Minor polish needed — tighten your opening and end with why you fit this specific role.");
  }

  return issues.slice(0, 5);
}

function buildHrSuggestions(ctx: AiUserContext, text: string): string[] {
  const role = ctx.interestedRole || "your target role";
  const roles = countRoleMentions(text);
  const jobSwitch = isJobSwitchProfile(ctx);

  if (jobSwitch) {
    return [
      `"Tell me about yourself" for job switchers: Name → current role & tenure → 1 metric achievement → why ${role} here — under 90 seconds.`,
      "Prepare 'Why leaving?' with growth framing — never criticize your current employer.",
      "Record daily and compare scores — lead with impact numbers, not task lists.",
      "Practice salary answer with market research for 1–2 yr lateral moves in your city.",
      ctx.englishLevel !== null && ctx.englishLevel <= 2
        ? "Use short sentences; experienced candidates still lose offers on unclear English."
        : "Use STAR for behavioral questions — Situation, Task, Action, Result with metrics.",
    ];
  }

  return [
    `"Tell me about yourself" formula: Name → ${ctx.degree ? "degree" : "background"} → 1 project proof → why ${role} — under 90 seconds.`,
    roles.length > 1
      ? `You mentioned multiple roles — for interviews, lead with ${role} only.`
      : `End every intro with: "I'm excited to contribute as a ${role}."`,
    "Record daily and compare scores — aim to remove one filler word per session.",
    "Practice in front of a mirror: shoulders back, smile on 'Good morning', speak 10% slower than normal conversation.",
    ctx.englishLevel !== null && ctx.englishLevel <= 2
      ? "Focus on short sentences (5–8 words) until fluency score reaches 7+."
      : "Use STAR format when HR asks behavioral questions after your intro.",
  ];
}

/** Heuristic before/after pairs so the comparison view works even without AI. */
function buildCorrections(
  text: string,
  metrics: ReturnType<typeof enrichTextMetrics>,
): CommunicationCorrection[] {
  const out: CommunicationCorrection[] = [];

  const myself = text.match(/\bmyself\s+([A-Za-z]+)/i);
  if (myself) {
    out.push({
      original: myself[0],
      improved: `my name is ${myself[1]}`,
      issue: "Incorrect self-introduction",
    });
  }

  const know = text.match(/\bi know\b([^.!?]{2,60})/i);
  if (know) {
    const skills = know[1].trim().replace(/\s+and\s+/i, ", ").replace(/\s+/g, " ");
    out.push({
      original: `I know ${know[1].trim()}`.trim(),
      improved: `I have experience with ${skills}`,
      issue: "Use 'experience with' for a stronger tone",
    });
  }

  if (/\bhardworking person\b/i.test(text) && !/\ba hardworking person\b/i.test(text)) {
    out.push({
      original: "I am hardworking person",
      improved: "I am a hardworking person",
      issue: "Missing article 'a'",
    });
  }

  for (const f of [...new Set(metrics.fillerWords.map((x) => x.toLowerCase()))].slice(0, 2)) {
    out.push({ original: f, improved: "(a short pause)", issue: "Filler word — pause instead" });
  }

  if (isRunOn(text)) {
    const firstChunk = text.split(/\s+/).slice(0, 10).join(" ");
    out.push({
      original: `${firstChunk}…`,
      improved: "Break this into 3 short sentences: who you are → what you know → the role you want.",
      issue: "Run-on sentence",
    });
  }

  return out.slice(0, 5);
}

function gradeScores(
  score: number,
  clarity: number,
  grammarIssueCount: number,
  metrics: ReturnType<typeof enrichTextMetrics>,
  text: string,
): { grammarScore: number; professionalismScore: number } {
  const clampS = (n: number) => Math.max(3, Math.min(10, Math.round(n)));
  const grammarScore = clampS(9 - grammarIssueCount * 0.8 - (metrics.avgWordsPerSentence > 22 ? 1 : 0));
  const professionalismScore = clampS(
    (score + clarity) / 2 - (lacksIntroStructure(text) ? 1 : 0) - (countRoleMentions(text).length > 1 ? 1 : 0),
  );
  return { grammarScore, professionalismScore };
}

export function buildSmartCommunicationAnalysis(
  text: string,
  ctx: AiUserContext,
  metrics: ReturnType<typeof enrichTextMetrics>,
): CommunicationAnalysis {
  const roleMentions = countRoleMentions(text);
  const score = scoreFromMetrics(text, metrics, roleMentions);
  const fillerPenalty = metrics.fillerWords.length > 2 ? 1 : 0;
  const grammarMistakes = buildGrammarIssues(text, metrics);
  const clarity = Math.max(3, Math.min(10, Math.round(score - (roleMentions.length > 1 ? 1.5 : 0))));
  const { grammarScore, professionalismScore } = gradeScores(
    score,
    clarity,
    grammarMistakes.length,
    metrics,
    text,
  );

  const detectedType = /tell me about|introduce yourself|about yourself/i.test(text)
    ? "Tell me about yourself"
    : /why.*role|why should we hire/i.test(text)
      ? "HR motivation question"
      : "General interview answer";

  let nextBestAction = "Record again with ONE target role and a 60-second limit.";
  if (roleMentions.length > 1) {
    nextBestAction = `Pick only "${ctx.interestedRole || roleMentions[0]}" — re-record without mentioning other roles.`;
  } else if (metrics.fillerWords.length > 0) {
    nextBestAction = `Re-record removing "${metrics.fillerWords[0]}" — pause instead of filler words.`;
  } else if (isRunOn(text)) {
    nextBestAction = "Break your answer into 3 short sentences: who you are → what you built → what role you want.";
  }

  return {
    score,
    detectedAnswerType: detectedType,
    grammarMistakes,
    correctedSentences: rewriteSentences(text, ctx),
    corrections: buildCorrections(text, metrics),
    improvedIntro: buildImprovedIntro(text, ctx),
    suggestions: buildHrSuggestions(ctx, text),
    fluency: Math.max(3, Math.min(10, Math.round(score - 1 - fillerPenalty))),
    clarity,
    confidence: Math.max(3, Math.min(10, Math.round(score - fillerPenalty))),
    grammarScore,
    professionalismScore,
    fillerWords: metrics.fillerWords,
    nextBestAction,
  };
}

export function parseCommunicationAnalysis(
  raw: string,
  text: string,
  ctx: AiUserContext,
  metrics: ReturnType<typeof enrichTextMetrics>,
): CommunicationAnalysis {
  const fallback = buildSmartCommunicationAnalysis(text, ctx, metrics);

  try {
    const parsed = JSON.parse(raw) as Partial<CommunicationAnalysis> & { improvedIntro?: string };

    const grammarMistakes = Array.isArray(parsed.grammarMistakes)
      ? parsed.grammarMistakes
          .map(String)
          .filter((g) => !/provider|fallback|api key|error/i.test(g))
      : [];

    const correctedSentences = Array.isArray(parsed.correctedSentences)
      ? parsed.correctedSentences.map(String)
      : [];

    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [];

    const corrections: CommunicationCorrection[] = Array.isArray(parsed.corrections)
      ? parsed.corrections
          .filter((c): c is CommunicationCorrection => Boolean(c && c.original && c.improved))
          .map((c) => ({
            original: String(c.original),
            improved: String(c.improved),
            issue: c.issue ? String(c.issue) : undefined,
          }))
          .slice(0, 6)
      : [];

    const score = typeof parsed.score === "number" ? Math.max(0, Math.min(10, parsed.score)) : fallback.score;
    const clampScore = (n: unknown, fb: number) =>
      typeof n === "number" ? Math.max(0, Math.min(10, n)) : fb;

    if (grammarMistakes.length < 2 || correctedSentences.length < 1 || suggestions.length < 2) {
      return fallback;
    }

    return {
      score,
      detectedAnswerType: String(parsed.detectedAnswerType ?? fallback.detectedAnswerType ?? "General"),
      grammarMistakes,
      correctedSentences,
      corrections: corrections.length > 0 ? corrections : fallback.corrections,
      improvedIntro: String(parsed.improvedIntro ?? fallback.improvedIntro ?? ""),
      suggestions,
      fluency: clampScore(parsed.fluency, fallback.fluency),
      clarity: clampScore(parsed.clarity, fallback.clarity),
      confidence: clampScore(parsed.confidence, fallback.confidence),
      grammarScore: clampScore(parsed.grammarScore, fallback.grammarScore ?? fallback.score),
      professionalismScore: clampScore(parsed.professionalismScore, fallback.professionalismScore ?? fallback.score),
      fillerWords: metrics.fillerWords,
      nextBestAction: String(parsed.nextBestAction ?? fallback.nextBestAction),
    };
  } catch {
    return fallback;
  }
}

export function buildCommunicationUserPrompt(
  ctx: AiUserContext,
  text: string,
  metrics: ReturnType<typeof enrichTextMetrics>,
): string {
  return [
    `Target role: ${ctx.interestedRole || "Not specified"}`,
    `Domain: ${ctx.targetDomain || "Not specified"}`,
    `Degree: ${ctx.degree || "Not specified"}`,
    ctx.workExperience ? `Work experience: ${workExperienceLabel(ctx.workExperience)}` : "",
    experiencePromptLine(ctx),
    `English level: ${ctx.englishLevel ?? "?"}/5`,
    `Detected filler words: ${metrics.fillerWords.join(", ") || "none"}`,
    `Word count: ${metrics.wordCount}`,
    "",
    "Transcript to analyze:",
    text,
  ].join("\n");
}
