-- Run in Supabase SQL editor.
-- Uses NextAuth user id (JWT sub) as user_id.

create table if not exists public.profiles (
  user_id text primary key,
  email text not null unique,
  full_name text,
  degree text,
  skill_level text,
  interested_role text,
  target_domain text,
  career_preference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.roadmaps enable row level security;
alter table public.guidance enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows"
on public.profiles
for all
to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "analyses own rows" on public.analyses;
create policy "analyses own rows"
on public.analyses
for all
to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "roadmaps own rows" on public.roadmaps;
create policy "roadmaps own rows"
on public.roadmaps
for all
to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);

drop policy if exists "guidance own rows" on public.guidance;
create policy "guidance own rows"
on public.guidance
for all
to authenticated
using ((auth.jwt() ->> 'sub') = user_id)
with check ((auth.jwt() ->> 'sub') = user_id);
