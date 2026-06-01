import type { AiUserContext } from "@/lib/ai/context";
import type { CheckoutPlanId, FeatureId } from "@/lib/features";
import { needsProjectHelp } from "@/types/onboarding";

export type JourneyModuleId = "twin" | "roadmap" | "communication" | "mock_interview" | "hr_scripts";

export type JourneyStep = {
  id: JourneyModuleId;
  stepNumber: number;
  title: string;
  subtitle: string;
  featureId: FeatureId;
};

export type UserJourney = {
  headline: string;
  intro: string;
  focusLabel: string;
  steps: JourneyStep[];
  recommendedPlan: CheckoutPlanId;
  paymentTitle: string;
  paymentSubtitle: string;
};

type ModuleScores = Record<JourneyModuleId, number>;

function scoreModules(ctx: AiUserContext): ModuleScores {
  const scores: ModuleScores = {
    twin: 0,
    roadmap: 1,
    communication: 1,
    mock_interview: 1,
    hr_scripts: 1,
  };

  const blocker = ctx.biggestBlocker;
  const goal = ctx.careerPreference.toLowerCase();
  const channel = ctx.jobSearchChannel;

  if (blocker === "no_direction" || blocker === "no_projects" || blocker === "low_coding") {
    scores.roadmap += 5;
  }
  if (blocker === "not_applying") {
    scores.roadmap += 4;
    scores.hr_scripts += 3;
  }
  if (blocker === "weak_english") {
    scores.communication += 5;
  }
  if (blocker === "interview_fear") {
    scores.communication += 3;
    scores.mock_interview += 5;
    scores.hr_scripts += 2;
  }

  if (needsProjectHelp(ctx.hasProjects)) scores.roadmap += 3;
  if (ctx.codingLevel !== null && ctx.codingLevel <= 2) scores.roadmap += 2;
  if (ctx.englishLevel !== null && ctx.englishLevel <= 2) scores.communication += 3;

  if (ctx.interviewLanguage === "regional" || ctx.interviewLanguage === "english_goal") {
    scores.communication += 3;
  }

  if (ctx.interviewExperience === "never") scores.mock_interview += 4;
  else if (ctx.interviewExperience === "1_2") scores.mock_interview += 2;
  else if (ctx.interviewExperience === "several") scores.hr_scripts += 2;

  if (/improve skills|build skills/i.test(goal)) {
    scores.roadmap += 4;
    scores.mock_interview -= 1;
    scores.hr_scripts -= 1;
  }
  if (/interview prep|interview preparation|fix interview/i.test(goal)) {
    scores.communication += 3;
    scores.mock_interview += 3;
    scores.hr_scripts += 3;
    scores.roadmap += 1;
  }
  if (/first it job|first job/i.test(goal)) {
    scores.roadmap += 2;
  }

  if (ctx.jobSearchStatus === "learning_first") {
    scores.roadmap += 2;
    scores.mock_interview -= 1;
  }
  if (ctx.jobSearchStatus === "active" || ctx.jobSearchStatus === "light") {
    scores.mock_interview += 2;
    scores.hr_scripts += 2;
  }

  if (ctx.jobTrack === "non_it") {
    scores.roadmap += 2;
    scores.mock_interview += 1;
    scores.hr_scripts += 2;
    if (ctx.codingLevel !== null && ctx.codingLevel <= 2) scores.roadmap += 1;
  }

  if (channel === "off_campus" || channel === "both") {
    scores.roadmap += 1;
    scores.hr_scripts += 1;
  }
  if (channel === "campus") {
    scores.roadmap += 1;
    scores.hr_scripts += 1;
  }
  if (channel === "internship_ppo") {
    scores.roadmap += 2;
  }

  return scores;
}

const MODULE_META: Record<
  Exclude<JourneyModuleId, "twin">,
  { title: string; subtitle: string; featureId: FeatureId }
