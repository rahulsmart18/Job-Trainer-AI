import type { AiUserContext } from "@/lib/ai/context";
import { computeInterviewReadiness } from "@/lib/ai/context";
import { hasResumeProjects, needsProjectHelp } from "@/types/onboarding";

export function computeStrengths(ctx: AiUserContext): string[] {
  const strengths: string[] = [];

  if (ctx.degree) strengths.push("Academic foundation");
  if (ctx.codingLevel !== null && ctx.codingLevel >= 3) strengths.push("Technical knowledge");
  if (/react|frontend|web/i.test(ctx.targetDomain)) strengths.push("React fundamentals");
  else if (ctx.interestedRole) strengths.push(`${ctx.interestedRole} focus`);
  if (hasResumeProjects(ctx.hasProjects)) strengths.push("Portfolio projects");
  if (ctx.englishLevel !== null && ctx.englishLevel >= 4) strengths.push("English fluency");
  if (/intermediate|advanced/i.test(ctx.skillLevel)) {
    strengths.push(`${ctx.skillLevel} skill level`);
  }

  if (strengths.length === 0) {
    strengths.push("Motivation to improve", "Clear career direction");
  }

  return strengths.slice(0, 4);
}

export function computeActivityStreak(activityDates: string[]): number {
  if (activityDates.length === 0) return 0;

  const daySet = new Set(activityDates.map((d) => d.slice(0, 10)));
  const cursor = new Date();
  const today = cursor.toISOString().slice(0, 10);

  if (!daySet.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function computeWeeklyReadinessDelta(
  ctx: AiUserContext,
  currentScore: number | null,
  weekAgoScore: number | null,
): number {
  const current = computeInterviewReadiness(ctx, currentScore);
  const baseline = computeInterviewReadiness(ctx, weekAgoScore);
  return Math.max(0, current - baseline);
}

export function computeConfidenceImprovement(
  latestScore: number | null,
  weekAgoScore: number | null,
  scoreTrend: number | null,
): number | null {
  if (latestScore !== null && weekAgoScore !== null && weekAgoScore > 0) {
    return Math.round(((latestScore - weekAgoScore) / weekAgoScore) * 100);
  }
  if (scoreTrend !== null && scoreTrend > 0) {
    return Math.round(scoreTrend * 10);
  }
  return null;
}

export function computeNextCheckpoint(
  ctx: AiUserContext,
  latestScore: number | null,
  analysisCount: number,
  mockInterviewCount: number,
): string {
  if (analysisCount === 0) return "Get your first communication score";
  if (mockInterviewCount === 0) return "Complete 1 AI mock interview round";
  if (latestScore !== null && latestScore < 6) return "Reach 6/10 on your communication score";
  if (needsProjectHelp(ctx.hasProjects)) return "Add 1 portfolio project to your resume";
  return "Apply to 3 matching roles this week";
}

export function computeTodaysMission(
  ctx: AiUserContext,
  latestScore: number | null,
  analysisCount: number,
  mockInterviewCount: number,
): string {
  if (analysisCount === 0) {
    return "Record a 60-second intro and get your communication score";
  }
  if (mockInterviewCount === 0) return "Complete 1 AI mock interview";
  if (latestScore !== null && latestScore < 6) {
    return "Improve your communication score with another practice session";
  }
  if (needsProjectHelp(ctx.hasProjects)) {
    return "Start one portfolio project aligned to your target role";
  }
  return "Beat your last communication score today";
}
