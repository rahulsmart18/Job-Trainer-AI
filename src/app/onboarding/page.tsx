import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { OnboardingForm } from "@/components/onboarding-form";
import { isDevBypass } from "@/lib/dev-access";
import { getOnboardingStatus } from "@/lib/profile";

type Props = {
  searchParams: Promise<{ dev?: string; reset?: string; edit?: string }>;
};

export default async function OnboardingPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  const devMode = isDevBypass(params);
  const status = await getOnboardingStatus(session.user.id);
  const editMode = params.edit === "1" && status.complete;

  if (status.complete && !devMode && !editMode) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen px-6 py-10 text-foreground md:py-16">
      <div className="mx-auto max-w-2xl lux-card lux-topline glow-border fade-up rounded-[2rem] p-8 md:p-10">
        {devMode && (
          <p className="mb-4 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs font-medium text-gold">
            Dev mode — viewing onboarding even though your profile is complete. Saved answers still go to
            /dashboard. Use{" "}
            <code className="rounded bg-surface-elevated px-1">/onboarding?dev=1</code> anytime while developing.
          </p>
        )}
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-champagne">
          <span aria-hidden="true">✦</span>
          {editMode ? "Edit your details" : "Step 1 of your first-job journey"}
        </span>
        <h1 className="font-display mt-5 text-3xl font-semibold tracking-tight md:text-4xl">
          {editMode ? (
            <>
              Update your <span className="text-gold-gradient">career &amp; details</span>
            </>
          ) : (
            <>
              Let&apos;s figure out your <span className="text-gold-gradient">next step</span> after college
            </>
          )}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {editMode ? (
            <>
              Change your target career, role, skills, or anything you missed. Your saved answers are
              pre-filled — update what you need and save. Your plan and coaching will adjust to match.
            </>
          ) : (
            <>
              Hi {session.user.name ?? "there"} — answer 5 short sections (about 12 questions total) about your
              degree, goals, skills, and challenges. We use this to build preparation plans and HR coaching
              matched to you — progress depends on your time and effort, not a fixed schedule.
            </>
          )}
        </p>

        {editMode && (
          <Link
            href="/dashboard"
            className="link-underline mt-4 inline-block text-sm font-medium text-muted hover:text-foreground"
          >
            ← Back to dashboard without saving
          </Link>
        )}

        <OnboardingForm defaultName={session.user.name ?? ""} editMode={editMode} />
      </div>
    </div>
  );
}
