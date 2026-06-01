import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getUserProfile, isUserPaid } from "@/lib/subscription";

export default async function CheckoutSuccessPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getUserProfile(session.user.id);
  if (!isUserPaid(profile)) {
    redirect("/checkout");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16 text-foreground md:py-24">
      <div className="mx-auto max-w-lg lux-card lux-topline gold-glow fade-up rounded-[2rem] p-8 text-center md:p-12">
        <div className="float mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/15 text-3xl text-gold gold-glow">
          ✓
        </div>
        <p className="eyebrow mt-6">Welcome to premium</p>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          Payment <span className="text-gold-gradient">successful</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Your full AI career package is now unlocked. Head to your dashboard to generate your complete roadmap,
          HR guidance, and unlimited analyses.
        </p>
        <Link href="/dashboard" className="btn-lux mt-8 inline-block rounded-xl px-8 py-3">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
