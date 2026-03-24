"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="rounded-xl border border-primary/30 bg-white/70 px-4 py-2 font-semibold text-primary transition hover:bg-primary/10 dark:bg-slate-900/50"
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </button>
  );
}
