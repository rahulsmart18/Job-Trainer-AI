"use client";

type Props = {
  score: number;
  max?: number;
  size?: number;
  label?: string;
  variant?: "default" | "achievement";
};

export function ScoreGauge({ score, max = 10, size = 120, label, variant = "default" }: Props) {
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    variant === "achievement"
      ? "var(--achievement)"
      : score >= 8
        ? "var(--achievement)"
        : score >= 6
          ? "var(--trust)"
          : "var(--gold)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="color-mix(in srgb, var(--muted) 25%, transparent)"
            strokeWidth="8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-foreground">{score}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">/{max}</span>
        </div>
      </div>
      {label && <p className="text-xs font-semibold text-muted">{label}</p>}
    </div>
  );
}

type MetricProps = { label: string; value: number; max?: number };

export function MetricBar({ label, value, max = 10 }: MetricProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-bold text-achievement">{value}/{max}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
        <div
          className="h-full rounded-full bg-gradient-to-r from-achievement to-emerald-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
