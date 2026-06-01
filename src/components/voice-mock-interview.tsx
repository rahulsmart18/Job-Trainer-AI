"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { MockInterviewTurn } from "@/types/communication";
import { MetricBar } from "@/components/score-gauge";
import { Spinner } from "@/components/ui/spinner";
import { NavIcon } from "@/components/ui/nav-icon";

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

function getRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

type Phase = "idle" | "speaking" | "listening" | "evaluating" | "feedback" | "done";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Lightweight, transparent estimates from the transcript for beginner feedback. */
function deriveMetrics(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  const fillers = (text.match(/\b(um|uh|like|actually|basically|you know|i mean|kind of|sort of)\b/gi) ?? [])
    .length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length).length || 1;
  const avgLen = wc / sentences;
  return {
    confidence: Math.round(clamp(100 - fillers * 10 - (wc < 25 ? 20 : 0), 25, 97)),
    fluency: Math.round(clamp(100 - fillers * 8 - (wc < 20 ? 25 : 0), 25, 97)),
    clarity: Math.round(clamp(100 - Math.abs(avgLen - 16) * 3, 35, 97)),
    fillers,
    wc,
  };
}

export function VoiceMockInterview() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState("");
  const [turn, setTurn] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState<MockInterviewTurn | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    const hasSpeech = Boolean(getRecognitionCtor());
    const hasTts = typeof window !== "undefined" && "speechSynthesis" in window;
    setVoiceSupported(Boolean(hasSpeech && hasTts));
    return () => {
      try {
        window.speechSynthesis?.cancel();
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const Recognition = getRecognitionCtor();
    if (!Recognition) {
      setPhase("listening");
      return;
    }
    setTranscript("");
    transcriptRef.current = "";
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      let next = "";
      for (let i = 0; i < event.results.length; i += 1) next += event.results[i][0].transcript + " ";
      const trimmed = next.trim();
      transcriptRef.current = trimmed;
      setTranscript(trimmed);
    };
    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Microphone error: ${event.error}. You can type your answer instead.`);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setPhase("listening");
    } catch {
      setPhase("listening");
    }
  }, []);

  const speakQuestion = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        startListening();
        return;
      }
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-IN";
      utter.rate = 0.98;
      utter.onend = () => startListening();
      setPhase("speaking");
      window.speechSynthesis.speak(utter);
    },
    [startListening],
  );

  const start = async () => {
    setError("");
    setUpgradeUrl(null);
    setFeedback(null);
    setSummary("");
    setTranscript("");
    setTurn(1);
    setPhase("evaluating");
    try {
      const res = await fetch("/api/mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const json = (await res.json()) as MockInterviewTurn & { error?: string; upgradeUrl?: string };
      if (!res.ok) {
        if (res.status === 402) {
          setError(json.error ?? "Free mock interview used.");
          setUpgradeUrl(json.upgradeUrl ?? "/checkout?plan=interview_pack");
        } else {
          throw new Error(json.error ?? "Failed to start interview.");
        }
        setPhase("idle");
        setTurn(0);
        return;
      }
      setQuestion(json.question);
      speakQuestion(json.question);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start.");
      setPhase("idle");
      setTurn(0);
    }
  };

  const submitAnswer = async () => {
    const answer = (transcriptRef.current || transcript).trim();
    if (!answer) {
      setError("I didn't catch an answer. Speak again or type it below.");
      return;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setError("");
    setPhase("evaluating");
    try {
      const res = await fetch("/api/mock-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", answer, turn }),
      });
      const json = (await res.json()) as MockInterviewTurn & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to submit answer.");
      setFeedback(json);
      if (json.done) {
        setSummary(json.summary ?? "Great practice session! Review the feedback and try again tomorrow.");
        setPhase("done");
      } else {
        setPhase("feedback");
        if (json.question) setQuestion(json.question);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit.");
      setPhase("listening");
    }
  };

  const nextQuestion = () => {
    setFeedback(null);
    setTranscript("");
    transcriptRef.current = "";
    setTurn((t) => t + 1);
    speakQuestion(question);
  };

  const reset = () => {
    setPhase("idle");
    setTurn(0);
    setQuestion("");
    setFeedback(null);
    setTranscript("");
    setSummary("");
    setError("");
  };

  const metrics = transcript ? deriveMetrics(transcript) : null;
  const isActive = phase !== "idle" && phase !== "done";

  return (
    <section className="trust-card rounded-3xl p-6 md:p-8">
      {/* Avatar + status */}
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          {phase === "speaking" && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-trust/20" />
              <span className="absolute inset-2 animate-pulse rounded-full bg-trust/15" />
            </>
          )}
          {phase === "listening" && (
            <>
              <span className="absolute inset-0 animate-ping rounded-full bg-achievement/25" />
              <span className="absolute inset-3 animate-pulse rounded-full bg-achievement/15" />
            </>
          )}
          <span
            className={`relative flex h-20 w-20 items-center justify-center rounded-full ring-1 ${
              phase === "listening"
                ? "bg-achievement/15 text-achievement ring-achievement/30"
                : "bg-trust/15 text-trust ring-trust/30"
            }`}
          >
            <NavIcon name={phase === "listening" ? "mic" : "chat"} className="h-8 w-8" />
          </span>
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted">
          {phase === "idle" && "AI HR Interviewer"}
          {phase === "speaking" && "Interviewer is speaking…"}
          {phase === "listening" && "Listening — answer out loud"}
          {phase === "evaluating" && "Evaluating your answer…"}
          {phase === "feedback" && `Round ${turn} feedback`}
          {phase === "done" && "Session complete"}
        </p>
        {isActive && turn > 0 && (
          <p className="mt-1 text-xs text-muted">Question {turn} of 3</p>
        )}
      </div>

      {/* Question */}
      {question && phase !== "done" && (
        <div className="mt-6 rounded-2xl border border-trust/20 bg-trust/5 p-4 text-center">
          <p className="text-base font-semibold leading-relaxed">{question}</p>
          {phase === "speaking" && (
            <button
              type="button"
              onClick={() => {
                window.speechSynthesis?.cancel();
                startListening();
              }}
              className="mt-2 text-xs font-medium text-trust underline"
            >
              Skip & answer now
            </button>
          )}
        </div>
      )}

      {/* Idle / start */}
      {phase === "idle" && (
        <div className="mt-6 text-center">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
            A real HR round, practiced safely. The interviewer asks 3 questions out loud — you answer using your
            voice, and get instant feedback after each one.
          </p>
          <button type="button" onClick={start} className="btn-trust press mt-5 rounded-xl px-6 py-3">
            Start voice interview
          </button>
          {!voiceSupported && (
            <p className="mt-3 text-xs text-muted">
              Voice isn&apos;t supported in this browser — you can still type your answers.
            </p>
          )}
        </div>
      )}

      {/* Listening: live transcript + controls */}
      {phase === "listening" && (
        <div className="mt-6 space-y-4">
          <div className="min-h-[80px] rounded-2xl border border-foreground/10 bg-surface-elevated/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your answer</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {transcript || <span className="text-muted">Start speaking — your words appear here…</span>}
            </p>
          </div>
          <textarea
            className="field-input min-h-[80px]"
            placeholder="Or type / edit your answer here"
            value={transcript}
            onChange={(e) => {
              setTranscript(e.target.value);
              transcriptRef.current = e.target.value;
            }}
          />
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!transcript.trim()}
            className="btn-trust press w-full rounded-xl px-6 py-3 disabled:opacity-50"
          >
            Submit answer
          </button>
        </div>
      )}

      {phase === "evaluating" && (
        <div className="mt-6 flex justify-center">
          <Spinner label="AI is evaluating your answer…" />
        </div>
      )}

      {/* Feedback */}
      {(phase === "feedback" || phase === "done") && feedback && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-achievement/25 bg-achievement/5 p-4 text-center">
              <p className="font-display text-3xl font-semibold text-achievement">{feedback.score ?? "—"}/10</p>
              <p className="mt-1 text-xs text-muted">Communication score</p>
            </div>
            {metrics && (
              <div className="rounded-2xl border border-foreground/8 bg-surface-elevated/40 p-4">
                <MetricBar label="Confidence" value={metrics.confidence} max={100} />
                <div className="mt-2" />
                <MetricBar label="Fluency" value={metrics.fluency} max={100} />
                <div className="mt-2" />
                <MetricBar label="Clarity" value={metrics.clarity} max={100} />
                <p className="mt-2 text-[10px] text-muted">Estimated from your words{metrics.fillers ? ` · ${metrics.fillers} filler word${metrics.fillers === 1 ? "" : "s"}` : ""}</p>
              </div>
            )}
          </div>

          {feedback.feedback && (
            <p className="rounded-2xl border border-foreground/8 bg-surface-elevated/40 p-4 text-sm leading-relaxed">
              <span className="font-semibold text-foreground">Feedback: </span>
              <span className="text-muted">{feedback.feedback}</span>
            </p>
          )}
          {feedback.improvementTip && (
            <div className="rounded-2xl border border-action/25 bg-action/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-action">Suggested better answer</p>
              <p className="mt-1 text-sm leading-relaxed">{feedback.improvementTip}</p>
            </div>
          )}

          {phase === "feedback" && (
            <button type="button" onClick={nextQuestion} className="btn-trust press w-full rounded-xl px-6 py-3">
              Next question →
            </button>
          )}
        </div>
      )}

      {/* Done summary */}
      {phase === "done" && (
        <div className="mt-4 rounded-2xl border border-achievement/30 bg-achievement/8 p-5 text-center">
          <p className="font-display text-lg font-semibold text-achievement">You finished all 3 rounds!</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{summary}</p>
          <button type="button" onClick={reset} className="btn-trust press mt-4 rounded-xl px-5 py-2.5">
            Practice again
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-urgency/10 p-3 text-sm text-urgency">
          <p>{error}</p>
          {upgradeUrl && (
            <Link href={upgradeUrl} className="mt-2 inline-block font-semibold text-premium underline">
              Compare plans →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
