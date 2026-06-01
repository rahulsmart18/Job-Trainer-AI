-- =============================================================================
-- Job Trainer AI — migrate EXISTING Supabase project (safe to re-run)
-- =============================================================================
-- How to run:
--   1. Open Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file and click Run
--   3. In your app folder: npm run db:check
--
-- New project with empty DB? Use schema.sql instead.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: add missing onboarding + payment columns
-- -----------------------------------------------------------------------------
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists graduation_year text;
alter table public.profiles add column if not exists coding_level int;
alter table public.profiles add column if not exists english_level int;
alter table public.profiles add column if not exists has_projects text;
alter table public.profiles add column if not exists job_search_status text;
alter table public.profiles add column if not exists joining_timeline text;
alter table public.profiles add column if not exists work_experience text;
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists subscription_status text not null default 'free';
alter table public.profiles add column if not exists subscription_plan text;
alter table public.profiles add column if not exists paid_at timestamptz;
alter table public.profiles add column if not exists payment_provider text;
alter table public.profiles add column if not exists payment_reference text;
alter table public.profiles add column if not exists offer_expires_at timestamptz;
alter table public.profiles add column if not exists discount_percent int not null default 0;
alter table public.profiles add column if not exists trial_started_at timestamptz;
alter table public.profiles add column if not exists trial_ends_at timestamptz;
alter table public.profiles add column if not exists auto_pay_enabled boolean not null default false;
alter table public.profiles add column if not exists trial_cancelled_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Backfill onboarding flag for users who already saved a degree
update public.profiles
set onboarding_complete = true
where onboarding_complete = false
  and coalesce(degree, '') <> '';

-- -----------------------------------------------------------------------------
-- mock_interviews (streak + progress tracking)
-- -----------------------------------------------------------------------------
create table if not exists public.mock_interviews (
  id bigint generated always as identity primary key,
  user_id text not null references public.profiles(user_id) on delete cascade,
  rounds_completed int not null default 3,
  average_score numeric(3,1) not null,
  summary text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Ensure core tables exist (no-op if already created)
-- -----------------------------------------------------------------------------
create table if not exists public.analyses (
  id bigint generated always as identity primary key,
  user_id text not null references public.profiles(user_id) on delete cascade,
  extracted_text text not null,
  score numeric(3,1) not null,
  grammar_mistakes jsonb not null default '[]'::jsonb,
  corrected_sentences jsonb not null default '[]'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.roadmaps (
  id bigint generated always as identity primary key,
  user_id text not null references public.profiles(user_id) on delete cascade,
  degree text,
  skill_level text,
  interested_role text,
  target_domain text,
  career_preference text,
  source text,
  technical_skills jsonb not null default '[]'::jsonb,
  communication_plan jsonb not null default '[]'::jsonb,
  hr_preparation jsonb not null default '[]'::jsonb,
  job_application_strategy jsonb not null default '[]'::jsonb,
  resume_approach jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.guidance (
  id bigint generated always as identity primary key,
  user_id text not null references public.profiles(user_id) on delete cascade,
  hr_communication_tips jsonb not null default '[]'::jsonb,
  recruiter_approach_scripts jsonb not null default '[]'::jsonb,
  common_hr_questions jsonb not null default '[]'::jsonb,
  real_world_scenarios jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.roadmaps enable row level security;
alter table public.guidance enable row level security;
alter table public.mock_interviews enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows"
on public.profiles for all to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "analyses own rows" on public.analyses;
create policy "analyses own rows"
on public.analyses for all to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "roadmaps own rows" on public.roadmaps;
create policy "roadmaps own rows"
on public.roadmaps for all to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "guidance own rows" on public.guidance;
create policy "guidance own rows"
on public.guidance for all to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "mock_interviews own rows" on public.mock_interviews;
create policy "mock_interviews own rows"
on public.mock_interviews for all to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

-- Done. Run: npm run db:check
