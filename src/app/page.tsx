import Link from "next/link";

const struggles = [
  {
    problem: "Degree done — but no clear next step",
    solution:
      "A personalized phased roadmap — daily, weekly, or monthly tasks based on your pace and prep level.",
  },
  {
    problem: "Nervous in HR round & \"Tell me about yourself\"",
    solution: "Record your intro, get scores, and a rewritten script you can practice at your own speed.",
  },
  {
    problem: "Empty resume or no real projects",
    solution: "Project ideas and resume tips matched to your target role (Frontend, Data, QA, etc.).",
  },
  {
    problem: "Don't know how to apply on Naukri / LinkedIn",
    solution: "Application habits, recruiter message templates, and fresher salary guidance — no fixed deadline.",
  },
];

const steps = [
  {
    n: "01",
    title: "Tell us where you are",
    desc: "Degree, target role, skill level — whether you're a final-year student or a fresh graduate with zero experience.",
  },
  {
    n: "02",
    title: "Get your preparation plan",
    desc: "AI builds a phased roadmap, HR answer scripts, and communication coaching — timed in days, weeks, or months to match you.",
  },
  {
    n: "03",
    title: "Practice and track progress",
    desc: "Mock HR interviews, voice analysis, and a readiness score. Progress depends on your consistency — we don't promise a job on a fixed schedule.",
  },
];

const features = [
  "\"Tell me about yourself\" coach with fluency & confidence scores",
  "Phased fresher roadmap (skills, projects, Naukri/LinkedIn strategy)",
  "3-round AI mock HR interview",
  "Copy-paste HR scripts & recruiter outreach messages",
  "Progress history & interview readiness score",
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="px-6 pb-20 pt-16 md:pb-28 md:pt-24">
        <main className="mx-auto flex max-w-6xl flex-col gap-10">
          <div className="lux-card lux-topline gold-glow fade-up rounded-[2.25rem] p-8 md:p-16">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-champagne">
              <span aria-hidden="true">✦</span>
              For college students &amp; fresh graduates
            </span>
            <h1 className="font-display mt-7 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-[4.25rem]">
              Finished college?{" "}
              <span className="text-lux italic">Here&apos;s what to do next.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
              Most freshers don&apos;t fail because they lack a degree — they fail because nobody showed them
              how to pick a role, build a portfolio, speak in interviews, and prepare for their first IT job.
              We help you learn and practice at your own pace; hiring timelines vary by person and market.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="btn-lux rounded-xl px-8 py-3.5 text-center"
              >
                Start free — get my plan
              </Link>
              <Link
                href="/login"
                className="btn-ghost rounded-xl px-8 py-3.5 text-center"
              >
                See how it works ↓
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { v: "Your pace", l: "Days, weeks, or months — not a fixed deadline" },
              { v: "5 min", l: "Setup — degree, role, skill level" },
              { v: "0 yrs", l: "Experience needed to start" },
            ].map((s, i) => (
              <div
                key={s.l}
                className="glass-card hover-lift fade-up rounded-2xl p-6 text-center"
                style={{ animationDelay: `${0.1 + i * 0.08}s` }}
              >
                <p className="font-display text-3xl font-semibold text-gold-gradient">{s.v}</p>
                <p className="mt-1.5 text-xs text-muted">{s.l}</p>
              </div>
            ))}
          </div>
        </main>
      </section>

      {/* Problems we solve */}
      <section className="border-t border-accent/10 bg-surface/40 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">The fresher trap</p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Sound familiar?</h2>
          <p className="mt-3 max-w-2xl text-muted">
            If you just completed college and feel stuck — you&apos;re exactly who we built this for.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {struggles.map((item, i) => (
              <article
                key={item.problem}
                className="glass-card hover-lift fade-up rounded-2xl p-6"
                style={{ animationDelay: `${0.05 + i * 0.08}s` }}
              >
                <p className="text-sm font-semibold text-urgency/90">{item.problem}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.solution}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">The journey</p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">How it works</h2>
          <p className="mt-3 max-w-xl text-muted">
            Three steps from &quot;I don&apos;t know what to do&quot; toward interview-ready — progress varies
            with how much you practice.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <article
                key={s.n}
                className="glass-card hover-lift fade-up rounded-2xl p-6"
                style={{ animationDelay: `${0.05 + i * 0.1}s` }}
              >
                <span className="font-display text-5xl font-semibold text-gold/30">{s.n}</span>
                <h3 className="font-display mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-accent/10 bg-surface/40 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-6xl lux-card lux-topline fade-up rounded-[2.25rem] p-8 md:p-14">
          <p className="eyebrow">The toolkit</p>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Tools to prepare for your first IT job
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Not generic advice — a plan built for your degree, role, and level. We coach preparation; we do
            not guarantee employment or a specific timeline.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-muted">
                <span className="mt-0.5 text-gold">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link href="/login" className="btn-lux mt-10 inline-block rounded-xl px-8 py-3.5">
            Get started — it&apos;s free
          </Link>
        </div>
      </section>
    </div>
  );
}
