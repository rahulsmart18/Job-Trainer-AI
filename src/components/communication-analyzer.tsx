"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AnalyzeApiResponse, CommunicationAnalysis, CommunicationCorrection } from "@/types/communication";
import { LoadingDots } from "@/components/ui/spinner";
import { NavIcon } from "@/components/ui/nav-icon";

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

/* ----------------------------------------------------------------------------
 * Small presentational helpers
 * ------------------------------------------------------------------------- */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text.replace(/^"|"$/g, ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-achievement/30 bg-achievement/10 px-3 py-1.5 text-xs font-semibold text-achievement transition hover:bg-achievement/15"
    >
      {copied ? "Copied!" : "Copy answer"}
    </button>
  );
}

const SCORE_TONE = (v: number) =>
  v >= 8 ? "text-achievement" : v >= 6 ? "text-trust" : "text-action";
const SCORE_BAR = (v: number) =>
  v >= 8 ? "from-achievement to-emerald-400" : v >= 6 ? "from-trust to-sky-400" : "from-action to-orange-400";

/** Friendly one-line summary based on the overall score. */
function statusFromScore(score: number): { text: string; tone: string } {
  if (score >= 8) return { text: "Strong — keep polishing the small details.", tone: "text-achievement" };
  if (score >= 6) return { text: "Good progress — improve confidence and sentence clarity.", tone: "text-trust" };
  if (score >= 4) return { text: "Getting there — focus on structure and fewer filler words.", tone: "text-action" };
  return { text: "Keep practicing — start with a clear, simple introduction.", tone: "text-action" };
}

const METRIC_META: Record<
  string,
  { label: string; good: string; bad: string; goodHint: string; badHint: string }
> = {
  grammar: {
    label: "Grammar",
    good: "Good grammar",
    bad: "Grammar mistakes",
    goodHint: "Your sentences are well formed.",
    badHint: "Use full sentences with correct grammar.",
  },
  confidence: {
    label: "Confidence",
    good: "Confident tone",
    bad: "Low confidence",
    goodHint: "You sound sure of yourself.",
    badHint: "Try slower speaking and clearer pauses.",
  },
  clarity: {
    label: "Clarity",
    good: "Clear pronunciation",
    bad: "Unclear delivery",
    goodHint: "Your words are easy to follow.",
    badHint: "Pause between ideas so each point lands.",
  },
  professionalism: {
    label: "Professionalism",
    good: "Professional wording",
    bad: "Too casual",
    goodHint: "Your tone fits an interview.",
    badHint: "Use formal, professional wording.",
  },
  fluency: {
    label: "Fluency",
    good: "Smooth & fluent",
    bad: "Choppy fluency",
    goodHint: "You speak smoothly.",
    badHint: "Reduce filler words and long pauses.",
  },
};

type MetricRow = { key: string; value: number };

function metricRows(a: CommunicationAnalysis): MetricRow[] {
  return [
    { key: "grammar", value: a.grammarScore ?? a.score },
    { key: "confidence", value: a.confidence },
    { key: "clarity", value: a.clarity },
    { key: "professionalism", value: a.professionalismScore ?? a.score },
    { key: "fluency", value: a.fluency },
  ];
}

/** Strongest insight (✓) + two weakest (⚠), for the hero summary. */
function topInsights(a: CommunicationAnalysis): { ok: boolean; label: string }[] {
  const rows = metricRows(a);
  const ascending = [...rows].sort((x, y) => x.value - y.value);
  const picks = [ascending[ascending.length - 1], ascending[0], ascending[1]]
    .filter((m, i, arr) => arr.findIndex((x) => x.key === m.key) === i)
    .slice(0, 3);
  return picks.map((m) => {
    const ok = m.value >= 7;
    const meta = METRIC_META[m.key];
    return { ok, label: ok ? meta.good : meta.bad };
  });
}

