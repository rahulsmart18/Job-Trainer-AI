import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen px-6 py-10 text-foreground md:py-16">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/50 bg-surface/85 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="text-3xl font-black tracking-tight">Onboarding</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Hi {session.user.name ?? "there"}, tell us about your education,
          target role, and current level. This data will power your AI roadmap.
        </p>

        <OnboardingForm defaultName={session.user.name ?? ""} />
      </div>
    </div>
  );
}
