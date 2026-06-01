"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TrialStatus } from "@/lib/trial";
import { TRIAL_DAYS, TRIAL_FULL_PRICE_INR, TRIAL_MANDATE_INR } from "@/lib/trial-constants";
import { PremiumFeatures } from "@/components/premium-features";
import type { FeatureId } from "@/lib/features";

type Props = {
  trial: TrialStatus;
  unlockedFeatures: FeatureId[];
  recommendedPlan: string;
  paymentTitle: string;
  paymentSubtitle: string;
};

export function TrialStartCard({
  trial,
  unlockedFeatures,
  recommendedPlan,
  paymentTitle,
  paymentSubtitle,
}: Props) {
  const router = useRouter();
  const [acceptAutoPay, setAcceptAutoPay] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (trial.hasPremiumAccess || !trial.eligible) return null;

  const startTrial = async () => {
    if (!acceptAutoPay) {
      setError("Enable auto-pay to start the trial. Without it, only limited free tools are available.");
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptAutoPay: true, planId: "full_bundle" }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not start trial.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="premium-card premium-glow lux-topline scroll-mt-24 rounded-[2rem] p-6 md:p-8">
      <p className="eyebrow">Final step</p>
      <h2 className="font-display mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{paymentTitle}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{paymentSubtitle}</p>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <PremiumFeatures compact unlockedFeatures={unlockedFeatures} />

        <div className="flex flex-col justify-center gap-4">
          <div className="rounded-xl bg-background/60 p-4 text-sm leading-relaxed text-muted">
            <p className="font-semibold text-foreground">How the {TRIAL_DAYS}-day trial works</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>₹{TRIAL_MANDATE_INR} mandate verify now (demo — no real charge in dev)</li>
              <li>Full access to every tool for {TRIAL_DAYS} days</li>
              <li>Cancel anytime before trial ends — no ₹{TRIAL_FULL_PRICE_INR} charge</li>
              <li>After {TRIAL_DAYS} days, auto-debit ₹{TRIAL_FULL_PRICE_INR} unless you cancel</li>
            </ul>
            <p className="mt-3 text-xs">
              Without enabling auto-pay, you stay on the free tier (limited comm. & mock tries).
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-premium/30 bg-premium/5 p-4">
            <input
              type="checkbox"
              checked={acceptAutoPay}
              onChange={(e) => {
                setAcceptAutoPay(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              className="mt-1 h-4 w-4 accent-premium"
            />
            <span className="text-sm leading-relaxed">
              I enable auto-pay after my {TRIAL_DAYS}-day trial (₹{TRIAL_FULL_PRICE_INR}/month). I can cancel
              anytime during the trial to avoid being charged.
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="button"
            onClick={startTrial}
            disabled={starting || !acceptAutoPay}
            className="btn-lux rounded-xl px-8 py-3.5 text-base disabled:cursor-not-allowed disabled:opacity-50"
          >
            {starting ? "Starting trial…" : `Start ${TRIAL_DAYS}-day full trial`}
          </button>

          <Link
            href={`/checkout?plan=${recommendedPlan}`}
            className="text-center text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Or buy a plan without trial
          </Link>
        </div>
      </div>
    </div>
  );
}
