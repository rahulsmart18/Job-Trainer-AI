import { PageHeader } from "@/components/page-header";
import { RoadmapJourney } from "@/components/roadmap-journey";

export default function RoadmapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        crumb="Roadmap"
        title="Your Career Roadmap"
        subtitle="Simple steps in the right order, with mini projects. Tap each step to track your progress."
      />
      <RoadmapJourney />
    </div>
  );
}
