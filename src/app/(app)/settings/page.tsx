import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getWorkspace } from "@/lib/app-data";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-foreground/8 py-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const { ctx, userName, paid, trial } = await getWorkspace();

  return (
    <div className="space-y-6">
      <PageHeader crumb="Settings" title="Settings" subtitle="Manage your details and your plan." />

      {/* Career details */}
      <section className="rounded-3xl border border-foreground/8 bg-surface-elevated/40 p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Career details</h2>
          <Link
            href="/onboarding?edit=1"
            className="rounded-xl border border-trust/30 bg-trust/10 px-4 py-2 text-sm font-semibold text-trust transition hover:bg-trust/15"
          >
            Edit details
          </Link>
        </div>
        <div className="mt-3">
          <Row label="Name" value={userName} />
          <Row label="Degree" value={ctx.degree} />
          <Row label="Target role" value={ctx.interestedRole} />
          <Row label="Focus area" value={ctx.targetDomain} />
          <Row label="Career goal" value={ctx.careerPreference} />
          <Row label="City" value={ctx.city} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Changed your mind about your career? Editing your details updates your plan and coaching.
        </p>
      </section>

      {/* Plan */}
      <section className="rounded-3xl border border-foreground/8 bg-surface-elevated/40 p-5 md:p-6">
        <h2 className="font-display text-lg font-semibold">Your plan</h2>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              {paid ? (trial.isTrialing ? "Premium trial" : "Premium") : "Free plan"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {paid
                ? "You have full access to roadmap depth, unlimited practice, and detailed feedback."
                : "Basic analysis, a limited roadmap preview, and a few mock interview attempts."}
            </p>
          </div>
          {!paid && (
            <Link
              href="/checkout?plan=full_bundle"
              className="btn-premium press shrink-0 rounded-xl px-4 py-2.5 text-sm"
            >
              Upgrade
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
