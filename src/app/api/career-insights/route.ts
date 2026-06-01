import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { computeInterviewReadiness, getAiUserContext } from "@/lib/ai/context";
import {
  computeActivityStreak,
  computeConfidenceImprovement,
  computeNextCheckpoint,
  computeStrengths,
  computeTodaysMission,
  computeWeeklyReadinessDelta,
} from "@/lib/career-progress";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUsageSnapshot } from "@/lib/usage-limits";
import { biggestBlockerLabel, needsProjectHelp } from "@/types/onboarding";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = enforceRateLimit(request, "career-insights", session.user.id, { limit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const ctx = await getAiUserContext(session.user.id);
  const supabase = getSupabaseAdmin();

  let latestScore: number | null = null;
  let previousScore: number | null = null;
  let weekAgoScore: number | null = null;
  const activityDates: string[] = [];
  let analysisCount = 0;
  let mockInterviewCount = 0;

  if (supabase) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: analyses } = await supabase
      .from("analyses")
      .select("score, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (analyses?.length) {
      analysisCount = analyses.length;
      latestScore = Number(analyses[0].score);
      if (analyses[1]) previousScore = Number(analyses[1].score);

      for (const row of analyses) {
        activityDates.push(String(row.created_at));
      }

      const weekOld = analyses.find((row) => new Date(String(row.created_at)) <= weekAgo);
      if (weekOld) weekAgoScore = Number(weekOld.score);
      else if (analyses.length > 1) weekAgoScore = Number(analyses[analyses.length - 1].score);
    }

    const { data: mockSessions } = await supabase
      .from("mock_interviews")
      .select("created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (mockSessions?.length) {
      mockInterviewCount = mockSessions.length;
      for (const row of mockSessions) {
        activityDates.push(String(row.created_at));
      }
    }
  }

  const readinessScore = computeInterviewReadiness(ctx, latestScore);
  const startingReadiness = computeInterviewReadiness(ctx, null);
  const scoreTrend = latestScore !== null && previousScore !== null ? latestScore - previousScore : null;

  const biggestGap = ctx.biggestBlocker
    ? biggestBlockerLabel(ctx.biggestBlocker)
    : ctx.englishLevel !== null && ctx.englishLevel <= 2
      ? "Communication confidence in interviews"
      : needsProjectHelp(ctx.hasProjects)
        ? "Portfolio projects on resume"
        : ctx.codingLevel !== null && ctx.codingLevel <= 2
          ? "Technical depth for your target role"
          : latestScore !== null && latestScore < 6
            ? "Interview answer structure & clarity"
            : "Consistent interview practice";

  const { getPlanFeatures } = await import("@/lib/subscription");
  const { getTrialStatusForUser, getUserProfileWithSync } = await import("@/lib/trial");
  const { FEATURE_IDS } = await import("@/lib/features");

  const profile = await getUserProfileWithSync(session.user.id);
  const trial = await getTrialStatusForUser(session.user.id);
  const usage = await getUsageSnapshot(session.user.id, profile);

  const unlockedFeatures = trial.hasPremiumAccess
    ? trial.isTrialing
      ? [...FEATURE_IDS]
      : getPlanFeatures(profile)
    : getPlanFeatures(profile);

  return NextResponse.json({
    readinessScore,
    startingReadiness,
    weeklyDelta: computeWeeklyReadinessDelta(ctx, latestScore, weekAgoScore),
    biggestGap,
    strengths: computeStrengths(ctx),
    todaysMission: computeTodaysMission(ctx, latestScore, analysisCount, mockInterviewCount),
    nextCheckpoint: computeNextCheckpoint(ctx, latestScore, analysisCount, mockInterviewCount),
    latestCommunicationScore: latestScore,
    scoreTrend,
    confidenceImprovement: computeConfidenceImprovement(latestScore, weekAgoScore, scoreTrend),
    streakDays: computeActivityStreak(activityDates),
    mockInterviewCount,
    paid: trial.hasPremiumAccess,
    unlockedFeatures,
    usage,
  });
}
