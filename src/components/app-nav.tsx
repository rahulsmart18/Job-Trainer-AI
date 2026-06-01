"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { FeatureId } from "@/lib/features";
import { NAV_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/ui/nav-icon";

type Props = {
  userName: string;
  paid: boolean;
  unlockedFeatures: FeatureId[];
};

function NavLinks({
  pathname,
  unlocked,
  paid,
  onNavigate,
}: {
  pathname: string;
  unlocked: FeatureId[];
  paid: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const isPro = item.feature && !paid && !unlocked.includes(item.feature);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              active
                ? "bg-trust/15 text-foreground ring-1 ring-trust/30"
                : "text-muted hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <NavIcon
              name={item.icon}
              className={`h-5 w-5 shrink-0 transition ${active ? "text-trust" : "text-muted group-hover:text-foreground"}`}
            />
            <span className="flex-1 font-medium">{item.label}</span>
            {isPro && (
              <span className="rounded-full bg-premium/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-premium">
                Pro
              </span>
            )}
            {active && <span className="h-1.5 w-1.5 rounded-full bg-trust" />}
          </Link>
        );
      })}
    </nav>
  );
}

function UpgradeCard() {
  return (
    <Link
      href="/checkout?plan=full_bundle"
      className="block rounded-2xl border border-premium/25 bg-premium/8 p-4 transition hover:border-premium/40 hover:bg-premium/12"
    >
      <p className="flex items-center gap-1.5 text-sm font-semibold text-premium">
        <NavIcon name="spark" className="h-4 w-4" /> Go Premium
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Unlock the full roadmap, unlimited mock interviews, and detailed feedback.
      </p>
    </Link>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-trust/15 ring-1 ring-trust/30">
        <NavIcon name="spark" className="h-5 w-5 text-trust" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Job Trainer</span>
    </Link>
  );
}

function UserFooter({ userName, paid }: { userName: string; paid: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-foreground/10 pt-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{userName}</p>
        <p className="text-xs text-muted">{paid ? "Premium member" : "Free plan"}</p>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="shrink-0 rounded-lg border border-foreground/15 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-urgency/40 hover:text-urgency"
      >
        Sign out
      </button>
    </div>
  );
}

export function AppNav({ userName, paid, unlockedFeatures }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col gap-6 border-r border-foreground/10 bg-surface/40 px-4 py-6 backdrop-blur-xl lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavLinks pathname={pathname} unlocked={unlockedFeatures} paid={paid} />
        </div>
        {!paid && <UpgradeCard />}
        <UserFooter userName={userName} paid={paid} />
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-foreground/10 bg-surface/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground/15 text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            {menuOpen ? <path d="M6 6l12 12M6 18 18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {/* ---------- Mobile slide-over ---------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />
          <div className="absolute right-0 top-0 flex h-full w-[280px] flex-col gap-5 border-l border-foreground/10 bg-surface px-4 py-6 fade-up">
            <Brand />
            <div className="flex-1 overflow-y-auto">
              <NavLinks
                pathname={pathname}
                unlocked={unlockedFeatures}
                paid={paid}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>
            {!paid && <UpgradeCard />}
            <UserFooter userName={userName} paid={paid} />
          </div>
        </div>
      )}
    </>
  );
}
