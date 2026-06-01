"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoadmapPlan } from "@/types/career";
import { LockedOverlay } from "@/components/locked-overlay";
import { useProfileForm } from "@/hooks/use-profile-form";
import { Spinner } from "@/components/ui/spinner";
import { SkeletonCard } from "@/components/ui/skeleton";
import { NavIcon } from "@/components/ui/nav-icon";

const PROGRESS_KEY = "roadmap-step-progress";

function parsePhaseItem(item: string): { phase: string | null; body: string } {
  const match = item.match(
    /^((?:Week \d+(?:-\d+)?|Month \d+(?:-\d+)?|Daily|Weekly|Before each interview|Ongoing)):\s*(.+)$/i,
  );
  if (match) return { phase: match[1], body: match[2] };
  return { phase: null, body: item };
}

type SectionKey = "communicationPlan" | "hrPreparation" | "jobApplicationStrategy" | "resumeApproach";

const SECTION_META: Record<SectionKey, { title: string; icon: string }> = {
  communicationPlan: { title: "Communication plan", icon: "wave" },
  hrPreparation: { title: "HR interview prep", icon: "chat" },
  jobApplicationStrategy: { title: "Daily job hunt", icon: "map" },
  resumeApproach: { title: "Resume & LinkedIn", icon: "spark" },
};

