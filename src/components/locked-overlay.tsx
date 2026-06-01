"use client";

import Link from "next/link";

type Props = {
  upgradeUrl?: string;
  projectTeaser?: string;
};

export function LockedOverlay({ upgradeUrl = "/checkout", projectTeaser }: Props) {
  return (
    <div className="premium-card premium-glow relative mt-6 overflow-hidden rounded-2xl p-8 text-center">
      <div className="pointer-events-none absolute inset-0 bg-premium/5 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="relative">
        <p className="text-lg font-bold">
          <span aria-hidden="true">🔒</span> Premium content locked
        </p>
        <p className="mt-2 text-sm text-muted">
          {projectTeaser ??
            "Don&apos;t worry — your full project plan, HR scripts, and unlimited practice are ready. Unlock to see everything matched to your profile."}
        </p>
        <Link href={upgradeUrl} className="btn-action mt-5 inline-block rounded-xl px-8 py-3 font-bold">
          Compare plans
        </Link>
      </div>
    </div>
  );
}
