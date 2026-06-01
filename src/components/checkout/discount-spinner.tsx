"use client";

import { useState } from "react";
import { SPIN_JACKPOT_DISCOUNT } from "@/lib/checkout-constants";
import { Spinner } from "@/components/ui/spinner";

const SEGMENTS = [
  { label: "10%", color: "#2c2c2c", textColor: "#ffffff" },
  { label: "20%", color: "#612d53", textColor: "#ffffff" },
  { label: "50%", color: "#853953", textColor: "#ffffff" },
  { label: "80%", color: "#f59e0b", textColor: "#1a1a1a" },
];

const TEASE_MESSAGES = [
  "Checking your luck...",
  "10% — not quite!",
  "20% — keep going!",
  "50% — so close!",
  "🎉 JACKPOT! 80% OFF unlocked!",
];

type Props = {
  disabled?: boolean;
  hasSpun: boolean;
  currentDiscount: number;
  devMode?: boolean;
  onSpinComplete: (discountPercent: number, offerExpiresAt: string | null) => void;
};

function rotationForSegment(index: number, extraTurns: number): number {
  const segmentAngle = 360 / SEGMENTS.length;
  return 360 * extraTurns + (360 - index * segmentAngle - segmentAngle / 2);
}

export function DiscountSpinner({ disabled, hasSpun, currentDiscount, devMode = false, onSpinComplete }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [teaseIndex, setTeaseIndex] = useState(hasSpun ? 4 : 0);
  const [won, setWon] = useState(hasSpun && currentDiscount >= SPIN_JACKPOT_DISCOUNT);

  const spin = async () => {
    if (disabled || spinning || hasSpun) return;

    setSpinning(true);
    setTeaseIndex(0);

    try {
      const spinUrl = devMode ? "/api/checkout/spin?dev=1" : "/api/checkout/spin";
      const response = await fetch(spinUrl, { method: "POST" });
      const json = (await response.json()) as {
        discountPercent?: number;
        offerExpiresAt?: string | null;
        error?: string;
      };
      if (!response.ok || json.discountPercent === undefined) {
        throw new Error(json.error ?? "Spin failed.");
      }

      const discount = json.discountPercent;
      const jackpotIndex = SEGMENTS.findIndex((s) => s.label === `${SPIN_JACKPOT_DISCOUNT}%`);
      const safeJackpot = jackpotIndex >= 0 ? jackpotIndex : SEGMENTS.length - 1;

      const stages = [
        { index: 0, turns: 3, delay: 1200, msg: 1 },
        { index: 1, turns: 4, delay: 1200, msg: 2 },
        { index: 2, turns: 5, delay: 1200, msg: 3 },
        { index: safeJackpot, turns: 7, delay: 2200, msg: 4 },
      ];

      let elapsed = 0;
      for (const stage of stages) {
        window.setTimeout(() => {
          setRotation(rotationForSegment(stage.index, stage.turns));
          setTeaseIndex(stage.msg);
        }, elapsed);
        elapsed += stage.delay;
      }

      window.setTimeout(() => {
        setWon(true);
        setSpinning(false);
        onSpinComplete(discount, json.offerExpiresAt ?? null);
      }, elapsed + 400);
    } catch {
      setSpinning(false);
    }
  };

  if (won) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-4 border-gold bg-gradient-to-br from-amber-400 to-primary shadow-xl">
          <span className="text-4xl font-black text-white drop-shadow">{SPIN_JACKPOT_DISCOUNT}%</span>
          <span className="text-sm font-bold uppercase tracking-wider text-white/90">OFF</span>
        </div>
        <p className="text-center text-sm font-bold text-gold">{TEASE_MESSAGES[4]}</p>
        <div className="w-full rounded-xl border border-gold/40 bg-gradient-to-r from-amber-50 to-primary/10 p-4 text-center dark:from-amber-950/30 dark:to-primary/20">
          <p className="text-lg font-black text-primary">Congratulations!</p>
          <p className="mt-1 text-sm text-muted">
            You unlocked an exclusive <span className="font-bold text-gold">{SPIN_JACKPOT_DISCOUNT}% discount</span>.
            This offer is reserved for you — claim it before the timer runs out.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-56 w-56">
        <div className="absolute -top-1 left-1/2 z-20 -translate-x-1/2 text-2xl text-gold drop-shadow">▼</div>

        <div
          className="absolute inset-0 rounded-full border-4 border-white shadow-xl ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? "transform 1.1s cubic-bezier(0.2, 0.8, 0.3, 1)" : "transform 0.4s ease-out",
            background: `conic-gradient(from -90deg, ${SEGMENTS.map((s, i) => {
              const start = (i / SEGMENTS.length) * 100;
              const end = ((i + 1) / SEGMENTS.length) * 100;
              return `${s.color} ${start}% ${end}%`;
            }).join(", ")})`,
          }}
        >
          {SEGMENTS.map((segment, i) => {
            const midAngle = i * 90 + 45;
            return (
              <div
                key={segment.label}
                className="absolute left-1/2 top-1/2 h-0 w-0"
                style={{ transform: `rotate(${midAngle}deg)` }}
              >
                <span
                  className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-base font-black"
                  style={{
                    top: -88,
                    color: segment.textColor,
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  }}
                >
                  {segment.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-surface text-xs font-black shadow-lg">
          {spinning ? "…" : "SPIN"}
        </div>
      </div>

      {spinning && (
        <p className="min-h-[2.5rem] text-center text-sm font-bold text-gold">{TEASE_MESSAGES[teaseIndex]}</p>
      )}

      <button
        type="button"
        onClick={spin}
        disabled={disabled || spinning || hasSpun}
        className="btn-lux press rounded-xl px-8 py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {spinning ? <Spinner onLux label="Spinning…" /> : "Spin to unlock your exclusive price"}
      </button>
    </div>
  );
}
