import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { CheckoutClient } from "@/components/checkout/checkout-client";
import { TrustIndicators } from "@/components/trust-indicators";
import { isDevBypass } from "@/lib/dev-access";
import { getUserProfile, hasFullBundle } from "@/lib/subscription";

type Props = {
  searchParams: Promise<{ dev?: string }>;
};

export default async function CheckoutPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (!session?.user) {
    redirect("/login");
  }

  const devMode = isDevBypass(params);
  const profile = await getUserProfile(session.user.id);

  if (hasFullBundle(profile) && !devMode) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen px-6 py-10 text-foreground md:py-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        {devMode && (
          <p className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-xs font-medium text-gold">
            Dev mode — previewing checkout even with a full bundle. Use{" "}
            <code className="rounded bg-surface-elevated px-1">/checkout?dev=1</code> while developing.
          </p>
        )}
        <TrustIndicators />
        <div className="lux-card lux-topline glow-border fade-up rounded-[2rem] p-8 md:p-12">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-20">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
              </div>
            }
          >
            <CheckoutClient devMode={devMode} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
