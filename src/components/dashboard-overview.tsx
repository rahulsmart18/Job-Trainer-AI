"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CareerInsights } from "@/types/communication";
import { NavIcon } from "@/components/ui/nav-icon";

function ReadinessRing({ percent, size = 132 }: { percent: number; size?: number }) {
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--muted) 18%, transparent)"
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
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-semibold text-achievement">{percent}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Ready</span>
      </div>
    </div>
  );
}

type QuickAction = {
  href: string;
  icon: string;
  title: string;
  desc: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { href: "/roadmap", icon: "map", title: "Continue Roadmap", desc: "Your step-by-step plan" },
  { href: "/mock-interview", icon: "mic", title: "Start Mock Interview", desc: "Practice out loud" },
  { href: "/hr-question", icon: "chat", title: "Practice HR Questions", desc: "Common answers" },
  { href: "/communication-analysis", icon: "wave", title: "Communication Score", desc: "Check your speaking" },
];

function StatCard({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-foreground/8 bg-surface-elevated/40 p-4 text-center">
      <p className={`font-display text-2xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="trust-card rounded-3xl p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <span className="skeleton h-[132px] w-[132px] rounded-full" />
          <div className="flex-1 space-y-3">
            <span className="skeleton block h-4 w-32" />
            <span className="skeleton block h-6 w-3/4" />
            <span className="skeleton block h-12 w-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <span className="skeleton h-24 rounded-2xl" />
        <span className="skeleton h-24 rounded-2xl" />
      </div>
    </div>
  );
}

export function DashboardOverview({ userName }: { userName: string }) {
  const [data, setData] = useState<CareerInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/career-insights")
      .then((r) => r.json())
      .then((json: CareerInsights) => {
        if (active) setData(json);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return null;

  const weeklyLabel = data.weeklyDelta > 0 ? `+${data.weeklyDelta}% this week` : "Just getting started";

  return (
    <div className="space-y-7">
      {/* Readiness + daily goal */}
      <section className="trust-card rounded-3xl p-6 md:p-7">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <ReadinessRing percent={data.readinessScore} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-trust">Interview readiness</p>
            <h2 className="font-display mt-1 text-xl font-semibold md:text-2xl">
              Hi {userName}, you&apos;re {data.readinessScore}% ready
            </h2>
            <span className="mt-2 inline-block rounded-full bg-achievement/12 px-3 py-1 text-xs font-semibold text-achievement">
              {weeklyLabel}
            </span>

            <div className="mt-4 rounded-2xl border border-action/25 bg-action/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-action">Today&apos;s goal</p>
              <p className="mt-1 text-sm font-medium">{data.todaysMission}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Biggest gap */}
      <section className="rounded-3xl border border-foreground/8 bg-surface-elevated/40 p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-premium">Biggest improvement gap</p>
        <p className="mt-2 text-sm leading-relaxed">{data.biggestGap}</p>
        <p className="mt-1 text-xs text-muted">Your next steps below are built to close this.</p>
      </section>

      {/* Progress summary */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted">Your progress</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            value={data.streakDays > 0 ? `${data.streakDays}` : "0"}
            label="Day streak"
            tone="text-action"
          />
          <StatCard
            value={data.latestCommunicationScore !== null ? `${data.latestCommunicationScore}/10` : "—"}
            label="Comm. score"
            tone="text-achievement"
          />
          <StatCard value={`${data.mockInterviewCount}`} label="Mock rounds" tone="text-trust" />
          <StatCard
            value={data.confidenceImprovement !== null ? `+${data.confidenceImprovement}%` : "—"}
            label="Confidence"
            tone="text-premium"
          />
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-muted">Jump back in</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="card-interactive group flex items-center gap-4 rounded-2xl border border-foreground/8 bg-surface-elevated/40 p-4 hover:border-trust/30"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-trust/12 text-trust ring-1 ring-trust/20">
                <NavIcon name={a.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{a.title}</span>
                <span className="block text-xs text-muted">{a.desc}</span>
              </span>
              <NavIcon name="arrow" className="h-4 w-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-trust" />
            </Link>
          ))}
        </div>
        <Link
          href="/progress"
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-foreground/8 bg-surface-elevated/30 p-3 text-sm font-medium text-muted transition hover:text-foreground"
        >
          <NavIcon name="chart" className="h-4 w-4" /> See weekly progress
        </Link>
      </section>
    </div>
  );
}
