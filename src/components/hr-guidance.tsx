"use client";

import { useState } from "react";
import type { HrGuidancePlan, HrQaItem } from "@/types/career";
import { LockedOverlay } from "@/components/locked-overlay";
import { useProfileForm } from "@/hooks/use-profile-form";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-trust/25 bg-trust/10 px-2.5 py-1 text-[11px] font-semibold text-trust transition hover:bg-trust/20"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function sourceLabel(source: string): { text: string; className: string } {
  if (source === "ai") return { text: "✦ AI personalized scripts", className: "bg-achievement/15 text-achievement" };
  if (source === "fallback-no-key")
    return { text: "Smart scripts (add OPENAI_API_KEY for full AI)", className: "bg-gold/15 text-gold" };
  return { text: "Personalized scripts", className: "bg-trust/15 text-trust" };
}

function TipList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted">
          <span className="mt-0.5 text-trust">✓</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ScriptCard({ script }: { script: string }) {
  return (
    <div className="rounded-xl border border-trust/15 bg-surface-elevated/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{script}</p>
        <CopyButton text={script} />
      </div>
    </div>
  );
}

function QaCard({ item, index }: { item: HrQaItem; index: number }) {
  return (
    <article className="rounded-2xl border border-premium/20 bg-gradient-to-br from-premium/5 to-surface-elevated/40 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-premium/20 text-sm font-black text-premium">
            {index + 1}
          </span>
          <h4 className="pt-1 text-base font-bold leading-snug text-foreground">{item.question}</h4>
        </div>
        <CopyButton text={item.answerScript.replace(/^"|"$/g, "")} />
      </div>
      <blockquote className="mt-4 border-l-2 border-achievement/50 pl-4">
        <p className="text-sm italic leading-relaxed text-foreground/90">{item.answerScript}</p>
      </blockquote>
      {item.proTip && (
        <p className="mt-3 rounded-lg bg-gold/10 px-3 py-2 text-xs text-gold">
          <span className="font-bold">Pro tip:</span> {item.proTip}
        </p>
      )}
    </article>
  );
}

