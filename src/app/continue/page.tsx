import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getOnboardingStatus } from "@/lib/profile";

export default async function ContinuePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const status = await getOnboardingStatus(session.user.id);
  redirect(status.complete ? "/dashboard" : "/onboarding");
}
