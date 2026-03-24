export default function Home() {
  return (
    <div className="min-h-screen px-6 py-16 text-foreground md:py-24">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 rounded-[2rem] border border-white/50 bg-surface/80 p-8 shadow-2xl backdrop-blur-xl md:p-14">
        <span className="w-fit rounded-full border border-accent/20 bg-accent/10 px-4 py-1 text-sm font-semibold text-accent">
          Job Trainer AI
        </span>
        <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
          Freshers to job-ready candidates with AI-driven coaching.
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted md:text-lg">
          Build communication confidence, get a personalized roadmap, practice
          HR conversations, and track your progress in one dashboard.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            href="/login"
            className="rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 text-center font-semibold text-white shadow-lg shadow-primary/30 transition hover:translate-y-[-1px]"
          >
            Continue with Google
          </a>
          <a
            href="/dashboard"
            className="rounded-xl border border-primary/30 bg-white/70 px-6 py-3 text-center font-semibold text-primary transition hover:bg-primary/10 dark:bg-slate-900/50"
          >
            Open Dashboard
          </a>
        </div>
      </main>
    </div>
  );
}
