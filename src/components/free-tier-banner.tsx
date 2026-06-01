"use client";

import Link from "next/link";
import type { UsageSnapshot } from "@/types/communication";

type Props = {
  usage: UsageSnapshot | null;
  paid: boolean;
};

export function FreeTierBanner({ usage, paid }: Props) {
  if (paid || !usage) return null;

  const comm = usage.communication;
  const mock = usage.mockInterview;

  return (
    <div className="trust-card glow-border rounded-[2rem] p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-trust">Free trial active</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Try the tools first — upgrade when you&apos;re ready. Your AI Career Twin shows gaps honestly;
            full project plans and unlimited practice unlock with Premium.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <div className="rounded-xl bg-achievement/10 px-4 py-2 text-center">
            <p className="text-2xl font-black text-achievement">
              {comm.unlimited ? "∞" : comm.remaining}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Comm. {comm.unlimited ? "unlimited" : "tries left"}
            </p>
          </div>
          <div className="rounded-xl bg-trust/10 px-4 py-2 text-center">
            <p className="text-2xl font-black text-trust">
              {mock.unlimited ? "∞" : mock.remaining}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Mock {mock.unlimited ? "unlimited" : "tries left"}
            </p>
          </div>
          <Link href="/checkout" className="btn-action self-center rounded-xl px-5 py-2.5 text-sm font-bold">
            Final step: plans
          </Link>
        </div>
      </div>
    </div>
  );
}