function ScoreCard({ row }: { row: MetricRow }) {
  const meta = METRIC_META[row.key];
  const pct = Math.min(100, (row.value / 10) * 100);
  const hint = row.value >= 7 ? meta.goodHint : meta.badHint;
  return (
    <div className="rounded-2xl border border-foreground/8 bg-surface-elevated/40 p-4 sm:p-5">
      <p className="text-sm font-medium text-muted">{meta.label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold sm:text-4xl ${SCORE_TONE(row.value)}`}>
        {row.value}
        <span className="text-base text-muted sm:text-lg">/10</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-elevated">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${SCORE_BAR(row.value)} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-muted sm:mt-3">{hint}</p>
    </div>
  );
}

function ComparisonCard({ c }: { c: CommunicationCorrection }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/8">
      <div className="grid md:grid-cols-2">
        <div className="border-b border-urgency/15 bg-urgency/8 p-5 md:border-b-0 md:border-r lg:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-urgency">You said</p>
          <p className="mt-2 break-words text-base leading-relaxed text-foreground/90">&ldquo;{c.original}&rdquo;</p>
          {c.issue && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-urgency">
              <span aria-hidden="true">⚠</span>
              <span>{c.issue}</span>
            </p>
          )}
        </div>
        <div className="bg-achievement/8 p-5 lg:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-achievement">Better way</p>
          <p className="mt-2 break-words text-base leading-relaxed text-foreground">&ldquo;{c.improved}&rdquo;</p>
        </div>
      </div>
    </div>
  );
}

/** Renders the transcript with filler words underlined in red + a tooltip. */
function HighlightedTranscript({ text, fillers }: { text: string; fillers: string[] }) {
  const set = new Set(fillers.map((f) => f.toLowerCase().trim()).filter(Boolean));
  if (set.size === 0) return <>{text}</>;

  const escaped = [...set].map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(\\b(?:${escaped.join("|")})\\b)`, "gi");
  const parts = text.split(re);

  return (
    <>
      {parts.map((part, i) =>
        set.has(part.toLowerCase()) ? (
          <mark
            key={`${part}-${i}`}
            className="cursor-help bg-transparent font-medium text-urgency underline decoration-urgency/70 decoration-wavy underline-offset-4"
            title="Filler word — pause instead of saying this"
          >
            {part}
          </mark>
        ) : (
          <span key={`t-${i}`}>{part}</span>
        ),
      )}
    </>
  );
}

function TranscriptCard({ text, fillers }: { text: string; fillers: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;
  const shown = expanded || !isLong ? text : `${text.slice(0, 200).trim()}…`;

  return (
    <article className="lux-card rounded-3xl p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold md:text-xl">Your speech</h3>
        {fillers.length > 0 && (
          <span className="text-xs text-muted">
            <span className="text-urgency underline decoration-urgency/70 decoration-wavy underline-offset-4">
              red underline
            </span>{" "}
            = filler word to fix
          </span>
        )}
      </div>
      <p className="mt-4 break-words text-base leading-loose text-foreground/90 sm:text-lg">
        <HighlightedTranscript text={shown} fillers={fillers} />
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 text-sm font-semibold text-trust transition hover:opacity-80"
        >
          {expanded ? "Show less" : "Expand full transcript"}
        </button>
      )}
    </article>
  );
}

