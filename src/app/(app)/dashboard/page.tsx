import { DashboardOverview } from "@/components/dashboard-overview";
import { PageHeader } from "@/components/page-header";
import { TrialBanner } from "@/components/trial-banner";
import { getNavInfo } from "@/lib/app-data";

export default async function DashboardPage() {
  const nav = await getNavInfo();

  return (
    <div className="space-y-7">
      <PageHeader
        title={`Welcome back, ${nav.userName}`}
        subtitle="Here's your quick overview. Pick one task and start — we'll guide you one step at a time."
      />
      <TrialBanner trial={nav.trial} />
      <DashboardOverview userName={nav.userName} />
    </div>
  );
}
