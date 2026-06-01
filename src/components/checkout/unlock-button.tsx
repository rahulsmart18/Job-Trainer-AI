"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  formattedAmount: string;
  planName?: string;
  sessionId: string | null;
  disabled?: boolean;
};

export function UnlockButton({ formattedAmount, planName = "Plan", sessionId, disabled }: Props) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const unlock = async () => {
    if (!sessionId) {
      setError("Please wait a moment and try again.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const json = (await response.json()) as { ok?: boolean; error?: string; redirectUrl?: string };
      if (!response.ok || !json.ok) {
        throw new Error(json.error ?? "Unlock failed.");
      }

      window.location.href = json.redirectUrl ?? "/checkout/success";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="premium-card premium-glow rounded-2xl p-5 md:p-6">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-premium">
        Your full prep package
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        Full roadmap, HR scripts, confidence tracking, and AI coaching — tools to prepare for interviews at
        your own pace.
      </p>

      <button
        type="button"
        onClick={unlock}
        disabled={processing || !sessionId || disabled}
        className="btn-lux press mt-5 w-full rounded-xl px-4 py-4 text-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        {processing ? <Spinner onLux label="Unlocking your access…" /> : `Unlock ${planName} — ${formattedAmount}`}
      </button>

      <p className="mt-3 text-center text-[11px] text-muted">
        Instant unlock · One-time access · No card required during beta
      </p>

      {error && <p className="mt-3 rounded-xl bg-urgency/10 p-3 text-sm text-urgency">{error}</p>}
    </div>
  );
}
