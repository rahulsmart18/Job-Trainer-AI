"use client";

import { useState } from "react";
import type { HrGuidancePlan } from "@/types/career";

export function HrGuidance() {
  const [form, setForm] = useState({
    interestedRole: "",
    targetDomain: "",
    skillLevel: "",
    careerPreference: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [guidance, setGuidance] = useState<HrGuidancePlan | null>(null);
  const [source, setSource] = useState<string>("");

  const generateGuidance = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/hr-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as { guidance?: HrGuidancePlan; source?: string };
      if (!response.ok || !json.guidance) throw new Error("Failed to generate HR guidance.");
      setGuidance(json.guidance);
      setSource(json.source ?? "ai");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate HR guidance.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderList = (title: string, items: string[]) => (
    <article className="rounded-2xl border bg-white/60 p-4 dark:bg-slate-900/50">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
        {items.map((item) => (
          <li key={`${title}-${item}`}>{item}</li>
        ))}
      </ul>
    </article>
  );

  return (
    <section className="rounded-[2rem] border border-white/50 bg-surface/85 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-highlight">Module 3</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">HR Interaction Guidance</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Learn how to speak with HR, approach recruiters, and handle real interview scenarios.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Interested role"
          value={form.interestedRole}
          onChange={(e) => setForm((prev) => ({ ...prev, interestedRole: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Target domain"
          value={form.targetDomain}
          onChange={(e) => setForm((prev) => ({ ...prev, targetDomain: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Skill level"
          value={form.skillLevel}
          onChange={(e) => setForm((prev) => ({ ...prev, skillLevel: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Career preference"
          value={form.careerPreference}
          onChange={(e) => setForm((prev) => ({ ...prev, careerPreference: e.target.value }))}
        />
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={generateGuidance}
          disabled={isLoading}
          className="rounded-xl bg-gradient-to-r from-primary to-highlight px-4 py-2 font-semibold text-white shadow-lg shadow-primary/30 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Generating..." : "Generate HR Guidance"}
        </button>
      </div>
      {source && (
        <p className="mt-3 text-xs text-muted">
          Source: {source === "ai" ? "AI generated" : "Personalized fallback"}
        </p>
      )}

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Preparing HR guidance...
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}

      {guidance && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {renderList("How to Speak with HR", guidance.hrCommunicationTips)}
          {renderList("How to Approach Recruiters", guidance.recruiterApproachScripts)}
          {renderList("Common HR Questions with Answers", guidance.commonHrQuestions)}
          {renderList("Real-World Scenarios", guidance.realWorldScenarios)}
        </div>
      )}
    </section>
  );
}
