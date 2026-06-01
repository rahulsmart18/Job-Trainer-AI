import Link from "next/link";
import { FEATURES, FEATURE_IDS } from "@/lib/features";

const FEATURE_LIST = FEATURE_IDS.map((id) => FEATURES[id]);

type Props = {
  compact?: boolean;
  unlockedFeatures?: string[];
};

export function PremiumFeatures({ compact = false, unlockedFeatures = [] }: Props) {
  const unlocked = new Set(unlockedFeatures);

  return (
    <div className={`premium-card rounded-[2rem] ${compact ? "p-5" : "p-6 md:p-8"}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          🔒
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-premium">4 premium features</p>
      </div>
      <h2 className="mt-2 text-xl font-black tracking-tight md:text-2xl">
        {unlocked.size > 0 ? "Your unlocked features" : "What you unlock when you upgrade"}
      </h2>

      <ul className="mt-5 space-y-2.5">
        {FEATURE_LIST.map((feature) => {
          const isUnlocked = unlocked.has(feature.id);
          return (
            <li
              key={feature.id}
              className={`flex items-start gap-2.5 text-sm ${isUnlocked ? "" : "opacity-80"}`}
            >
              <span className="mt-0.5 text-premium">{isUnlocked ? "✓" : "○"}</span>
              <div>
                <span className="font-semibold text-foreground">{feature.label}</span>
                <p className="text-xs text-muted">{feature.description}</p>
              </div>
              {isUnlocked && (
                <span className="ml-auto shrink-0 rounded-full bg-achievement/15 px-2 py-0.5 text-[10px] font-bold uppercase text-achievement">
                  Active
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {!compact && unlocked.size < 4 && (
        <Link href="/checkout" className="btn-action mt-6 inline-block rounded-xl px-6 py-3 text-sm font-bold">
          Compare plans
        </Link>
      )}
    </div>
  );
}