/** Splits the rewrite into short, readable lines. */
function toLines(text: string): string[] {
  const clean = text.trim().replace(/^"|"$/g, "").trim();
  return clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sourceBadge(source: string): { label: string; className: string } {
  if (source === "ai") return { label: "AI Coach", className: "bg-achievement/15 text-achievement" };
  return { label: "Smart Coach", className: "bg-trust/15 text-trust" };
}

/* ----------------------------------------------------------------------------
 * Main component
 * ------------------------------------------------------------------------- */

export function CommunicationAnalyzer({
  stepLabel,
  onComplete,
  paid = false,
}: {
  stepLabel?: string;
  onComplete?: () => void;
  paid?: boolean;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalyzeApiResponse | null>(null);
  const [audioURL, setAudioURL] = useState<string>("");
  const [stage, setStage] = useState<"transcribing" | "analyzing" | "">("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");

  const canUseSpeechRecognition = useMemo(
    () => typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  );

  const startRecording = async () => {
    setError("");
    setTranscript("");
    transcriptRef.current = "";
    setAnalysis(null);
    setAudioURL("");

    if (!canUseSpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please upload an audio file.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();

      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) throw new Error("Speech recognition is unavailable.");
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let next = "";
        for (let i = 0; i < event.results.length; i += 1) {
          next += event.results[i][0].transcript + " ";
        }
        const trimmed = next.trim();
        transcriptRef.current = trimmed;
        setTranscript(trimmed);
      };
      recognition.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
      };
      speechRecognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access failed. Please allow microphone permissions.");
    }
  };

  const analyzeText = async (text: string) => {
    if (!text.trim()) {
      setError("No speech text found. Please speak clearly or upload a file.");
      return;
    }

    setError("");
    setUpgradeUrl(null);
    setIsProcessing(true);
    setStage("analyzing");
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const json = (await response.json()) as AnalyzeApiResponse & {
        error?: string;
        upgradeUrl?: string;
        locked?: boolean;
      };
      if (!response.ok || json.error) {
        const msg = json.error ?? "Analysis request failed.";
        if (response.status === 402) {
          setError(msg);
          setUpgradeUrl(json.upgradeUrl ?? "/checkout?plan=full_bundle");
        } else {
          throw new Error(msg);
        }
        return;
      }

      setAnalysis(json);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze communication.");
    } finally {
      setIsProcessing(false);
      setStage("");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    speechRecognitionRef.current?.stop();
    setIsRecording(false);
    window.setTimeout(() => {
      const text = transcriptRef.current.trim();
      if (text) void analyzeText(text);
    }, 400);
  };

  const onUploadAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    setAnalysis(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const allowed = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/webm", "audio/ogg"];
    if (!allowed.includes(file.type)) {
      setError("Unsupported format. Upload mp3, wav, mp4, webm, or ogg.");
      return;
    }

    setAudioURL(URL.createObjectURL(file));
    setIsProcessing(true);
    setStage("transcribing");

    try {
      const formData = new FormData();
      formData.append("audio", file);
      const transcribeResponse = await fetch("/api/transcribe", { method: "POST", body: formData });
      const transcribeJson = (await transcribeResponse.json()) as { text?: string; error?: string };
      if (!transcribeResponse.ok || !transcribeJson.text) {
        throw new Error(transcribeJson.error ?? "Transcription failed.");
      }
      setTranscript(transcribeJson.text);
      await analyzeText(transcribeJson.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio upload processing failed.");
      setIsProcessing(false);
      setStage("");
    }
  };

  const busy = isRecording || isProcessing;
  const statusLine = isRecording
    ? "Listening… speak your intro clearly."
    : stage === "transcribing"
      ? "Reading your speech…"
      : stage === "analyzing"
        ? "Analyzing your communication…"
        : "Tap the mic and introduce yourself.";

  const a = analysis?.analysis;
  const badge = analysis ? sourceBadge(analysis.source) : null;
  const corrections = a?.corrections ?? [];
  const visibleCorrections = paid ? corrections : corrections.slice(0, 2);
  const lockedCorrections = corrections.length - visibleCorrections.length;
  const status = a ? statusFromScore(a.score) : null;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 1 · HERO SUMMARY ----------------------------------------------------- */}
      {a && status && (
        <section className="lux-card lux-topline glow-border rounded-3xl p-5 sm:p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left">
              <p className="eyebrow">Communication Score</p>
              <p className="mt-2 font-display text-5xl font-semibold leading-none sm:text-6xl md:text-7xl">
                <span className={SCORE_TONE(a.score)}>{a.score.toFixed(1)}</span>
                <span className="text-xl text-muted sm:text-2xl"> / 10</span>
              </p>
              <p className={`mt-3 text-sm font-medium sm:text-base ${status.tone}`}>{status.text}</p>
              {analysis.previousScore != null && (
                <p className="mt-1 text-xs text-muted">
                  vs last attempt:{" "}
                  <span className={a.score >= analysis.previousScore ? "font-semibold text-achievement" : "font-semibold text-urgency"}>
                    {a.score >= analysis.previousScore ? "+" : ""}
                    {(a.score - analysis.previousScore).toFixed(1)}
                  </span>
                </p>
              )}
            </div>

            <ul className="grid w-full gap-2.5 md:w-auto md:min-w-[260px]">
              {topInsights(a).map((it) => (
                <li
                  key={it.label}
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium ${
                    it.ok
                      ? "border-achievement/20 bg-achievement/8 text-achievement"
                      : "border-action/20 bg-action/8 text-action"
                  }`}
                >
                  <span aria-hidden="true">{it.ok ? "✓" : "⚠"}</span>
                  {it.label}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={startRecording}
              disabled={busy}
              className="btn-trust press w-full rounded-xl px-5 py-3 sm:w-auto sm:py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Practice Again
            </button>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {badge && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
              )}
              {a.detectedAnswerType && (
                <span className="text-xs text-muted">Detected: {a.detectedAnswerType}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2 · AUDIO INPUT ------------------------------------------------------- */}
      <section className="lux-card rounded-3xl p-5 text-center sm:p-6 md:p-8">
        {!a && (
          <>
            <p className="eyebrow">{stepLabel ?? "AI Communication Coach"}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Practice your introduction
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Record your &ldquo;Tell me about yourself&rdquo; answer. I&apos;ll score it and show you exactly what to
              fix — in simple words.
            </p>
            <p className="mx-auto mt-3 max-w-md rounded-xl border border-trust/15 bg-trust/5 px-4 py-3 text-left text-xs leading-relaxed text-muted">
              <span className="font-semibold text-trust">Not sure what to say?</span> Try: &ldquo;Hello, my name is
              ___. I completed my ___. I want to work as a ___, and I enjoy ___.&rdquo;
            </p>
          </>
        )}

        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
              isRecording
                ? "bg-gradient-to-br from-urgency to-rose-500"
                : "bg-gradient-to-br from-trust to-secondary hover:scale-[1.03]"
            }`}
          >
            {isRecording && (
              <span className="absolute inset-0 animate-ping rounded-full bg-urgency/40" aria-hidden="true" />
            )}
            <NavIcon name="mic" className="relative h-9 w-9" />
          </button>

          <div className="flex items-center gap-2 text-sm text-muted">
            {isRecording && <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-urgency" />}
            {isProcessing && !isRecording && <LoadingDots className="text-trust" />}
            <span>{statusLine}</span>
          </div>

          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="w-full max-w-xs rounded-xl bg-urgency px-5 py-3 font-semibold text-white transition hover:translate-y-[-1px] active:scale-95"
            >
              Stop &amp; Analyze
            </button>
          )}

          {!busy && (
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-trust/20 bg-surface-elevated/60 px-4 py-2.5 text-sm font-semibold text-trust transition hover:bg-trust/10 active:scale-95">
              Or upload an audio file
              <input type="file" accept="audio/*" className="hidden" onChange={onUploadAudio} />
            </label>
          )}

          {!canUseSpeechRecognition && !busy && (
            <p className="max-w-xs text-xs leading-relaxed text-muted">
              Your browser can&apos;t record live — please upload an audio file instead (mp3, wav, m4a).
            </p>
          )}
        </div>

        {/* progress bar while transcribing / analyzing */}
        {isProcessing && !isRecording && (
          <div className="mx-auto mt-5 max-w-md">
            <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-trust to-sky-400" />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {stage === "transcribing" ? "Step 1 of 2 — reading your speech" : "Step 2 of 2 — scoring & corrections"}
            </p>
          </div>
        )}

        {audioURL && <audio className="mx-auto mt-5 w-full max-w-md rounded-xl" controls src={audioURL} />}

        {transcript && !a && !isProcessing && (
          <div className="mx-auto mt-5 max-w-md rounded-xl border border-trust/15 bg-surface-elevated/60 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Live transcript</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{transcript}</p>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl bg-urgency/10 p-4 text-sm text-urgency">
          <p>{error}</p>
          {upgradeUrl && (
            <Link href={upgradeUrl} className="mt-2 inline-block font-semibold text-premium underline">
              Compare plans →
            </Link>
          )}
        </div>
      )}

      {/* 3 · TRANSCRIPT -------------------------------------------------------- */}
      {a && <TranscriptCard text={analysis.extractedText} fillers={a.fillerWords} />}

      {/* 4 · MISTAKES & BETTER VERSION ---------------------------------------- */}
      {a && corrections.length > 0 && (
        <section>
          <h3 className="font-display text-xl font-semibold md:text-2xl">Mistakes &amp; better version</h3>
          <p className="mt-1 text-sm text-muted">Red is what you said. Green is the professional way to say it.</p>
          <div className="mt-4 space-y-4">
            {visibleCorrections.map((c, i) => (
              <ComparisonCard key={`${c.original}-${i}`} c={c} />
            ))}
          </div>
          {lockedCorrections > 0 && (
            <div className="mt-4 rounded-2xl border border-premium/25 bg-premium/8 p-5 text-center">
              <p className="text-sm font-semibold text-premium">
                +{lockedCorrections} more correction{lockedCorrections === 1 ? "" : "s"} with Premium
              </p>
              <Link
                href="/checkout?plan=full_bundle"
                className="btn-premium press mt-3 block w-full rounded-xl px-5 py-3 text-sm sm:inline-block sm:w-auto sm:py-2.5"
              >
                Unlock full corrections
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 5 · INTERVIEW-READY VERSION ------------------------------------------ */}
      {a?.improvedIntro && (
        <section className="relative overflow-hidden rounded-3xl border border-achievement/30 bg-gradient-to-br from-achievement/10 to-surface-elevated/40 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-semibold text-achievement md:text-2xl">Interview-ready answer</h3>
            {paid && <CopyButton text={a.improvedIntro} />}
          </div>
          <div className={`mt-4 space-y-3 ${paid ? "" : "select-none blur-sm"}`}>
            {toLines(a.improvedIntro).map((line, i) => (
              <p key={i} className="break-words text-base leading-relaxed text-foreground">
                {line}
              </p>
            ))}
          </div>
          {!paid && (
            <div className="mt-4 rounded-2xl border border-premium/25 bg-premium/8 p-5 text-center">
              <p className="text-sm font-semibold text-premium">Unlock your polished, interview-ready answer</p>
              <Link
                href="/checkout?plan=full_bundle"
                className="btn-premium press mt-3 block w-full rounded-xl px-5 py-3 text-sm sm:inline-block sm:w-auto sm:py-2.5"
              >
                Go Premium
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 6 · QUICK IMPROVEMENT TIPS ------------------------------------------- */}
      {a && a.suggestions.length > 0 && (
        <section>
          <h3 className="font-display text-xl font-semibold md:text-2xl">Quick tips to improve</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {a.suggestions.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-2xl border border-foreground/8 bg-surface-elevated/40 p-4"
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-achievement/15 text-sm text-achievement">
                  ✓
                </span>
                <p className="text-sm leading-relaxed text-foreground/90">{item}</p>
              </div>
            ))}
          </div>
          {a.nextBestAction && (
            <p className="mt-4 rounded-2xl border border-trust/25 bg-trust/5 px-5 py-4 text-sm">
              <span className="font-semibold text-trust">Try next:</span> {a.nextBestAction}
            </p>
          )}
        </section>
      )}

      {/* 7 · SCORE BREAKDOWN --------------------------------------------------- */}
      {a && (
        <section>
          <h3 className="font-display text-xl font-semibold md:text-2xl">Your scores</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {metricRows(a).map((row) => (
              <ScoreCard key={row.key} row={row} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
