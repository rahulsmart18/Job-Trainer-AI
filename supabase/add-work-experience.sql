-- Add work experience column for fresher vs job-switcher personalization.
-- Safe to re-run. Or use: npm run db:migrate

alter table public.profiles add column if not exists work_experience text;
