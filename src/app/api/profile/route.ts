import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ProfilePayload } from "@/lib/profile-mapper";
import {
  embedWorkExperienceInCareer,
  resolveCareerPreferenceDisplay,
  resolveWorkExperience,
} from "@/lib/work-experience-storage";
import {
  embedOnboardingDetailsInCareer,
  resolveOnboardingDetails,
} from "@/lib/onboarding-details-storage";
import { hasWorkExperienceColumn, profileSelectColumns } from "@/lib/profile-schema";

const LEGACY_SELECT =
  "full_name, degree, skill_level, interested_role, target_domain, career_preference";

type ProfileRow = {
  full_name: string | null;
  degree: string | null;
  skill_level: string | null;
  interested_role: string | null;
  target_domain: string | null;
  career_preference: string | null;
  city?: string | null;
  graduation_year?: string | null;
  coding_level?: number | null;
  english_level?: number | null;
  has_projects?: string | null;
  job_search_status?: string | null;
  joining_timeline?: string | null;
  work_experience?: string | null;
  onboarding_complete?: boolean | null;
};

function mapProfileRow(data: ProfileRow) {
  const careerRaw = data.career_preference ?? "";
  const onboardingDetails = resolveOnboardingDetails(careerRaw);
  return {
    fullName: data.full_name ?? "",
    degree: data.degree ?? "",
    skillLevel: data.skill_level ?? "",
    interestedRole: data.interested_role ?? "",
    targetDomain: data.target_domain ?? "",
    careerPreference: resolveCareerPreferenceDisplay(undefined, careerRaw),
    workExperience: resolveWorkExperience(data.work_experience, careerRaw),
    studentStatus: onboardingDetails.studentStatus,
    biggestBlocker: onboardingDetails.biggestBlocker,
    weeklyHours: onboardingDetails.weeklyHours,
    interviewExperience: onboardingDetails.interviewExperience,
    jobTrack: onboardingDetails.jobTrack,
    preferredCompanyType: onboardingDetails.preferredCompanyType,
    jobSearchChannel: onboardingDetails.jobSearchChannel,
    interviewLanguage: onboardingDetails.interviewLanguage,
    city: data.city ?? "",
    graduationYear: data.graduation_year ?? "",
    codingLevel: data.coding_level ?? null,
    englishLevel: data.english_level ?? null,
    hasProjects: data.has_projects ?? "",
    jobSearchStatus: data.job_search_status ?? "",
    joiningTimeline: data.joining_timeline ?? "",
    onboardingComplete: data.onboarding_complete ?? false,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 500 });
  }

  const hasWorkExpCol = await hasWorkExperienceColumn(supabase);
  const select = profileSelectColumns(hasWorkExpCol);

  let data: ProfileRow | null = null;
  let error: { message: string; code?: string } | null = null;

  const full = await supabase
    .from("profiles")
    .select(select)
    .eq("user_id", session.user.id)
    .maybeSingle();

  data = (full.data as ProfileRow | null) ?? null;
  error = full.error;

  if (error && /column.*does not exist/i.test(error.message)) {
    const legacy = await supabase
      .from("profiles")
      .select(LEGACY_SELECT)
      .eq("user_id", session.user.id)
      .maybeSingle();
    data = (legacy.data as ProfileRow | null) ?? null;
    error = legacy.error;
  }

  if (error) {
    console.error("[profile] fetch failed:", error.message);
    return NextResponse.json({ error: "Could not load your profile. Please try again." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ profile: null });
  }

  const profile = mapProfileRow(data);
  return NextResponse.json({ profile });
}

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
  const hasWorkExpCol = await hasWorkExperienceColumn(supabase);

  const careerForDb = embedOnboardingDetailsInCareer(
    embedWorkExperienceInCareer(body.careerPreference ?? "", body.workExperience ?? "fresher"),
    {
      studentStatus: body.studentStatus ?? "",
      biggestBlocker: body.biggestBlocker ?? "",
      weeklyHours: body.weeklyHours ?? "",
      interviewExperience: body.interviewExperience ?? "",
      jobTrack: (body.jobTrack as "it" | "non_it" | "") ?? "",
      preferredCompanyType: body.preferredCompanyType ?? "",
      jobSearchChannel: body.jobSearchChannel ?? "",
      interviewLanguage: body.interviewLanguage ?? "",
    },
  );

  const fullPayload: Record<string, unknown> = {
    user_id: session.user.id,
    email: session.user.email,
    full_name: body.fullName ?? session.user.name ?? "",
    degree: body.degree ?? "",
    skill_level: body.skillLevel ?? "",
    interested_role: body.interestedRole ?? "",
    target_domain: body.targetDomain ?? "",
    career_preference: careerForDb,
    city: body.city ?? "",
    graduation_year: body.graduationYear ?? "",
    coding_level: body.codingLevel ?? null,
    english_level: body.englishLevel ?? null,
    has_projects: body.hasProjects ?? "",
    job_search_status: body.jobSearchStatus ?? "",
    joining_timeline: body.joiningTimeline ?? "",
    onboarding_complete: body.onboardingComplete ?? true,
    updated_at: new Date().toISOString(),
  };

  if (hasWorkExpCol) {
    fullPayload.work_experience = body.workExperience ?? "";
  }

  let { error } = await supabase.from("profiles").upsert(fullPayload, { onConflict: "user_id" });

  if (error && /column.*does not exist/i.test(error.message)) {
    const legacyPayload = {
      user_id: session.user.id,
      email: session.user.email,
      full_name: fullPayload.full_name,
      degree: fullPayload.degree,
      skill_level: fullPayload.skill_level,
      interested_role: fullPayload.interested_role,
      target_domain: fullPayload.target_domain,
      career_preference: careerForDb,
      updated_at: fullPayload.updated_at,
    };
    const legacy = await supabase.from("profiles").upsert(legacyPayload, { onConflict: "user_id" });
    error = legacy.error;
  }

  if (error) {
    const isRlsError = /row-level security|new row violates/i.test(error.message);
    const isMissingColumn = /column.*does not exist/i.test(error.message);
    if (isRlsError || isMissingColumn) {
      return NextResponse.json(
        {
          error: isRlsError
            ? "Database permission error. Use SUPABASE_SERVICE_ROLE_KEY (service_role) in .env.local and rerun."
            : "Database schema is outdated. Run supabase/add-work-experience.sql in the Supabase SQL Editor, then npm run db:check.",
        },
        { status: 500 },
      );
    }
    console.error("[profile] upsert failed:", error.message);
    return NextResponse.json({ error: "Could not save your profile. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, workExperienceStoredIn: hasWorkExpCol ? "column" : "career_preference" });
}
