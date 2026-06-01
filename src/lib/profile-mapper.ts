import type { JobTrack, OnboardingFormData } from "@/types/onboarding";
import {
  BRANCHES,
  CAREER_GOALS,
  CODING_LEVEL_LABELS,
  createInitialForm,
  DOMAINS,
  ENGLISH_LEVEL_LABELS,
  inferDomainFromRole,
  JOB_ROLES,
  NON_IT_CAREER_GOALS,
  NON_IT_JOB_ROLES,
  OTHER_VALUE,
  QUALIFICATIONS,
  hasProjectsLabel,
  jobSearchStatusLabel,
  joiningTimelineLabel,
} from "@/types/onboarding";

export type ProfilePayload = {
  fullName: string;
  degree: string;
  skillLevel: string;
  interestedRole: string;
  targetDomain: string;
  careerPreference: string;
  workExperience?: string;
  jobTrack?: string;
  studentStatus?: string;
  biggestBlocker?: string;
  weeklyHours?: string;
  interviewExperience?: string;
  preferredCompanyType?: string;
  jobSearchChannel?: string;
  interviewLanguage?: string;
  city?: string;
  graduationYear?: string;
  codingLevel?: number;
  englishLevel?: number;
  hasProjects?: string;
  jobSearchStatus?: string;
  joiningTimeline?: string;
  onboardingComplete?: boolean;
};

function resolveChoice(selected: string, custom: string): string {
  if (selected === OTHER_VALUE) return custom.trim();
  return selected.trim();
}

export function mapOnboardingToProfile(form: OnboardingFormData): ProfilePayload {
  const careerLabel =
    {
      first_it_job: "Get first IT job",
      switch_job: "Switch to better job or company",
      switch_to_it: "Switching to IT",
      improve_skills: "Improve skills before applying",
      interview_prep: "Interview preparation only",
      first_job: "Get first job in my field",
      switch_career: "Switch career or industry",
    }[form.careerPreference] ?? form.careerPreference;

  const qualification = resolveChoice(form.qualification, form.qualificationOther);
  const branch = resolveChoice(form.branch, form.branchOther);
  const role = resolveChoice(form.interestedRole, form.interestedRoleOther);
  const domain =
    form.jobTrack === "it"
      ? resolveChoice(form.targetDomain, form.targetDomainOther) ||
        inferDomainFromRole(role)
      : role || "Field-specific preparation";

  return {
    fullName: form.fullName.trim(),
    degree: [qualification, branch].filter(Boolean).join(" — "),
    skillLevel: CODING_LEVEL_LABELS[form.codingLevel - 1] ?? "Intermediate",
    interestedRole: role,
    targetDomain: domain,
    careerPreference: careerLabel,
    workExperience: form.workExperience,
    jobTrack: form.jobTrack,
    studentStatus: form.studentStatus,
    biggestBlocker: form.biggestBlocker,
    weeklyHours: form.weeklyHours,
    interviewExperience: form.interviewExperience,
    preferredCompanyType: form.preferredCompanyType,
    jobSearchChannel: form.jobSearchChannel,
    interviewLanguage: form.interviewLanguage,
    city: form.city,
    graduationYear: form.graduationYear,
    codingLevel: form.codingLevel,
    englishLevel: form.englishLevel,
    hasProjects: form.hasProjects,
    jobSearchStatus: form.jobSearchStatus,
    joiningTimeline: form.joiningTimeline,
    onboardingComplete: true,
  };
}

/** Human-readable summary for API responses / display. */
export function profileDisplayLabels(payload: ProfilePayload) {
  return {
    hasProjects: payload.hasProjects ? hasProjectsLabel(payload.hasProjects) : "",
    jobSearchStatus: payload.jobSearchStatus ? jobSearchStatusLabel(payload.jobSearchStatus) : "",
    joiningTimeline: payload.joiningTimeline ? joiningTimelineLabel(payload.joiningTimeline) : "",
  };
}

export function profileToRoadmapForm(profile: {
  degree?: string | null;
  skill_level?: string | null;
  interested_role?: string | null;
  target_domain?: string | null;
  career_preference?: string | null;
}) {
  return {
    degree: profile.degree ?? "",
    skillLevel: profile.skill_level ?? "",
    interestedRole: profile.interested_role ?? "",
    targetDomain: profile.target_domain ?? "",
    careerPreference: profile.career_preference ?? "",
  };
}

export function englishLevelLabel(level: number | null | undefined): string {
  if (!level || level < 1 || level > 5) return "";
  return ENGLISH_LEVEL_LABELS[level - 1];
}

