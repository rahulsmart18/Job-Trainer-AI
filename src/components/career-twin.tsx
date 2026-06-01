"use client";

import { useEffect, useRef, useState } from "react";
import { ScoreGauge } from "@/components/score-gauge";
import { FreeTierBanner } from "@/components/free-tier-banner";
import type { CareerInsights } from "@/types/communication";

function ReadinessRing({ percent, size = 140 }: { percent: number; size?: number }) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--muted) 20%, transparent)"
          strokeWidth="10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--achievement)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: "drop-shadow(0 0 8px color-mix(in srgb, var(--achievement) 50%, transparent))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-achievement">{percent}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Ready</span>
      </div>
    </div>
  );
}

type Props = {
  stepLabel?: string;
  onReady?: () => void;
};

export function CareerTwin({ stepLabel, onReady }: Props) {
  const [data, setData] = useState<CareerInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    fetch("/api/career-insights")
      .then((r) => r.json())
      .then((json: CareerInsights) => {
        setData(json);
        onReadyRef.current?.();
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="lux-card lux-topline glow-border rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-5">
            <span className="skeleton block h-3 w-32" />
            <span className="skeleton block h-8 w-3/4" />
            <div className="grid gap-4 sm:grid-cols-2">
              <span className="skeleton block h-28" />
              <span className="skeleton block h-28" />
            </div>
            <span className="skeleton block h-14 w-full" />
          </div>
          <span className="skeleton block h-[140px] w-[140px] shrink-0 rounded-full" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasProgress = data.readinessScore > data.startingReadiness;
  const weeklyLabel = data.weeklyDelta > 0 ? `↑ +${data.weeklyDelta}% this week` : "Keep your streak going";
  const fullAccess = data.unlockedFeatures?.length === 4;

  return (
    <div className="space-y-5">
      <section className="lux-card lux-topline glow-border rounded-[2rem] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-5">
            <div>
              <p className="eyebrow">{stepLabel ?? "AI Career Twin"}</p>
              <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                You&apos;re{" "}
                <span className="text-gradient">{data.readinessScore}%</span> interview-ready
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-achievement/15 px-3 py-1 text-sm font-bold text-achievement">
                  {weeklyLabel}
                </span>
                {hasProgress && (
                  <span className="text-xs text-muted">
                    Started at {data.startingReadiness}% → now {data.readinessScore}%
                  </span>
                )}
                {data.mockInterviewCount > 0 && (
                  <span className="rounded-full bg-trust/15 px-3 py-1 text-xs font-semibold text-trust">
                    {data.mockInterviewCount} mock interview{data.mockInterviewCount === 1 ? "" : "s"} completed
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="inner-card hover-lift">
                <p className="text-xs font-semibold uppercase tracking-wider text-achievement">Strengths</p>
                <ul className="mt-2 space-y-1.5">
                  {data.strengths.map((s) => (
                    <li key={s} className="flex items-center gap-2 text-sm">
                      <span className="text-achievement">✓</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="inner-card hover-lift border-gold/25">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">Biggest gap</p>
                <p className="mt-2 flex items-start gap-2 text-sm">
                  <span className="text-gold">⚠</span>
                  {data.biggestGap}
                </p>
                {!fullAccess && (
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Don&apos;t worry — this is fixable. Follow your steps below; payment comes last when you want
                    the full detailed plan.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-trust/25 bg-trust/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-trust">Today&apos;s mission</p>
              <p className="mt-1 text-sm font-semibold">{data.todaysMission}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4">
            <ReadinessRing percent={data.readinessScore} />
            {data.latestCommunicationScore !== null && (
              <ScoreGauge
                score={data.latestCommunicationScore}
                max={10}
                size={90}
                label="Comm. score"
                variant="achievement"
              />
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-trust/15 pt-5 sm:grid-cols-3">
          <div className="rounded-xl bg-gold/10 px-4 py-3 text-center">
            <p className="text-lg font-black text-gold">
              {data.streakDays > 0 ? `🔥 ${data.streakDays}` : "—"}
            </p>
            <p className="text-xs text-muted">{data.streakDays > 0 ? "Day streak" : "Start your streak today"}</p>
          </div>
          <div className="rounded-xl bg-achievement/10 px-4 py-3 text-center">
            <p className="text-lg font-black text-achievement">
              {data.confidenceImprovement !== null ? `+${data.confidenceImprovement}%` : "—"}
            </p>
            <p className="text-xs text-muted">Confidence improved</p>
          </div>
          <div className="rounded-xl bg-trust/10 px-4 py-3 text-center sm:col-span-1">
            <p className="text-xs font-semibold text-trust">Next checkpoint</p>
            <p className="mt-1 text-sm font-medium leading-snug">{data.nextCheckpoint}</p>
          </div>
        </div>
      </section>

      {data.usage && !fullAccess && <FreeTierBanner usage={data.usage} paid={data.paid} />}
    </div>
  );
}