> = {
  roadmap: {
    title: "Build your career path",
    subtitle: "Skills, portfolio projects, and application strategy for your target role",
    featureId: "roadmap",
  },
  communication: {
    title: "Practice your intro",
    subtitle: "Record “Tell me about yourself” and get scores plus a better script",
    featureId: "communication",
  },
  mock_interview: {
    title: "Mock HR interview",
    subtitle: "3-round practice with instant feedback before real interviews",
    featureId: "mock_interview",
  },
  hr_scripts: {
    title: "HR answers & apply",
    subtitle: "Copy-paste HR scripts, recruiter messages, and apply with confidence",
    featureId: "hr_scripts",
  },
};

function focusLabel(ctx: AiUserContext): string {
  if (ctx.interestedRole) return ctx.interestedRole;
  if (ctx.targetDomain) return ctx.targetDomain;
  return ctx.jobTrack === "non_it" ? "your target role" : "your first IT role";
}

function introCopy(ctx: AiUserContext): string {
  const role = focusLabel(ctx);
  const channel =
    ctx.jobSearchChannel === "campus"
      ? "campus placements"
      : ctx.jobSearchChannel === "off_campus"
        ? "off-campus search"
        : ctx.jobSearchChannel === "internship_ppo"
          ? "internship / PPO track"
          : "campus and off-campus";

  if (ctx.biggestBlocker === "no_projects" || needsProjectHelp(ctx.hasProjects)) {
    return `We’ll start with projects and skills for ${role}, then interview practice. Payment comes only when you want the full detailed plan.`;
  }
  if (ctx.biggestBlocker === "weak_english" || ctx.biggestBlocker === "interview_fear") {
    return `We’ll start with speaking and mock interviews for ${role}, then your roadmap. Explore each step free — upgrade only when you need unlimited access.`;
  }
  if (ctx.biggestBlocker === "not_applying") {
    return `We’ll focus on how to apply (${channel}) for ${role}, then interviews. Complete the steps below before choosing a plan.`;
  }
  return `Your personalized path for ${role} (${channel}). Work through each step at your own pace — payment is the last step when you’re ready.`;
}

function recommendedPlan(ctx: AiUserContext): CheckoutPlanId {
  if (
    ctx.biggestBlocker === "weak_english" ||
    ctx.biggestBlocker === "interview_fear" ||
    ctx.interviewExperience === "never"
  ) {
    return "interview_pack";
  }
  if (
    ctx.biggestBlocker === "no_projects" ||
    ctx.biggestBlocker === "no_direction" ||
    ctx.biggestBlocker === "low_coding" ||
    needsProjectHelp(ctx.hasProjects)
  ) {
    return "roadmap";
  }
  return "full_bundle";
}

export function buildUserJourney(ctx: AiUserContext): UserJourney {
  const scores = scoreModules(ctx);

  const ordered = [...(["roadmap", "communication", "mock_interview", "hr_scripts"] as const)].sort(
    (a, b) => scores[b] - scores[a],
  );

  const steps: JourneyStep[] = [
    {
      id: "twin",
      stepNumber: 1,
      title: "See your readiness",
      subtitle: "AI Career Twin — gap analysis and today’s mission",
      featureId: "roadmap",
    },
    ...ordered.map((id, index) => ({
      id,
      stepNumber: index + 2,
      title: MODULE_META[id].title,
      subtitle: MODULE_META[id].subtitle,
      featureId: MODULE_META[id].featureId,
    })),
  ];

  const plan = recommendedPlan(ctx);

  return {
    headline: "Your personalized prep path",
    intro: introCopy(ctx),
    focusLabel: focusLabel(ctx),
    steps,
    recommendedPlan: plan,
    paymentTitle: "Unlock when you’re ready",
    paymentSubtitle:
      "You’ve explored your free path. Upgrade for unlimited practice and full roadmap depth — no pressure until this step.",
  };
}

export function planForFeature(featureId: FeatureId): CheckoutPlanId {
  if (featureId === "roadmap") return "roadmap";
  if (featureId === "communication") return "full_bundle";
  return "interview_pack";
}