/** Shape returned by GET /api/profile that we can map back into the form. */
export type EditableProfile = {
  fullName?: string | null;
  degree?: string | null;
  interestedRole?: string | null;
  targetDomain?: string | null;
  careerPreference?: string | null;
  workExperience?: string | null;
  jobTrack?: string | null;
  studentStatus?: string | null;
  biggestBlocker?: string | null;
  weeklyHours?: string | null;
  interviewExperience?: string | null;
  preferredCompanyType?: string | null;
  jobSearchChannel?: string | null;
  interviewLanguage?: string | null;
  city?: string | null;
  graduationYear?: string | null;
  codingLevel?: number | null;
  englishLevel?: number | null;
  hasProjects?: string | null;
  jobSearchStatus?: string | null;
  joiningTimeline?: string | null;
};

/** Reverse of the careerPreference label map in mapOnboardingToProfile. */
const CAREER_LABEL_TO_ID: Record<string, string> = {
  "Get first IT job": "first_it_job",
  "Switch to better job or company": "switch_job",
  "Switching to IT": "switch_to_it",
  "Improve skills before applying": "improve_skills",
  "Interview preparation only": "interview_prep",
  "Get first job in my field": "first_job",
  "Switch career or industry": "switch_career",
};

const KNOWN_GOAL_IDS = new Set<string>([
  ...CAREER_GOALS.map((g) => g.id),
  ...NON_IT_CAREER_GOALS.map((g) => g.id),
]);

function matchOption(value: string, options: readonly string[]): { value: string; other: string } {
  const v = value.trim();
  if (!v) return { value: "", other: "" };
  if (options.includes(v)) return { value: v, other: "" };
  return { value: OTHER_VALUE, other: v };
}

function clampLevel(level: number | null | undefined): number {
  if (typeof level !== "number" || !Number.isFinite(level)) return 2;
  return Math.min(5, Math.max(1, Math.round(level)));
}

/**
 * Best-effort reverse mapping: turn a saved profile (from GET /api/profile)
 * back into editable onboarding form data so users can revise their answers.
 */
export function mapProfileToOnboardingForm(
  profile: EditableProfile,
  defaultName: string,
): OnboardingFormData {
  const base = createInitialForm(profile.fullName?.trim() || defaultName);

  const jobTrack = (profile.jobTrack === "it" || profile.jobTrack === "non_it"
    ? profile.jobTrack
    : "") as JobTrack | "";

  // degree is stored as "Qualification — Branch".
  const [qualificationRaw = "", branchRaw = ""] = (profile.degree ?? "").split(" — ");
  const qualification = matchOption(qualificationRaw, QUALIFICATIONS);
  const branch = matchOption(branchRaw, BRANCHES);

  const roleOptions = jobTrack === "non_it" ? NON_IT_JOB_ROLES : JOB_ROLES;
  const role = matchOption(profile.interestedRole ?? "", roleOptions);
  const domain = matchOption(profile.targetDomain ?? "", DOMAINS);

  const careerRaw = (profile.careerPreference ?? "").trim();
  const careerPreference =
    CAREER_LABEL_TO_ID[careerRaw] ?? (KNOWN_GOAL_IDS.has(careerRaw) ? careerRaw : "");

  return {
    ...base,
    fullName: profile.fullName?.trim() || defaultName,
    city: profile.city ?? "",
    workExperience: profile.workExperience || "fresher",
    jobTrack,
    studentStatus: profile.studentStatus ?? "",
    qualification: qualification.value,
    qualificationOther: qualification.other,
    branch: branch.value,
    branchOther: branch.other,
    graduationYear: profile.graduationYear ?? "",
    careerPreference,
    interestedRole: role.value,
    interestedRoleOther: role.other,
    targetDomain: jobTrack === "it" ? domain.value : "",
    targetDomainOther: jobTrack === "it" ? domain.other : "",
    codingLevel: clampLevel(profile.codingLevel),
    englishLevel: clampLevel(profile.englishLevel),
    hasProjects: profile.hasProjects ?? "",
    biggestBlocker: profile.biggestBlocker ?? "",
    interviewExperience: profile.interviewExperience ?? "",
    weeklyHours: profile.weeklyHours ?? "",
    preferredCompanyType: profile.preferredCompanyType ?? "",
    jobSearchChannel: profile.jobSearchChannel ?? "",
    interviewLanguage: profile.interviewLanguage ?? "",
    jobSearchStatus: profile.jobSearchStatus ?? "",
    joiningTimeline: profile.joiningTimeline ?? "",
  };
}