function StepNode({
  index,
  total,
  item,
  done,
  onToggle,
}: {
  index: number;
  total: number;
  item: string;
  done: boolean;
  onToggle: () => void;
}) {
  const { phase, body } = parsePhaseItem(item);
  return (
    <div className="relative flex gap-4">
      {/* Connector */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={done}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
            done
              ? "bg-achievement text-white"
              : "bg-trust/15 text-trust ring-1 ring-trust/30 hover:bg-trust/25"
          }`}
        >
          {done ? "✓" : index + 1}
        </button>
        {index < total - 1 && <span className="my-1 w-px flex-1 bg-foreground/12" />}
      </div>
      {/* Card */}
      <div className={`mb-4 flex-1 rounded-2xl border p-4 transition ${done ? "border-achievement/30 bg-achievement/5" : "border-foreground/8 bg-surface-elevated/40"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">Step {index + 1}</span>
          {phase && (
            <span className="rounded-md bg-trust/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-trust">
              {phase}
            </span>
          )}
        </div>
        <p className={`mt-1.5 text-sm leading-relaxed ${done ? "text-muted line-through" : "text-foreground"}`}>
          {body}
        </p>
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 text-xs font-medium text-trust transition hover:underline"
        >
          {done ? "Mark as not done" : "Mark as done"}
        </button>
      </div>
    </div>
  );
}

function Accordion({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-foreground/8 bg-surface-elevated/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-trust/12 text-trust ring-1 ring-trust/20">
          <NavIcon name={icon} className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted">{items.length} tips</span>
        <NavIcon name="arrow" className={`h-4 w-4 text-muted transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <ul className="space-y-2 border-t border-foreground/8 p-4">
          {items.map((item) => {
            const { phase, body } = parsePhaseItem(item);
            return (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                {phase ? (
                  <span className="shrink-0 rounded-md bg-trust/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-trust">
                    {phase}
                  </span>
                ) : (
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-achievement" />
                )}
                <span>{body}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function RoadmapJourney() {
  const { form, setForm, loaded, fromOnboarding } = useProfileForm();
  const [isLoading, setIsLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapPlan | null>(null);
  const [locked, setLocked] = useState(false);
  const [upgradeUrl, setUpgradeUrl] = useState("/checkout?plan=roadmap");
  const [projectTeaser, setProjectTeaser] = useState("");
  const [error, setError] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [doneSteps, setDoneSteps] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) setDoneSteps(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleStep = (key: string) => {
    setDoneSteps((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const generate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as {
        roadmap?: RoadmapPlan;
        locked?: boolean;
        upgradeUrl?: string;
        projectTeaser?: string;
      };
      if (!response.ok || !json.roadmap) throw new Error("Failed to generate roadmap.");
      setRoadmap(json.roadmap);
      setLocked(json.locked ?? false);
      setUpgradeUrl(json.upgradeUrl ?? "/checkout?plan=roadmap");
      setProjectTeaser(json.projectTeaser ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate roadmap.");
    } finally {
      setIsLoading(false);
    }
  };

  const steps = useMemo(() => roadmap?.technicalSkills ?? [], [roadmap]);
  const doneCount = useMemo(
    () => steps.filter((_, i) => doneSteps[`tech-${i}`]).length,
    [steps, doneSteps],
  );
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Generate / adjust */}
      {!roadmap && (
        <section className="trust-card rounded-3xl p-6 md:p-7">
          <h2 className="font-display text-xl font-semibold">Build your learning path</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            We&apos;ll turn your goal into simple steps — skills to learn, in order, with mini projects along the
            way. Tap a step to mark it done and watch your progress grow.
          </p>
          {fromOnboarding && (
            <p className="mt-3 rounded-xl bg-trust/10 px-3 py-2 text-xs font-medium text-trust">
              Using your onboarding details. You can fine-tune them below before generating.
            </p>
          )}

          <button
            type="button"
            onClick={() => setShowAdjust((v) => !v)}
            className="mt-4 text-sm font-medium text-trust hover:underline"
          >
            {showAdjust ? "Hide details" : "Adjust my details"}
          </button>

          {showAdjust && (
            <div className={`mt-3 grid gap-3 md:grid-cols-2 ${!loaded ? "opacity-50" : ""}`}>
              <input
                className="field-input md:col-span-2"
                placeholder="Degree (e.g. B.Tech — IT)"
                value={form.degree}
                onChange={(e) => setForm((p) => ({ ...p, degree: e.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Target job role"
                value={form.interestedRole}
                onChange={(e) => setForm((p) => ({ ...p, interestedRole: e.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Domain / area"
                value={form.targetDomain}
                onChange={(e) => setForm((p) => ({ ...p, targetDomain: e.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Skill level"
                value={form.skillLevel}
                onChange={(e) => setForm((p) => ({ ...p, skillLevel: e.target.value }))}
              />
              <input
                className="field-input"
                placeholder="Career goal"
                value={form.careerPreference}
                onChange={(e) => setForm((p) => ({ ...p, careerPreference: e.target.value }))}
              />
            </div>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={isLoading}
            className="btn-trust press mt-5 rounded-xl px-6 py-3 disabled:opacity-60"
          >
            {isLoading ? <Spinner label="Building your plan…" /> : "Generate my roadmap"}
          </button>
          {error && <p className="mt-4 rounded-xl bg-urgency/10 p-3 text-sm text-urgency">{error}</p>}
        </section>
      )}

      {isLoading && !roadmap && (
        <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {roadmap && (
        <>
          {/* Header + progress */}
          <section className="trust-card rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {roadmap.headline ?? "Your roadmap"}
                </h2>
                {roadmap.primaryFocus && (
                  <p className="mt-1 text-sm text-muted">Focus: {roadmap.primaryFocus}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRoadmap(null)}
                className="rounded-xl border border-foreground/15 px-3 py-1.5 text-xs font-semibold text-muted transition hover:text-foreground"
              >
                Regenerate
              </button>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-muted">Your progress</span>
                <span className="font-bold text-achievement">
                  {doneCount}/{steps.length} steps · {pct}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-achievement to-emerald-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {roadmap.bridgeNote && (
              <p className="mt-3 rounded-xl bg-trust/8 px-3 py-2 text-sm text-trust">{roadmap.bridgeNote}</p>
            )}
          </section>

          {/* The step journey */}
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted">
              <NavIcon name="map" className="h-4 w-4" /> Your learning steps
            </h3>
            <div>
              {steps.map((item, i) => (
                <StepNode
                  key={`tech-${item}`}
                  index={i}
                  total={steps.length}
                  item={item}
                  done={Boolean(doneSteps[`tech-${i}`])}
                  onToggle={() => toggleStep(`tech-${i}`)}
                />
              ))}
            </div>

            {/* Mini-project milestone */}
            <div className="mt-2 flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-action/15 text-action ring-1 ring-action/30">
                  <NavIcon name="spark" className="h-4 w-4" />
                </span>
              </div>
              <div className="flex-1 rounded-2xl border border-action/25 bg-action/8 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-action">Mini-project milestone</p>
                <p className="mt-1 text-sm leading-relaxed">
                  {projectTeaser ||
                    "Build a small project that uses the skills above — it becomes your first portfolio piece and proof for recruiters."}
                </p>
              </div>
            </div>
          </section>

          {/* Supporting sections */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted">Beyond the skills</h3>
            <Accordion
              title={SECTION_META.communicationPlan.title}
              icon={SECTION_META.communicationPlan.icon}
              items={roadmap.communicationPlan}
            />
            {!locked && (
              <>
                <Accordion
                  title={SECTION_META.hrPreparation.title}
                  icon={SECTION_META.hrPreparation.icon}
                  items={roadmap.hrPreparation}
                />
                <Accordion
                  title={SECTION_META.jobApplicationStrategy.title}
                  icon={SECTION_META.jobApplicationStrategy.icon}
                  items={roadmap.jobApplicationStrategy}
                />
                <Accordion
                  title={SECTION_META.resumeApproach.title}
                  icon={SECTION_META.resumeApproach.icon}
                  items={roadmap.resumeApproach}
                />
              </>
            )}
            {locked && (
              <div className="relative overflow-hidden rounded-2xl border border-premium/25 bg-premium/5 p-5">
                <p className="text-sm font-semibold text-premium">HR prep, daily job hunt & resume plan</p>
                <p className="mt-1 text-sm text-muted">
                  Your full step-by-step plan is ready. Unlock to see every section.
                </p>
                <LockedOverlay upgradeUrl={upgradeUrl} projectTeaser={projectTeaser} />
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
