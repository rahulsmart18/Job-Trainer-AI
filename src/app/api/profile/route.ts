import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ProfilePayload = {
  fullName?: string;
  degree?: string;
  skillLevel?: string;
  interestedRole?: string;
  targetDomain?: string;
  careerPreference?: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase admin client is not configured correctly. Please set SUPABASE_SERVICE_ROLE_KEY (service_role key, not anon key).",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ProfilePayload;
  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: session.user.id,
      email: session.user.email,
      full_name: body.fullName ?? session.user.name ?? "",
      degree: body.degree ?? "",
      skill_level: body.skillLevel ?? "",
      interested_role: body.interestedRole ?? "",
      target_domain: body.targetDomain ?? "",
      career_preference: body.careerPreference ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    const isRlsError = /row-level security|new row violates/i.test(error.message);
    return NextResponse.json(
      {
        error: isRlsError
          ? "Database permission error. Use SUPABASE_SERVICE_ROLE_KEY (service_role) in .env.local and rerun."
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
