"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CountdownTimer } from "@/components/checkout/countdown-timer";
import { DiscountSpinner } from "@/components/checkout/discount-spinner";
import { UnlockButton } from "@/components/checkout/unlock-button";
import { SPIN_JACKPOT_DISCOUNT } from "@/lib/checkout-constants";
import { FEATURES, type CheckoutPlanId } from "@/lib/features";
import { withDevQuery } from "@/lib/dev-access";

type PlanPrice = {
  id: CheckoutPlanId;
  name: string;
  tagline: string;
  highlightStat: string;
  badge: string | null;
  featureCount: number;
  features: string[];
  formattedAnchor: string;
  formattedBase: string;
  formattedFinal: string;
  finalPrice: number;
  basePrice: number;
};

type CheckoutState = {
  paid: boolean;
  devMode?: boolean;
  unlockedFeatures: string[];
  selectedPlanId: CheckoutPlanId;
  selectedPlan: PlanPrice;
  plans: PlanPrice[];
  discountPercent: number;
  offerExpiresAt: string | null;
  hasSpun: boolean;
};

export function CheckoutClient({ devMode = false }: { devMode?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan");
  const devFromUrl = devMode || searchParams.get("dev") === "1";

  const [state, setState] = useState<CheckoutState | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<CheckoutPlanId>("full_bundle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshSession = useCallback(async (planId: CheckoutPlanId, discountPercent: number) => {
    const createResponse = await fetch(withDevQuery("/api/checkout", devFromUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    });
    const createJson = (await createResponse.json()) as { sessionId?: string; error?: string };
    if (createResponse.ok && createJson.sessionId) {
      setSessionId(createJson.sessionId);
    }
    return discountPercent;
  }, [devFromUrl]);

  const loadCheckout = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const planQuery = initialPlan ? `plan=${initialPlan}` : "";
      const devPart = devFromUrl ? (planQuery ? "&dev=1" : "dev=1") : "";
      const query = planQuery || devPart ? `?${[planQuery, devPart].filter(Boolean).join("&")}` : "";
      const statusResponse = await fetch(`/api/checkout${query}`);
      const statusJson = (await statusResponse.json()) as CheckoutState & { error?: string };
      if (!statusResponse.ok) throw new Error(statusJson.error ?? "Failed to load checkout.");

      if (statusJson.paid && statusJson.unlockedFeatures.length >= 4 && !devFromUrl) {
        router.replace("/dashboard");
        return;
      }

      setState(statusJson);
      setSelectedPlanId(statusJson.selectedPlanId);

      if (statusJson.hasSpun) {
        await refreshSession(statusJson.selectedPlanId, statusJson.discountPercent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load checkout.");
    } finally {
      setLoading(false);
    }
  }, [router, refreshSession, initialPlan, devFromUrl]);

  useEffect(() => {
    void loadCheckout();
  }, [loadCheckout]);

  const selectPlan = async (planId: CheckoutPlanId) => {
    setSelectedPlanId(planId);
    if (!state?.hasSpun) return;
    const plan = state.plans.find((p) => p.id === planId);
    if (plan) {
      await refreshSession(planId, state.discountPercent);
    }
  };

  const onSpinComplete = async (discountPercent: number, offerExpiresAt: string | null) => {
    setState((prev) => {
      if (!prev) return prev;
      const plans = prev.plans.map((p) => ({
        ...p,
        finalPrice: Math.round(p.basePrice * (1 - discountPercent / 100)),
        formattedFinal: formatDiscountPrice(p.basePrice, discountPercent),
      }));
      const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0];
      return {
        ...prev,
        discountPercent,
        hasSpun: true,
        offerExpiresAt,
        plans,
        selectedPlan,
      };
    });
    await refreshSession(selectedPlanId, discountPercent);
  };

  if (loading) {
    return (
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <span className="skeleton block h-8 w-2/3" />
          <span className="skeleton block h-4 w-full" />
          <div className="mt-2 grid gap-3">
            <span className="skeleton block h-20" />
            <span className="skeleton block h-20" />
            <span className="skeleton block h-20" />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <span className="skeleton mx-auto block h-56 w-56 rounded-full" />
          <span className="skeleton block h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error || !state) {
    return <p className="rounded-xl bg-urgency/10 p-4 text-sm text-urgency">{error || "Something went wrong."}</p>;
  }

  const selectedPlan = state.plans.find((p) => p.id === selectedPlanId) ?? state.selectedPlan;
  const showOffer = state.hasSpun && state.discountPercent > 0;
  const unlocked = new Set(state.unlockedFeatures);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <div>
          <p className="eyebrow">Upgrade when you&apos;re ready</p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Pick 1 feature, 2 features, or <span className="text-gold-gradient">all 4</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            You&apos;ve tried the free preview. Choose what you need — roadmap projects, interview practice,
            HR scripts, or the full bundle. Progress depends on your effort, not a fixed job timeline.
          </p>
        </div>

        <div className="grid gap-3">
          {state.plans.map((plan) => {
            const active = plan.id === selectedPlanId;
            const alreadyOwned = plan.features.every((f) => unlocked.has(f));
            return (
              <button
                key={plan.id}
                type="button"
                disabled={alreadyOwned}
                onClick={() => void selectPlan(plan.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  alreadyOwned
                    ? "cursor-not-allowed border-achievement/30 bg-achievement/5 opacity-70"
                    : active
                      ? "border-gold/50 bg-gold/10 ring-2 ring-gold/25 gold-glow"
                      : "inner-card hover:border-gold/30 hover:bg-gold/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">{plan.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{plan.tagline}</p>
                    <p className="mt-2 text-sm font-semibold text-gold">{plan.highlightStat}</p>
                  </div>
                  <div className="text-right">
                    {plan.badge && (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                        {plan.badge}
                      </span>
                    )}
                    <p className="font-display mt-1 text-lg font-semibold">
                      {showOffer ? plan.formattedFinal : plan.featureCount === 4 ? "Best value" : `${plan.featureCount} features`}
                    </p>
                    {alreadyOwned && (
                      <p className="text-[10px] font-semibold text-achievement">Owned</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selectedPlanId === "full_bundle" && (
          <div className="inner-card overflow-hidden p-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-trust/15 bg-trust/5">
                  <th className="p-3 font-semibold">Feature</th>
                  <th className="p-3 text-center font-semibold">Free</th>
                  <th className="p-3 text-center font-semibold">1–2 pack</th>
                  <th className="p-3 text-center font-semibold text-premium">Full bundle</th>
                </tr>
              </thead>
              <tbody>
                {(["roadmap", "communication", "mock_interview", "hr_scripts"] as const).map((id) => (
                  <tr key={id} className="border-b border-trust/10">
                    <td className="p-3">{FEATURES[id].shortLabel}</td>
                    <td className="p-3 text-center text-muted">Preview</td>
                    <td className="p-3 text-center text-muted">
                      {id === "roadmap" ? "✓" : id === "communication" ? "2 tries" : id === "mock_interview" || id === "hr_scripts" ? "✓ pack" : "—"}
                    </td>
                    <td className="p-3 text-center font-bold text-premium">Unlimited</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(selectedPlanId === "roadmap" || selectedPlanId === "interview_pack") && (
          <div className="rounded-2xl border border-gold/25 bg-gold/5 p-4">
            <p className="font-display text-2xl font-semibold text-gold-gradient">{selectedPlan.highlightStat}</p>
            <p className="mt-1 text-sm text-muted">
              {selectedPlanId === "roadmap"
                ? "Don&apos;t worry about projects — your full step-by-step build plan unlocks here."
                : "Practice HR rounds safely before real interviews — unlimited after unlock."}
            </p>
          </div>
        )}

        <div className="inner-card p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              {showOffer ? (
                <>
                  <p className="text-sm text-muted line-through">{selectedPlan.formattedAnchor}</p>
                  <p className="text-sm text-muted line-through">{selectedPlan.formattedBase}</p>
                  <p className="font-display mt-1 text-4xl font-semibold text-gold-gradient">{selectedPlan.formattedFinal}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted line-through">{selectedPlan.formattedAnchor}</p>
                  <p className="font-display mt-1 text-3xl font-semibold text-muted blur-[3px] select-none">₹?,???</p>
                  <p className="mt-1 text-xs font-medium text-gold">Spin the wheel to reveal your price</p>
                </>
              )}
            </div>
            {showOffer && (
              <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold">
                {state.discountPercent}% OFF
              </span>
            )}
          </div>
        </div>

        {showOffer && (
          <CountdownTimer
            expiresAt={state.offerExpiresAt}
            label="Your 80% offer expires in"
            expiredLabel="Offer expired — price may increase"
          />
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div className="lux-card lux-topline rounded-2xl p-5">
          <h3 className="font-display text-center text-lg font-semibold text-gold-gradient">Spin for your exclusive discount</h3>
          <p className="mt-1 text-center text-xs text-muted">One spin only · Up to {SPIN_JACKPOT_DISCOUNT}% off</p>
          <div className="mt-4">
            <DiscountSpinner
              disabled={loading}
              hasSpun={state.hasSpun}
              currentDiscount={state.discountPercent}
              devMode={devFromUrl}
              onSpinComplete={onSpinComplete}
            />
          </div>
        </div>

        {showOffer && (
          <UnlockButton
            formattedAmount={selectedPlan.formattedFinal}
            planName={selectedPlan.name}
            sessionId={sessionId}
          />
        )}

        {!showOffer && (
          <p className="text-center text-xs text-muted">
            Spin the wheel first to reveal your price and unlock checkout.
          </p>
        )}
      </div>
    </div>
  );
}

function formatDiscountPrice(basePrice: number, discountPercent: number): string {
  const final = Math.max(0, Math.round(basePrice * (1 - discountPercent / 100)));
  return formatInr(final);
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    amount,
  );
}
