import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({
      analyses: [],
      roadmaps: [],
      guidance: [],
      warning: "Session missing user id. Please sign out and sign in again.",
    });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      analyses: [],
      roadmaps: [],
      guidance: [],
      warning: "Supabase not configured.",
    });
  }

  const [analysesResult, roadmapsResult, guidanceResult] = await Promise.all([
    supabase
      .from("analyses")
      .select("id, extracted_text, score, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("roadmaps")
      .select("id, target_domain, interested_role, source, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("guidance")
      .select("id, created_at")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (analysesResult.error || roadmapsResult.error || guidanceResult.error) {
    const details = [analysesResult.error?.message, roadmapsResult.error?.message, guidanceResult.error?.message]
      .filter(Boolean)
      .join(" | ");

    return NextResponse.json({
      analyses: [],
      roadmaps: [],
      guidance: [],
      warning: `History unavailable: ${details || "database query failed"}`,
    });
  }

  return NextResponse.json({
    analyses: analysesResult.data ?? [],
    roadmaps: roadmapsResult.data ?? [],
    guidance: guidanceResult.data ?? [],
    warning: null,
  });
}
