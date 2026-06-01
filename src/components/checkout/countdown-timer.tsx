"use client";

import { useEffect, useState } from "react";

type Props = {
  expiresAt: string | null;
  onExpired?: () => void;
  label?: string;
  expiredLabel?: string;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CountdownTimer({
  expiresAt,
  onExpired,
  label = "Limited offer expires in",
  expiredLabel = "Offer expired — standard price applies",
}: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(ms);
      if (ms <= 0) onExpired?.();
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, onExpired]);

  if (!expiresAt || remaining === null) return null;

  const expired = remaining <= 0;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-center ${
        expired
          ? "border-muted/40 bg-muted/10 text-muted"
          : "border-red-300/60 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider">
        {expired ? expiredLabel : label}
      </p>
      {!expired && <p className="mt-1 text-2xl font-black tabular-nums">{formatTime(remaining)}</p>}
    </div>
  );
}
