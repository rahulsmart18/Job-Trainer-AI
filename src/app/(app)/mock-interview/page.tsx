import { PageHeader } from "@/components/page-header";
import { VoiceMockInterview } from "@/components/voice-mock-interview";

export default function MockInterviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        crumb="Mock Interview"
        title="Voice Mock Interview"
        subtitle="The AI interviewer asks out loud. Answer with your voice and get feedback after each question."
      />
      <VoiceMockInterview />
    </div>
  );
}