export function HrGuidance({
  stepLabel,
  onComplete,
  upgradeUrl: upgradeUrlProp = "/checkout?plan=interview_pack",
}: {
  stepLabel?: string;
  onComplete?: () => void;
  upgradeUrl?: string;
}) {
  const { form, setForm, loaded, fromOnboarding } = useProfileForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [guidance, setGuidance] = useState<HrGuidancePlan | null>(null);
  const [source, setSource] = useState<string>("");
  const [locked, setLocked] = useState(false);
  const [upgradeUrl, setUpgradeUrl] = useState(upgradeUrlProp);

  const generateGuidance = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/hr-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await response.json()) as {
        guidance?: HrGuidancePlan;
        source?: string;
        locked?: boolean;
        upgradeUrl?: string;
      };
      if (!response.ok || !json.guidance) throw new Error("Failed to generate HR guidance.");
      setGuidance(json.guidance);
      setSource(json.source ?? "ai");
      setLocked(json.locked ?? false);
      setUpgradeUrl(json.upgradeUrl ?? upgradeUrlProp);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate HR guidance.");
    } finally {
      setIsLoading(false);
    }
  };

  const badge = source ? sourceLabel(source) : null;

  return (
    <section className="lux-card lux-topline glow-border rounded-[2rem] p-6 md:p-8">
      <p className="eyebrow">{stepLabel ?? "Close the deal"}</p>
      <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Handle HR Like a Pro</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Copy-paste scripts for common HR questions, recruiter messages, and tough scenarios — personalized to
        your role.
      </p>

      {fromOnboarding && (
        <p className="mt-3 rounded-xl bg-trust/10 px-3 py-2 text-xs font-medium text-trust">
          Pre-filled from onboarding — ensure your target role is correct before generating.
        </p>
      )}

      <div className={`mt-4 grid gap-3 md:grid-cols-2 ${!loaded ? "opacity-50" : ""}`}>
        <input
          className="field-input md:col-span-2"
          placeholder="Degree (e.g. B.Tech — IT)"
          value={form.degree}
          onChange={(e) => setForm((prev) => ({ ...prev, degree: e.target.value }))}
        />
        <input
          className="field-input"
          placeholder="Target job role"
          value={form.interestedRole}
          onChange={(e) => setForm((prev) => ({ ...prev, interestedRole: e.target.value }))}
        />
        <input
          className="field-input"
          placeholder="Domain / stack"
          value={form.targetDomain}
          onChange={(e) => setForm((prev) => ({ ...prev, targetDomain: e.target.value }))}
        />
        <input
          className="field-input"
          placeholder="Skill level"
          value={form.skillLevel}
          onChange={(e) => setForm((prev) => ({ ...prev, skillLevel: e.target.value }))}
        />
        <input
          className="field-input"
          placeholder="Career goal"
          value={form.careerPreference}
          onChange={(e) => setForm((prev) => ({ ...prev, careerPreference: e.target.value }))}
        />
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={generateGuidance}
          disabled={isLoading}
          className="btn-trust rounded-xl px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Preparing scripts..." : "Get Personalized HR Scripts"}
        </button>
      </div>

      {badge && (
        <p className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
          {badge.text}
        </p>
      )}

      {isLoading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-trust border-t-transparent" />
          Writing your interview scripts...
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-urgency/10 p-3 text-sm text-urgency">{error}</p>}

      {guidance && (
        <div className="mt-6 space-y-6">
          {(guidance.headline || guidance.roleFocus) && (
            <div className="rounded-2xl border border-trust/25 bg-trust/5 p-5">
              {guidance.headline && (
                <h3 className="font-display text-lg font-semibold tracking-tight">{guidance.headline}</h3>
              )}
              {guidance.roleFocus && (
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-trust">Interview focus:</span>{" "}
                  <span className="text-muted">{guidance.roleFocus}</span>
                </p>
              )}
              {guidance.bridgeNote && (
                <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold">{guidance.bridgeNote}</p>
              )}
            </div>
          )}

          {/* Common HR Q&A — featured full-width section */}
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-premium">
              <span aria-hidden="true">💬</span>
              Common HR Questions — say this word-for-word
            </h3>
            <div className="grid gap-4">
              {guidance.commonHrQuestions.map((item, i) => (
                <QaCard key={item.question} item={item} index={i} />
              ))}
            </div>
            {locked && guidance.commonHrQuestions.length <= 1 && (
              <p className="mt-3 text-center text-xs text-muted">
                Unlock premium to see all {7} HR question scripts + recruiter templates.
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="inner-card">
              <h3 className="flex items-center gap-2 font-semibold text-trust">
                <span aria-hidden="true">🎯</span> How to speak with HR
              </h3>
              <div className="mt-3">
                <TipList items={guidance.hrCommunicationTips} />
              </div>
            </article>

            {!locked && (
              <article className="inner-card">
                <h3 className="flex items-center gap-2 font-semibold text-trust">
                  <span aria-hidden="true">⚡</span> Real-world scenarios
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {guidance.realWorldScenarios.map((item) => (
                    <li key={item} className="rounded-lg bg-surface-elevated/60 p-3 text-sm leading-relaxed text-muted">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </div>

          {!locked && guidance.recruiterApproachScripts.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-trust">
                <span aria-hidden="true">📩</span> Recruiter outreach — copy & send
              </h3>
              <div className="grid gap-3">
                {guidance.recruiterApproachScripts.map((script) => (
                  <ScriptCard key={script.slice(0, 40)} script={script} />
                ))}
              </div>
            </div>
          )}

          {locked && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <article className="inner-card blur-[3px] opacity-60">
                  <h3 className="font-semibold">Recruiter scripts</h3>
                  <p className="mt-2 text-sm text-muted">Premium locked</p>
                </article>
                <article className="inner-card blur-[3px] opacity-60">
                  <h3 className="font-semibold">More HR questions</h3>
                  <p className="mt-2 text-sm text-muted">Premium locked</p>
                </article>
              </div>
              <LockedOverlay upgradeUrl={upgradeUrl} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
