-- =====================================================================
-- Patch: atomic create_project + relax projects_select policy
--
-- Run this in the Supabase SQL editor if you already applied schema.sql
-- and are hitting "new row violates row-level security policy for table
-- 'projects'" when creating a project. Brand-new installs already have
-- this in schema.sql, so they don't need to run this file.
-- =====================================================================

-- Allow the project creator to SELECT their own project even before the
-- project_members row has been written. Defense-in-depth — also helps any
-- direct admin scripts.
drop policy if exists "projects_select" on public.projects;
create policy "projects_select" on public.projects
  for select using (
    public.is_project_member(auth.uid(), id)
    or created_by = auth.uid()
  );

-- Atomic project creation: insert the project, add the caller as an owner,
-- log the activity. SECURITY DEFINER so RLS on the inner tables doesn't
-- block the chain. We re-check `auth.uid()` ourselves for safety.
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

  -- Make sure the caller has a profile row.
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
