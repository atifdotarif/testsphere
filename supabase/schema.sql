-- =====================================================================
-- Test Sphere — Bug Tracking & Test Management System
-- Supabase / Postgres schema with Row-Level Security
-- =====================================================================
--
-- Run this entire file in the Supabase SQL editor (or via the CLI) on
-- a fresh project. It creates all tables, indexes, helper functions,
-- triggers and RLS policies needed by the application.
--
-- After running this file, sign up your first user through the app and
-- then run the snippet at the bottom (commented out) to promote that
-- user to a global `admin`.

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$ begin
  create type app_role as enum ('admin', 'manager', 'qa_engineer', 'developer', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_role as enum ('owner', 'manager', 'qa_engineer', 'developer', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type test_priority as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_status as enum ('draft', 'active', 'deprecated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type run_status as enum ('not_started', 'in_progress', 'completed', 'aborted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type result_status as enum ('pending', 'passed', 'failed', 'blocked', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bug_severity as enum ('trivial', 'minor', 'major', 'critical', 'blocker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bug_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type bug_status as enum ('new', 'triaged', 'in_progress', 'resolved', 'verified', 'reopened', 'closed', 'wont_fix');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  email        text not null,
  avatar_url   text,
  role         app_role not null default 'qa_engineer',
  created_at   timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'qa_engineer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  key          text unique not null,
  name         text not null,
  description  text,
  created_by   uuid not null references public.profiles(id),
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         project_role not null default 'viewer',
  joined_at    timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists idx_project_members_user on public.project_members(user_id);

-- ---------------------------------------------------------------------
-- Test suites & test cases
-- ---------------------------------------------------------------------
create table if not exists public.test_suites (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  name         text not null,
  description  text,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists idx_test_suites_project on public.test_suites(project_id);

create table if not exists public.test_cases (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  suite_id        uuid references public.test_suites(id) on delete set null,
  title           text not null,
  preconditions   text,
  steps           jsonb not null default '[]'::jsonb, -- array of {step, expected}
  expected_result text,
  priority        test_priority not null default 'medium',
  status          case_status not null default 'active',
  tags            text[] not null default '{}',
  source          jsonb,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_test_cases_project on public.test_cases(project_id);
create index if not exists idx_test_cases_suite on public.test_cases(suite_id);

-- ---------------------------------------------------------------------
-- Test plans & runs
-- ---------------------------------------------------------------------
create table if not exists public.test_plans (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  name         text not null,
  description  text,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now()
);

create index if not exists idx_test_plans_project on public.test_plans(project_id);

create table if not exists public.test_plan_cases (
  plan_id   uuid not null references public.test_plans(id) on delete cascade,
  case_id   uuid not null references public.test_cases(id) on delete cascade,
  position  int not null default 0,
  primary key (plan_id, case_id)
);

create table if not exists public.test_runs (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  plan_id       uuid references public.test_plans(id) on delete set null,
  name          text not null,
  description   text,
  status        run_status not null default 'not_started',
  environment   text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_test_runs_project on public.test_runs(project_id);
create index if not exists idx_test_runs_plan on public.test_runs(plan_id);

create table if not exists public.test_run_results (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references public.test_runs(id) on delete cascade,
  case_id      uuid not null references public.test_cases(id) on delete cascade,
  status       result_status not null default 'pending',
  notes        text,
  duration_ms  int,
  assigned_to  uuid references public.profiles(id),
  executed_by  uuid references public.profiles(id),
  executed_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (run_id, case_id)
);

create index if not exists idx_run_results_run on public.test_run_results(run_id);
create index if not exists idx_run_results_case on public.test_run_results(case_id);
create index if not exists idx_run_results_assignee on public.test_run_results(assigned_to);

-- ---------------------------------------------------------------------
-- Bugs & comments
-- ---------------------------------------------------------------------
create table if not exists public.bugs (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  title           text not null,
  description     text,
  steps_to_reproduce text,
  expected_result text,
  actual_result   text,
  severity        bug_severity not null default 'minor',
  priority        bug_priority not null default 'medium',
  status          bug_status not null default 'new',
  environment     text,
  reporter_id     uuid not null references public.profiles(id),
  assignee_id     uuid references public.profiles(id),
  run_result_id   uuid references public.test_run_results(id) on delete set null,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_bugs_project on public.bugs(project_id);
create index if not exists idx_bugs_assignee on public.bugs(assignee_id);
create index if not exists idx_bugs_status on public.bugs(status);

create table if not exists public.bug_comments (
  id          uuid primary key default gen_random_uuid(),
  bug_id      uuid not null references public.bugs(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_bug_comments_bug on public.bug_comments(bug_id);

-- ---------------------------------------------------------------------
-- Activity feed
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references public.profiles(id),
  entity_type  text not null,         -- 'test_case' | 'bug' | 'test_run' | 'project' | ...
  entity_id    uuid,
  action       text not null,         -- 'created' | 'updated' | 'status_changed' | 'commented' | ...
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_activity_project_created on public.activity_log(project_id, created_at desc);

-- ---------------------------------------------------------------------
-- Helper functions  (used by RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_global_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

create or replace function public.is_project_member(uid uuid, pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.user_id = uid and pm.project_id = pid
  ) or public.is_global_admin(uid);
$$;

create or replace function public.has_project_role(uid uuid, pid uuid, allowed project_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_global_admin(uid) or exists (
    select 1 from public.project_members pm
    where pm.user_id = uid
      and pm.project_id = pid
      and pm.role = any(allowed)
  );
$$;

-- updated_at trigger helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_test_cases_touch on public.test_cases;
create trigger trg_test_cases_touch
  before update on public.test_cases
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_bugs_touch on public.bugs;
create trigger trg_bugs_touch
  before update on public.bugs
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- create_project RPC
--
-- Inserting a project and immediately adding the creator as an "owner"
-- member needs to be atomic. Doing it as two separate client calls runs
-- into a chicken-and-egg with RLS: the projects SELECT policy requires
-- membership, so the row returned by `INSERT ... RETURNING` would not
-- be visible to the creator until the project_members row exists. Bundling
-- both writes in a SECURITY DEFINER function avoids the race.
-- ---------------------------------------------------------------------
create or replace function public.create_project(
  p_name        text,
  p_key         text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  new_id uuid;
begin
  if caller is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  -- If the on_auth_user_created trigger missed (rare, e.g. profile was
  -- deleted manually) recreate the profile row from auth.users.
  insert into public.profiles (id, full_name, email)
  select au.id,
         coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
         au.email
  from auth.users au
  where au.id = caller
  on conflict (id) do nothing;

  insert into public.projects (name, key, description, created_by)
  values (p_name, p_key, p_description, caller)
  returning id into new_id;

  insert into public.project_members (project_id, user_id, role)
  values (new_id, caller, 'owner');

  insert into public.activity_log (project_id, user_id, entity_type, entity_id, action, metadata)
  values (new_id, caller, 'project', new_id, 'created', jsonb_build_object('name', p_name));

  return new_id;
end;
$$;

revoke all on function public.create_project(text, text, text) from public;
grant execute on function public.create_project(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.projects          enable row level security;
alter table public.project_members   enable row level security;
alter table public.test_suites       enable row level security;
alter table public.test_cases        enable row level security;
alter table public.test_plans        enable row level security;
alter table public.test_plan_cases   enable row level security;
alter table public.test_runs         enable row level security;
alter table public.test_run_results  enable row level security;
alter table public.bugs              enable row level security;
alter table public.bug_comments      enable row level security;
alter table public.activity_log      enable row level security;

-- profiles: anyone signed in can read profiles (needed to show authors,
-- assignees, etc.). Users can update only their own profile. Admins can
-- update any profile.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id or public.is_global_admin(auth.uid()))
  with check (auth.uid() = id or public.is_global_admin(auth.uid()));

-- projects: members can read; managers/admins can mutate.
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (
    public.is_project_member(auth.uid(), id)
    or created_by = auth.uid()
  );

drop policy if exists "projects_insert" on public.projects;
create policy "projects_insert" on public.projects
  for insert with check (auth.uid() = created_by);

drop policy if exists "projects_update" on public.projects;
create policy "projects_update" on public.projects
  for update using (public.has_project_role(auth.uid(), id, array['owner','manager']::project_role[]))
  with check (public.has_project_role(auth.uid(), id, array['owner','manager']::project_role[]));

drop policy if exists "projects_delete" on public.projects;
create policy "projects_delete" on public.projects
  for delete using (public.has_project_role(auth.uid(), id, array['owner']::project_role[]));

-- project_members
drop policy if exists "members_select" on public.project_members;
create policy "members_select" on public.project_members
  for select using (public.is_project_member(auth.uid(), project_id));

drop policy if exists "members_modify" on public.project_members;
create policy "members_modify" on public.project_members
  for all using (public.has_project_role(auth.uid(), project_id, array['owner','manager']::project_role[]))
  with check (public.has_project_role(auth.uid(), project_id, array['owner','manager']::project_role[]));

-- generic helper macro: a project-scoped table where members can read
-- and qa_engineer/developer/manager/owner can mutate.
-- We expand this for each table since Postgres lacks true policy macros.

-- test_suites
drop policy if exists "suites_select" on public.test_suites;
create policy "suites_select" on public.test_suites
  for select using (public.is_project_member(auth.uid(), project_id));
drop policy if exists "suites_modify" on public.test_suites;
create policy "suites_modify" on public.test_suites
  for all using (public.has_project_role(auth.uid(), project_id, array['owner','manager','qa_engineer']::project_role[]))
  with check (public.has_project_role(auth.uid(), project_id, array['owner','manager','qa_engineer']::project_role[]));

-- test_cases
drop policy if exists "cases_select" on public.test_cases;
create policy "cases_select" on public.test_cases
  for select using (public.is_project_member(auth.uid(), project_id));
drop policy if exists "cases_modify" on public.test_cases;
create policy "cases_modify" on public.test_cases
  for all using (public.has_project_role(auth.uid(), project_id, array['owner','manager','qa_engineer']::project_role[]))
  with check (public.has_project_role(auth.uid(), project_id, array['owner','manager','qa_engineer']::project_role[]));

-- test_plans
drop policy if exists "plans_select" on public.test_plans;
create policy "plans_select" on public.test_plans
  for select using (public.is_project_member(auth.uid(), project_id));
drop policy if exists "plans_modify" on public.test_plans;
create policy "plans_modify" on public.test_plans
  for all using (public.has_project_role(auth.uid(), project_id, array['owner','manager','qa_engineer']::project_role[]))
  with check (public.has_project_role(auth.uid(), project_id, array['owner','manager','qa_engineer']::project_role[]));

-- test_plan_cases (read/write via parent plan project)
drop policy if exists "plan_cases_select" on public.test_plan_cases;
create policy "plan_cases_select" on public.test_plan_cases
  for select using (
    exists (
      select 1 from public.test_plans tp
      where tp.id = plan_id and public.is_project_member(auth.uid(), tp.project_id)
    )
  );
drop policy if exists "plan_cases_modify" on public.test_plan_cases;
create policy "plan_cases_modify" on public.test_plan_cases
  for all using (
    exists (
      select 1 from public.test_plans tp
      where tp.id = plan_id
        and public.has_project_role(auth.uid(), tp.project_id, array['owner','manager','qa_engineer']::project_role[])
    )
  ) with check (
    exists (
      select 1 from public.test_plans tp
      where tp.id = plan_id
        and public.has_project_role(auth.uid(), tp.project_id, array['owner','manager','qa_engineer']::project_role[])
    )
  );

-- test_runs
drop policy if exists "runs_select" on public.test_runs;
create policy "runs_select" on public.test_runs
  for select using (public.is_project_member(auth.uid(), project_id));
drop policy if exists "runs_modify" on public.test_runs;
create policy "runs_modify" on public.test_runs
  for all using (public.has_project_role(auth.uid(), project_id, array['owner','manager','qa_engineer']::project_role[]))
  with check (public.has_project_role(auth.uid(), project_id, array['owner','manager','qa_engineer']::project_role[]));

-- test_run_results
drop policy if exists "run_results_select" on public.test_run_results;
create policy "run_results_select" on public.test_run_results
  for select using (
    exists (
      select 1 from public.test_runs r
      where r.id = run_id and public.is_project_member(auth.uid(), r.project_id)
    )
  );
drop policy if exists "run_results_modify" on public.test_run_results;
create policy "run_results_modify" on public.test_run_results
  for all using (
    assigned_to = auth.uid()
    or exists (
      select 1 from public.test_runs r
      where r.id = run_id
        and public.has_project_role(auth.uid(), r.project_id, array['owner','manager','qa_engineer']::project_role[])
    )
  ) with check (
    assigned_to = auth.uid()
    or exists (
      select 1 from public.test_runs r
      where r.id = run_id
        and public.has_project_role(auth.uid(), r.project_id, array['owner','manager','qa_engineer']::project_role[])
    )
  );

-- bugs: members can read; anyone with a non-viewer project role can create/modify
drop policy if exists "bugs_select" on public.bugs;
create policy "bugs_select" on public.bugs
  for select using (public.is_project_member(auth.uid(), project_id));
drop policy if exists "bugs_insert" on public.bugs;
create policy "bugs_insert" on public.bugs
  for insert with check (
    public.has_project_role(auth.uid(), project_id,
      array['owner','manager','qa_engineer','developer']::project_role[])
    and reporter_id = auth.uid()
  );
drop policy if exists "bugs_update" on public.bugs;
create policy "bugs_update" on public.bugs
  for update using (public.has_project_role(auth.uid(), project_id,
    array['owner','manager','qa_engineer','developer']::project_role[]))
  with check (public.has_project_role(auth.uid(), project_id,
    array['owner','manager','qa_engineer','developer']::project_role[]));
drop policy if exists "bugs_delete" on public.bugs;
create policy "bugs_delete" on public.bugs
  for delete using (public.has_project_role(auth.uid(), project_id,
    array['owner','manager']::project_role[]));

-- bug_comments
drop policy if exists "bug_comments_select" on public.bug_comments;
create policy "bug_comments_select" on public.bug_comments
  for select using (
    exists (
      select 1 from public.bugs b
      where b.id = bug_id and public.is_project_member(auth.uid(), b.project_id)
    )
  );
drop policy if exists "bug_comments_insert" on public.bug_comments;
create policy "bug_comments_insert" on public.bug_comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.bugs b
      where b.id = bug_id and public.is_project_member(auth.uid(), b.project_id)
    )
  );
drop policy if exists "bug_comments_delete" on public.bug_comments;
create policy "bug_comments_delete" on public.bug_comments
  for delete using (user_id = auth.uid() or public.is_global_admin(auth.uid()));

-- activity_log: members can read, anyone authenticated can append rows for
-- projects they are a member of (server actions are responsible for setting
-- correct values).
drop policy if exists "activity_select" on public.activity_log;
create policy "activity_select" on public.activity_log
  for select using (public.is_project_member(auth.uid(), project_id));
drop policy if exists "activity_insert" on public.activity_log;
create policy "activity_insert" on public.activity_log
  for insert with check (
    user_id = auth.uid() and public.is_project_member(auth.uid(), project_id)
  );

-- ---------------------------------------------------------------------
-- Promote the first user to admin (uncomment after signing up):
-- update public.profiles set role = 'admin' where email = 'you@example.com';
-- ---------------------------------------------------------------------
