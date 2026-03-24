"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="min-h-screen px-6 py-16 text-foreground md:py-24">
      <div className="mx-auto max-w-md rounded-[2rem] border border-white/50 bg-surface/85 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-black tracking-tight">Welcome to Job Trainer AI</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Sign in with Google to start onboarding and get your personalized job
          roadmap.
        </p>
        <div className="mt-8">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-primary to-secondary px-4 py-3 font-semibold text-white shadow-lg shadow-primary/30 transition hover:translate-y-[-1px]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M21.805 10.023h-9.18v3.955h5.27c-.227 1.27-.908 2.347-1.93 3.064v2.54h3.12c1.827-1.682 2.72-4.16 2.72-7.104 0-.813-.073-1.594-.2-2.355z" />
              <path d="M12.625 22c2.61 0 4.8-.865 6.4-2.336l-3.12-2.54c-.867.582-1.975.926-3.28.926-2.52 0-4.654-1.7-5.417-3.99H4.003v2.633A9.657 9.657 0 0 0 12.625 22z" />
              <path d="M7.208 14.06a5.79 5.79 0 0 1-.303-1.81c0-.63.11-1.24.303-1.81V7.807H4.003A9.657 9.657 0 0 0 3 12.25c0 1.56.374 3.037 1.003 4.443L7.208 14.06z" />
              <path d="M12.625 6.45c1.42 0 2.695.49 3.7 1.45l2.775-2.775C17.42 3.56 15.234 2.5 12.625 2.5A9.657 9.657 0 0 0 4.003 7.807l3.205 2.633c.763-2.29 2.896-3.99 5.417-3.99z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
