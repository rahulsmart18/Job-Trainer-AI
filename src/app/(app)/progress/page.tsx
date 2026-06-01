import { CareerTwin } from "@/components/career-twin";
import { HistoryPanel } from "@/components/history-panel";
import { PageHeader } from "@/components/page-header";

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        crumb="Progress"
        title="Your Progress"
        subtitle="Track how job-ready you are, your strengths, and everything you've practiced so far."
      />
      <CareerTwin />
      <HistoryPanel />
    </div>
  );
}
