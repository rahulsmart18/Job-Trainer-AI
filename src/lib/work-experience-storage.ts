import { stripOnboardingDetailsSuffix } from "@/lib/onboarding-details-storage";

/** Embedded in career_preference when work_experience column is not migrated yet. */
const EXP_INFIX = /__exp:(fresher|one_two_years|three_plus_years)/;

export function embedWorkExperienceInCareer(careerPreference: string, workExperience: string): string {
  if (!workExperience || workExperience === "fresher") return careerPreference;
  return `${careerPreference}__exp:${workExperience}`;
}

function parseCareerEmbeds(raw: string): {
  careerPreference: string;
  workExperience: string;
} {
  const { base: withoutOd } = stripOnboardingDetailsSuffix(raw);
  const expMatch = withoutOd.match(EXP_INFIX);
  if (!expMatch || expMatch.index === undefined) {
    return { careerPreference: withoutOd, workExperience: "" };
  }
  const workExperience = expMatch[1];
  const careerPreference = withoutOd.replace(EXP_INFIX, "").trim();
  return { careerPreference, workExperience };
}

export function parseEmbeddedWorkExperience(careerPreference: string): {
  careerPreference: string;
  workExperience: string;
} {
  return parseCareerEmbeds(careerPreference);
}

export function resolveWorkExperience(
  columnValue: string | null | undefined,
  careerPreference: string | null | undefined,
): string {
  if (columnValue) return columnValue;
  return parseCareerEmbeds(careerPreference ?? "").workExperience;
}

export function resolveCareerPreferenceDisplay(
  columnValue: string | null | undefined,
  careerPreference: string | null | undefined,
): string {
  if (columnValue) return columnValue;
  return parseCareerEmbeds(careerPreference ?? "").careerPreference;
}
