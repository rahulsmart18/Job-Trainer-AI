import type { JobTrack, OnboardingDetails } from "@/types/onboarding";
import {
  biggestBlockerLabel,
  companyTypeLabel,
  interviewExperienceLabel,
  interviewLanguageLabel,
  jobSearchChannelLabel,
  jobTrackLabel,
  studentStatusLabel,
  weeklyHoursLabel,
} from "@/types/onboarding";

const OD_PREFIX = "__od:";

export function encodeOnboardingDetails(details: OnboardingDetails): string {
  const parts = [
    details.jobTrack ? `jt=${details.jobTrack}` : "",
    details.studentStatus ? `ss=${details.studentStatus}` : "",
    details.biggestBlocker ? `bb=${details.biggestBlocker}` : "",
    details.weeklyHours ? `wh=${details.weeklyHours}` : "",
    details.interviewExperience ? `ie=${details.interviewExperience}` : "",
    details.preferredCompanyType ? `pct=${details.preferredCompanyType}` : "",
    details.jobSearchChannel ? `jsc=${details.jobSearchChannel}` : "",
    details.interviewLanguage ? `il=${details.interviewLanguage}` : "",
  ].filter(Boolean);
  return parts.join(",");
}

export function parseOnboardingDetails(encoded: string): OnboardingDetails {
  const empty: OnboardingDetails = {
    jobTrack: "",
    studentStatus: "",
    biggestBlocker: "",
    weeklyHours: "",
    interviewExperience: "",
    preferredCompanyType: "",
    jobSearchChannel: "",
    interviewLanguage: "",
  };
  if (!encoded) return empty;

  for (const part of encoded.split(",")) {
    const [key, value] = part.split("=");
    if (!key || !value) continue;
    if (key === "jt") empty.jobTrack = value as JobTrack;
    if (key === "ss") empty.studentStatus = value;
    if (key === "bb") empty.biggestBlocker = value;
    if (key === "wh") empty.weeklyHours = value;
    if (key === "ie") empty.interviewExperience = value;
    if (key === "pct") empty.preferredCompanyType = value;
    if (key === "jsc") empty.jobSearchChannel = value;
    if (key === "il") empty.interviewLanguage = value;
  }
  return empty;
}

export function stripOnboardingDetailsSuffix(raw: string): {
  base: string;
  details: OnboardingDetails;
} {
  const idx = raw.lastIndexOf(OD_PREFIX);
  if (idx === -1) {
    return { base: raw, details: parseOnboardingDetails("") };
  }
  const encoded = raw.slice(idx + OD_PREFIX.length);
  return {
    base: raw.slice(0, idx),
    details: parseOnboardingDetails(encoded),
  };
}

export function embedOnboardingDetailsInCareer(
  careerPreference: string,
  details: OnboardingDetails,
): string {
  const encoded = encodeOnboardingDetails(details);
  if (!encoded) return careerPreference;
  return `${careerPreference}${OD_PREFIX}${encoded}`;
}

export function resolveOnboardingDetails(careerPreference: string | null | undefined): OnboardingDetails {
  return stripOnboardingDetailsSuffix(careerPreference ?? "").details;
}

export function formatOnboardingDetailsForAi(details: OnboardingDetails): string[] {
  const lines: string[] = [];
  if (details.jobTrack) {
    lines.push(`Job track: ${jobTrackLabel(details.jobTrack)}`);
  }
  if (details.studentStatus) {
    lines.push(`College stage: ${studentStatusLabel(details.studentStatus)}`);
  }
  if (details.biggestBlocker) {
    lines.push(`Biggest challenge right now: ${biggestBlockerLabel(details.biggestBlocker)}`);
  }
  if (details.weeklyHours) {
    lines.push(`Weekly prep time available: ${weeklyHoursLabel(details.weeklyHours)}`);
  }
  if (details.interviewExperience) {
    lines.push(`Interview experience so far: ${interviewExperienceLabel(details.interviewExperience)}`);
  }
  if (details.preferredCompanyType) {
    lines.push(`Preferred company type: ${companyTypeLabel(details.preferredCompanyType)}`);
  }
  if (details.jobSearchChannel) {
    lines.push(`Job search channel: ${jobSearchChannelLabel(details.jobSearchChannel)}`);
  }
  if (details.interviewLanguage) {
    lines.push(`Interview language preference: ${interviewLanguageLabel(details.interviewLanguage)}`);
  }
  return lines;
}
