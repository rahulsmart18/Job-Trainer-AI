/** Stored in profiles.work_experience and onboarding form. */
export const WORK_EXPERIENCE_IDS = ["fresher", "one_two_years", "three_plus_years"] as const;
export type WorkExperienceId = (typeof WORK_EXPERIENCE_IDS)[number];

export const WORK_EXPERIENCE_OPTIONS = [
  {
    id: "fresher" as const,
    label: "No work experience (fresher)",
    description: "Just completed college or in final year — seeking first job",
  },
  {
    id: "one_two_years" as const,
    label: "1–2 years experience",
    description: "Early career — exploring a better role or company",
  },
  {
    id: "three_plus_years" as const,
    label: "3+ years experience",
    description: "Mid-level — role upgrade, hike, or company switch",
  },
];

export function workExperienceLabel(id: string): string {
  return WORK_EXPERIENCE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function isFresherSegment(workExperience: string | undefined | null): boolean {
  return !workExperience || workExperience === "fresher";
}

export function isExperiencedSegment(workExperience: string | undefined | null): boolean {
  return workExperience === "one_two_years" || workExperience === "three_plus_years";
}

/** True when AI should use job-switch / lateral-hire tone instead of fresher-first-job tone. */
export function isJobSwitchProfile(ctx: {
  workExperience?: string | null;
  careerPreference?: string | null;
}): boolean {
  if (isExperiencedSegment(ctx.workExperience)) return true;
  const pref = (ctx.careerPreference ?? "").toLowerCase();
  return pref.includes("switch job") || pref.includes("better job");
}

export function audienceForPrompt(ctx: {
  workExperience?: string | null;
  careerPreference?: string | null;
}): "fresher" | "experienced" {
  return isJobSwitchProfile(ctx) ? "experienced" : "fresher";
}

export function experiencePromptLine(ctx: {
  workExperience?: string | null;
  careerPreference?: string | null;
}): string {
  const exp = ctx.workExperience ? workExperienceLabel(ctx.workExperience) : "Fresher (0 years)";
  const goal = ctx.careerPreference || "Not specified";
  const segment = audienceForPrompt(ctx);
  if (segment === "experienced") {
    return `Work experience: ${exp}. Career goal: ${goal}. Use EARLY-CAREER JOB SWITCH tone — impact bullets, reason for change, hike expectations, lateral hiring — NOT fresher/campus advice.`;
  }
  return `Work experience: ${exp}. Career goal: ${goal}. Use FRESHER tone — first job, campus/off-campus, portfolio projects, fresher salary bands.`;
}
