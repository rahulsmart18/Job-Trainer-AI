import { CommunicationAnalyzer } from "@/components/communication-analyzer";
import { PageHeader } from "@/components/page-header";
import { getNavInfo } from "@/lib/app-data";

export default async function CommunicationAnalysisPage() {
  const nav = await getNavInfo();

  return (
    <div className="space-y-6">
      <PageHeader
        crumb="Communication"
        title="Communication Analysis"
        subtitle="Record your intro and get a clear score for confidence, fluency, clarity, grammar, and filler words."
      />
      <CommunicationAnalyzer paid={nav.paid} />
    </div>
  );
}
