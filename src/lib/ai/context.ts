import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isMissingColumnError } from "@/lib/checkout-store";
import { experiencePromptLine, workExperienceLabel } from "@/lib/experience-segment";
import { resolveCareerPreferenceDisplay, resolveWorkExperience } from "@/lib/work-experience-storage";
import {
  formatOnboardingDetailsForAi,
  resolveOnboardingDetails,
} from "@/lib/onboarding-details-storage";
import { hasWorkExperienceColumn, profileSelectColumns } from "@/lib/profile-schema";
import {
  hasProjectsLabel,
  jobSearchStatusLabel,
  joiningTimelineLabel,
  hasResumeProjects,
} from "@/types/onboarding";

export type AiUserContext = {
  fullName: string;
  degree: string;
  skillLevel: string;
  interestedRole: string;
  targetDomain: string;
  careerPreference: string;
  workExperience: string;
  studentStatus: string;
  biggestBlocker: string;
  weeklyHours: string;
  interviewExperience: string;
  preferredCompanyType: string;
  jobSearchChannel: string;
  interviewLanguage: string;
  jobTrack: string;
  city: string;
  graduationYear: string;
  codingLevel: number | null;
  englishLevel: number | null;
  hasProjects: string;
  jobSearchStatus: string;
  joiningTimeline: string;
};

const LEGACY_SELECT = "full_name, degree, skill_level, interested_role, target_domain, career_preference";

export async function getAiUserContext(userId: string): Promise<AiUserContext> {
  const empty: AiUserContext = {
    fullName: "",
    degree: "",
    skillLevel: "",
    interestedRole: "",
    targetDomain: "",
    careerPreference: "",
    workExperience: "",
    studentStatus: "",
    biggestBlocker: "",
    weeklyHours: "",
    interviewExperience: "",
    preferredCompanyType: "",
    jobSearchChannel: "",
    interviewLanguage: "",
    jobTrack: "",
    city: "",
    graduationYear: "",
    codingLevel: null,
    englishLevel: null,
    hasProjects: "",
    jobSearchStatus: "",
    joiningTimeline: "",
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;

  const hasWorkExpCol = await hasWorkExperienceColumn(supabase);
  const fullSelect = profileSelectColumns(hasWorkExpCol);

  let data: Record<string, unknown> | null = null;

  const full = await supabase.from("profiles").select(fullSelect).eq("user_id", userId).maybeSingle();
  data = full.data as Record<string, unknown> | null;

  if (full.error && isMissingColumnError(full.error.message)) {
    const legacy = await supabase.from("profiles").select(LEGACY_SELECT).eq("user_id", userId).maybeSingle();
    data = legacy.data as Record<string, unknown> | null;
  }

  if (!data) return empty;

  const careerRaw = String(data.career_preference ?? "");
  const workExp = resolveWorkExperience(
    data.work_experience != null ? String(data.work_experience) : undefined,
    careerRaw,
  );
  const careerDisplay = resolveCareerPreferenceDisplay(undefined, careerRaw);
  const onboardingDetails = resolveOnboardingDetails(careerRaw);

  return {
    fullName: String(data.full_name ?? ""),
    degree: String(data.degree ?? ""),
    skillLevel: String(data.skill_level ?? ""),
    interestedRole: String(data.interested_role ?? ""),
    targetDomain: String(data.target_domain ?? ""),
    careerPreference: careerDisplay,
    workExperience: workExp,
    studentStatus: onboardingDetails.studentStatus,
    biggestBlocker: onboardingDetails.biggestBlocker,
    weeklyHours: onboardingDetails.weeklyHours,
    interviewExperience: onboardingDetails.interviewExperience,
    preferredCompanyType: onboardingDetails.preferredCompanyType,
    jobSearchChannel: onboardingDetails.jobSearchChannel,
    interviewLanguage: onboardingDetails.interviewLanguage,
    jobTrack: onboardingDetails.jobTrack,
    city: String(data.city ?? ""),
    graduationYear: String(data.graduation_year ?? ""),
    codingLevel: (data.coding_level as number | null) ?? null,
    englishLevel: (data.english_level as number | null) ?? null,
    hasProjects: String(data.has_projects ?? ""),
    jobSearchStatus: String(data.job_search_status ?? ""),
    joiningTimeline: String(data.joining_timeline ?? ""),
  };
}

export function formatAiContext(ctx: AiUserContext, extra?: Record<string, string>): string {
  const lines = [
    `Name: ${ctx.fullName || "Learner"}`,
    `Degree: ${ctx.degree || "Not specified"}`,
    `Target role: ${ctx.interestedRole || (ctx.jobTrack === "non_it" ? "Role in my field" : "Any IT role")}`,
    ctx.jobTrack === "it" ? `Domain: ${ctx.targetDomain || "General"}` : "",
    ctx.jobTrack === "non_it" ? `Field focus: ${ctx.targetDomain || ctx.interestedRole || "General"}` : "",
    `Skill level: ${ctx.skillLevel || "Beginner"}`,
    `Career goal: ${ctx.careerPreference || "Not specified"}`,
    ctx.workExperience ? `Work experience: ${workExperienceLabel(ctx.workExperience)}` : "",
    experiencePromptLine(ctx),
    ...formatOnboardingDetailsForAi({
      jobTrack: ctx.jobTrack as "" | "it" | "non_it",
      studentStatus: ctx.studentStatus,
      biggestBlocker: ctx.biggestBlocker,
      weeklyHours: ctx.weeklyHours,
      interviewExperience: ctx.interviewExperience,
      preferredCompanyType: ctx.preferredCompanyType,
      jobSearchChannel: ctx.jobSearchChannel,
      interviewLanguage: ctx.interviewLanguage,
    }),
    ctx.city ? `City: ${ctx.city}` : "",
    ctx.graduationYear ? `Graduation year: ${ctx.graduationYear}` : "",
    ctx.codingLevel ? `Coding self-rating: ${ctx.codingLevel}/5` : "",
    ctx.englishLevel ? `English self-rating: ${ctx.englishLevel}/5` : "",
    ctx.hasProjects ? `Projects: ${hasProjectsLabel(ctx.hasProjects)}` : "",
    ctx.jobSearchStatus ? `Job search activity: ${jobSearchStatusLabel(ctx.jobSearchStatus)}` : "",
    ctx.joiningTimeline ? `Availability: ${joiningTimelineLabel(ctx.joiningTimeline)}` : "",
  ].filter(Boolean);

  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      lines.push(`${k}: ${v}`);
    }
  }

  return lines.join("\n");
}

export function computeInterviewReadiness(
  ctx: AiUserContext,
  latestScore: number | null,
): number {
  let score = 35;
  if (ctx.degree) score += 8;
  if (ctx.interestedRole) score += 7;
  if (ctx.codingLevel) score += ctx.codingLevel * 4;
  if (ctx.englishLevel) score += ctx.englishLevel * 3;
  if (hasResumeProjects(ctx.hasProjects)) score += 10;
  else if (ctx.hasProjects === "in_progress" || ctx.hasProjects === "built_not_listed") score += 5;
  if (latestScore !== null) score += Math.round(latestScore * 2.5);
  return Math.min(95, Math.max(20, score));
}
