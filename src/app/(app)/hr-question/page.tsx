import { HrGuidance } from "@/components/hr-guidance";
import { PageHeader } from "@/components/page-header";

export default function HrQuestionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        crumb="HR Questions"
        title="HR Question Prep"
        subtitle="Common HR questions with simple, copy-ready answers and pro tips — written for your target role."
      />
      <HrGuidance />
    </div>
  );
}
