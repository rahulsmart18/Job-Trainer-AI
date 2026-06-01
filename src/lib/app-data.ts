import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { FEATURE_IDS, type FeatureId } from "@/lib/features";
import { getAiUserContext, type AiUserContext } from "@/lib/ai/context";
import { getOnboardingStatus } from "@/lib/profile";
import { getPlanFeatures, hasFullBundle } from "@/lib/subscription";
import { getTrialStatusForUser, getUserProfileWithSync, type TrialStatus } from "@/lib/trial";
import { buildUserJourney, type UserJourney } from "@/lib/user-journey";

export type NavInfo = {
  userId: string;
  userName: string;
  paid: boolean;
  fullBundle: boolean;
  unlockedFeatures: FeatureId[];
  trial: TrialStatus;
};

export type Workspace = NavInfo & {
  ctx: AiUserContext;
  journey: UserJourney;
};

/** Auth + onboarding gate. Returns the authenticated user id. */
async function gateUser(): Promise<{ userId: string; userName: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const status = await getOnboardingStatus(session.user.id);
  if (!status.complete) redirect("/onboarding");

  return {
    userId: session.user.id,
    userName: session.user.name?.split(" ")[0] ?? "Learner",
  };
}

/** Lightweight info for navigation chrome (plan locks, name, premium badge). */
export async function getNavInfo(): Promise<NavInfo> {
  const { userId, userName } = await gateUser();

  const profile = await getUserProfileWithSync(userId);
  const trial = await getTrialStatusForUser(userId);

  const fullBundle =
    trial.isTrialing || (profile?.subscription_status === "active" && hasFullBundle(profile));
  const unlockedFeatures = trial.hasPremiumAccess
    ? trial.isTrialing
      ? [...FEATURE_IDS]
      : getPlanFeatures(profile)
    : getPlanFeatures(profile);

  return {
    userId,
    userName,
    paid: trial.hasPremiumAccess,
    fullBundle,
    unlockedFeatures,
    trial,
  };
}

/** Full workspace context (AI personalization + journey). Use on data-heavy pages. */
export async function getWorkspace(): Promise<Workspace> {
  const nav = await getNavInfo();
  const ctx = await getAiUserContext(nav.userId);
  const journey = buildUserJourney(ctx);
  return { ...nav, ctx, journey };
}
