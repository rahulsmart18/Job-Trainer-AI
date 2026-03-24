"use client";

import { useEffect, useState } from "react";

type AnalysisItem = { id: number; extracted_text: string; score: number; created_at: string };
type RoadmapItem = { id: number; target_domain: string; interested_role: string; source: string; created_at: string };
type GuidanceItem = { id: number; created_at: string };

export function HistoryPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [data, setData] = useState<{
    analyses: AnalysisItem[];
    roadmaps: RoadmapItem[];
    guidance: GuidanceItem[];
  }>({ analyses: [], roadmaps: [], guidance: [] });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/history");
        const json = (await response.json()) as typeof data & { error?: string; warning?: string | null };
        if (!response.ok) throw new Error(json.error ?? "Failed to load history.");
        setData(json);
        setWarning(json.warning ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <section className="rounded-[2rem] border border-white/50 bg-surface/85 p-6 shadow-2xl backdrop-blur-xl md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary">History</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">Your Previous Activity</h2>
      {loading && <p className="mt-3 text-sm text-muted">Loading history...</p>}
      {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!error && warning && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{warning}</p>}
      {!loading && !error && (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border bg-white/60 p-4 dark:bg-slate-900/50">
            <h3 className="font-semibold">Analyses</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              {data.analyses.slice(0, 5).map((item) => (
                <li key={item.id} className="rounded-lg bg-white/60 p-2 dark:bg-slate-800/50">
                  Score {item.score}/10 - {new Date(item.created_at).toLocaleDateString()}
                </li>
              ))}
              {data.analyses.length === 0 && <li>No analysis history yet.</li>}
            </ul>
          </article>
          <article className="rounded-2xl border bg-white/60 p-4 dark:bg-slate-900/50">
            <h3 className="font-semibold">Roadmaps</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              {data.roadmaps.slice(0, 5).map((item) => (
                <li key={item.id} className="rounded-lg bg-white/60 p-2 dark:bg-slate-800/50">
                  {item.target_domain || "General"} - {item.interested_role || "Any role"}
                </li>
              ))}
              {data.roadmaps.length === 0 && <li>No roadmap history yet.</li>}
            </ul>
          </article>
          <article className="rounded-2xl border bg-white/60 p-4 dark:bg-slate-900/50">
            <h3 className="font-semibold">HR Guidance</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              {data.guidance.slice(0, 5).map((item) => (
                <li key={item.id} className="rounded-lg bg-white/60 p-2 dark:bg-slate-800/50">
                  Generated on {new Date(item.created_at).toLocaleDateString()}
                </li>
              ))}
              {data.guidance.length === 0 && <li>No HR guidance history yet.</li>}
            </ul>
          </article>
        </div>
      )}
    </section>
  );
}
