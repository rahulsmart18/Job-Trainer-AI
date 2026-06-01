"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TrialStatus } from "@/lib/trial";
import { TRIAL_FULL_PRICE_INR } from "@/lib/trial-constants";

type Props = {
  trial: TrialStatus;
};

export function TrialBanner({ trial }: Props) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!trial.isTrialing) return null;

  const cancelTrial = async () => {
    if (!confirm(`Cancel your trial? You keep free-tier limits only — no ₹${TRIAL_FULL_PRICE_INR} charge.`)) {
      return;
    }
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/trial", { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not cancel trial.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="lux-card lux-topline glow-border rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">Full access trial</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            You have full premium access. You can cancel anytime to return to the free plan.
          </p>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
        <button
          type="button"
          onClick={cancelTrial}
          disabled={cancelling}
          className="shrink-0 rounded-xl border border-muted/30 px-5 py-2.5 text-sm font-semibold text-muted transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
        >
          {cancelling ? "Cancelling…" : "Cancel trial — no charge"}
        </button>
      </div>
    </div>
  );
}
