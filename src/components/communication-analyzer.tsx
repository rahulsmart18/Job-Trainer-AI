"use client";

import { useMemo, useRef, useState } from "react";
import type { AnalyzeApiResponse } from "@/types/communication";

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

export function CommunicationAnalyzer() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [analysis, setAnalysis] = useState<AnalyzeApiResponse | null>(null);
  const [audioURL, setAudioURL] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const canUseSpeechRecognition = useMemo(
    () => typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  );

  const startRecording = async () => {
    setError("");
    setTranscript("");
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
      if (!Recognition) {
        throw new Error("Speech recognition is unavailable in this browser.");
      }
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let next = "";
        for (let i = 0; i < event.results.length; i += 1) {
          next += event.results[i][0].transcript + " ";
        }
        setTranscript(next.trim());
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

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    speechRecognitionRef.current?.stop();
    setIsRecording(false);
  };

  const analyzeText = async (text: string) => {
    if (!text.trim()) {
      setError("No speech text found. Please speak clearly or upload a file.");
      return;
    }

    setError("");
    setIsProcessing(true);
    setAnalysis(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const json = (await response.json()) as AnalyzeApiResponse | { error: string };
      if (!response.ok || "error" in json) {
        throw new Error("error" in json ? json.error : "Analysis request failed.");
      }

      setAnalysis(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze communication.");
    } finally {
      setIsProcessing(false);
    }
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

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const transcribeJson = (await transcribeResponse.json()) as { text?: string; error?: string };
      if (!transcribeResponse.ok || !transcribeJson.text) {
        throw new Error(transcribeJson.error ?? "Transcription failed.");
      }

      setTranscript(transcribeJson.text);
      await analyzeText(transcribeJson.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audio upload processing failed.");
      setIsProcessing(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-white/50 bg-surface/85 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Module 1</p>
        <h2 className="text-2xl font-black tracking-tight md:text-3xl">AI Communication Analysis</h2>
        <p className="text-sm leading-relaxed text-muted">
          Record your voice or upload audio. We extract speech and analyze grammar, fluency, clarity, and confidence.
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={isProcessing}
            className="rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2 font-semibold text-white shadow-lg shadow-primary/30 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start Recording
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-xl bg-gradient-to-r from-accent to-secondary px-4 py-2 font-semibold text-white shadow-lg shadow-accent/30 transition hover:translate-y-[-1px]"
          >
            Stop Recording
          </button>
        )}

        <button
          type="button"
          onClick={() => analyzeText(transcript)}
          disabled={isRecording || isProcessing}
          className="rounded-xl border border-primary/40 bg-white/70 px-4 py-2 font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900/50"
        >
          Analyze Speech
        </button>

        <label className="cursor-pointer rounded-xl border bg-white/70 px-4 py-2 text-center text-sm font-semibold text-foreground dark:bg-slate-900/50">
          Upload Audio
          <input type="file" accept="audio/*" className="hidden" onChange={onUploadAudio} disabled={isProcessing} />
        </label>
      </div>

      {audioURL && <audio className="mt-4 w-full" controls src={audioURL} />}

      {(isProcessing || isRecording) && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {isRecording ? "Recording and transcribing..." : "Processing with AI..."}
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50/90 p-3 text-sm text-red-700 dark:bg-red-950/40">{error}</p>}

      {analysis && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border bg-white/60 p-4 dark:bg-slate-900/50">
            <h3 className="font-semibold">Extracted Text</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{analysis.extractedText}</p>
          </article>

          <article className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
            <h3 className="font-semibold">Communication Score</h3>
            <p className="mt-2 text-4xl font-black tracking-tight text-primary">{analysis.analysis.score}/10</p>
          </article>

          <article className="rounded-2xl border bg-white/60 p-4 dark:bg-slate-900/50">
            <h3 className="font-semibold">Grammar Mistakes</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
              {analysis.analysis.grammarMistakes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border bg-white/60 p-4 dark:bg-slate-900/50">
            <h3 className="font-semibold">Corrected Sentences</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
              {analysis.analysis.correctedSentences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border bg-white/60 p-4 md:col-span-2 dark:bg-slate-900/50">
            <h3 className="font-semibold">Interview Improvement Suggestions</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
              {analysis.analysis.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      )}
    </section>
  );
}
