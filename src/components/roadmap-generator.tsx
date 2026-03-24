"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import type { RoadmapPlan } from "@/types/career";

const initialForm = {
  degree: "",
  skillLevel: "",
  interestedRole: "",
  targetDomain: "",
  careerPreference: "",
};

export function RoadmapGenerator() {
  const [form, setForm] = useState(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapPlan | null>(null);
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState("");

  const generateRoadmap = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as { roadmap?: RoadmapPlan; source?: string };
      if (!response.ok || !json.roadmap) throw new Error("Failed to generate roadmap.");
      setRoadmap(json.roadmap);
      setSource(json.source ?? "ai");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate roadmap.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAsPdf = () => {
    if (!roadmap) return;
    const doc = new jsPDF();
    let y = 16;
    const addSection = (title: string, items: string[]) => {
      doc.setFont("helvetica", "bold");
      doc.text(title, 14, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      items.forEach((item) => {
        const wrapped = doc.splitTextToSize(`- ${item}`, 180);
        doc.text(wrapped, 14, y);
        y += wrapped.length * 6;
        if (y > 270) {
          doc.addPage();
          y = 16;
        }
      });
      y += 2;
    };

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Career Roadmap", 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Domain: ${form.targetDomain} | Role: ${form.interestedRole || "Any"}`, 14, y);
    y += 10;

    addSection("Technical Skills", roadmap.technicalSkills);
    addSection("Communication Improvement Plan", roadmap.communicationPlan);
    addSection("HR Interview Preparation", roadmap.hrPreparation);
    addSection("Daily Job Application Strategy", roadmap.jobApplicationStrategy);
    addSection("Resume & Approach Strategy", roadmap.resumeApproach);

    doc.save("career-roadmap.pdf");
  };

  const section = (title: string, items: string[]) => (
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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">Module 2</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Career Roadmap Generator</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Generate a personalized roadmap for technical, communication, HR, and resume preparation.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Degree"
          value={form.degree}
          onChange={(e) => setForm((prev) => ({ ...prev, degree: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Interested role"
          value={form.interestedRole}
          onChange={(e) => setForm((prev) => ({ ...prev, interestedRole: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Target domain (e.g., Data, Frontend, AI/ML)"
          value={form.targetDomain}
          onChange={(e) => setForm((prev) => ({ ...prev, targetDomain: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Current skill level (e.g., Intermediate)"
          value={form.skillLevel}
          onChange={(e) => setForm((prev) => ({ ...prev, skillLevel: e.target.value }))}
        />
        <input
          className="rounded-xl border bg-white/70 px-3 py-2 outline-none ring-primary focus:ring-2 dark:bg-slate-950/70"
          placeholder="Career preference (Same field / Switching to IT / Other)"
          value={form.careerPreference}
          onChange={(e) => setForm((prev) => ({ ...prev, careerPreference: e.target.value }))}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={generateRoadmap}
          disabled={isLoading}
          className="rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-2 font-semibold text-white shadow-lg shadow-primary/30 transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Generating..." : "Generate Roadmap"}
        </button>
        <button
          type="button"
          onClick={downloadAsPdf}
          disabled={!roadmap}
          className="rounded-xl border border-primary/40 bg-white/70 px-4 py-2 font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900/50"
        >
          Download PDF
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
          Building your roadmap...
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}

      {roadmap && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {section("Technical Skills", roadmap.technicalSkills)}
          {section("Communication Improvement Plan", roadmap.communicationPlan)}
          {section("HR Interview Preparation", roadmap.hrPreparation)}
          {section("Daily Job Application Strategy", roadmap.jobApplicationStrategy)}
          {section("Resume & Approach Strategy", roadmap.resumeApproach)}
        </div>
      )}
    </section>
  );
}
