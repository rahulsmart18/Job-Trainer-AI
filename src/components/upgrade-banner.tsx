import Link from "next/link";
import { PremiumFeatures } from "@/components/premium-features";

type Props = {
  unlockedFeatures?: string[];
};

export function UpgradeBanner({ unlockedFeatures = [] }: Props) {
  const remaining = 4 - unlockedFeatures.length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <PremiumFeatures compact unlockedFeatures={unlockedFeatures} />

      <div className="premium-card premium-glow flex flex-col justify-center rounded-[2rem] p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-premium">Upgrade when ready</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">
          {remaining === 4
            ? "Pick 1 feature, 2 features, or the full bundle"
            : `${remaining} feature${remaining === 1 ? "" : "s"} still locked`}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          You&apos;ve tried the free preview. Unlock roadmap projects, unlimited mock interviews, HR scripts,
          or get all 4 in one bundle — outcomes depend on your practice, not a fixed timeline.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-muted">
          <li>✓ Roadmap only — from ₹499</li>
          <li>✓ Interview Pack (mock + HR) — from ₹799</li>
          <li>✓ Full Bundle (all 4) — best value from ₹999</li>
        </ul>
        <Link
          href="/checkout"
          className="btn-action mt-6 inline-block rounded-xl px-8 py-3.5 text-center text-base font-bold"
        >
          Compare plans
        </Link>
        <p className="mt-3 text-center text-xs text-muted">Spin for up to 80% off · No job guarantees</p>
      </div>
    </div>
  );
}
