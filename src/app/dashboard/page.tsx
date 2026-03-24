import { CommunicationAnalyzer } from "@/components/communication-analyzer";
import { HistoryPanel } from "@/components/history-panel";
import { HrGuidance } from "@/components/hr-guidance";
import { RoadmapGenerator } from "@/components/roadmap-generator";
import { SignOutButton } from "@/components/sign-out-button";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen px-6 py-10 text-foreground md:py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 rounded-[2rem] border border-white/50 bg-surface/85 p-6 shadow-2xl backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Personal Workspace</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">Dashboard</h1>
            <p className="mt-2 text-sm text-muted">
              Welcome {session.user.name ?? "Learner"}.
            </p>
          </div>
          <SignOutButton />
        </header>

        <CommunicationAnalyzer />
        <RoadmapGenerator />
        <HrGuidance />
        <HistoryPanel />
      </div>
    </div>
  );
}
