import type { SupabaseClient } from "@supabase/supabase-js";

let cachedHasWorkExperienceColumn: boolean | null = null;

/** Probes PostgREST once per process — true when profiles.work_experience exists. */
export async function hasWorkExperienceColumn(supabase: SupabaseClient): Promise<boolean> {
  if (cachedHasWorkExperienceColumn !== null) return cachedHasWorkExperienceColumn;

  const { error } = await supabase.from("profiles").select("work_experience").limit(0);
  cachedHasWorkExperienceColumn =
    !error || !/column|schema cache/i.test(error.message ?? "");
  return cachedHasWorkExperienceColumn;
}

export function resetWorkExperienceColumnCache(): void {
  cachedHasWorkExperienceColumn = null;
}

const PROFILE_FIELDS_WITHOUT_WORK_EXP =
  "full_name, degree, skill_level, interested_role, target_domain, career_preference, city, graduation_year, coding_level, english_level, has_projects, job_search_status, joining_timeline, onboarding_complete";

export function profileSelectColumns(hasWorkExperienceColumn: boolean): string {
  return hasWorkExperienceColumn
    ? `${PROFILE_FIELDS_WITHOUT_WORK_EXP}, work_experience`
    : PROFILE_FIELDS_WITHOUT_WORK_EXP;
}
