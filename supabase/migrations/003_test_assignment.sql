-- =====================================================================
-- Patch: per-run test assignment
--
-- Adds `assigned_to` to test_run_results so managers can pre-assign which
-- tester is responsible for which case inside a run. Also relaxes the
-- modify policy so an assignee can update their own row even if they
-- otherwise only have the `developer` role.
-- =====================================================================

alter table public.test_run_results
  add column if not exists assigned_to uuid references public.profiles(id);

create index if not exists idx_run_results_assignee
  on public.test_run_results(assigned_to);

-- An assignee can always update their own row; otherwise the regular role
-- gate (owner / manager / qa_engineer) applies.
drop policy if exists "run_results_modify" on public.test_run_results;
create policy "run_results_modify" on public.test_run_results
  for all using (
    assigned_to = auth.uid()
    or exists (
      select 1 from public.test_runs r
      where r.id = run_id
        and public.has_project_role(
              auth.uid(),
              r.project_id,
              array['owner','manager','qa_engineer']::project_role[]
            )
    )
  )
  with check (
    assigned_to = auth.uid()
    or exists (
      select 1 from public.test_runs r
      where r.id = run_id
        and public.has_project_role(
              auth.uid(),
              r.project_id,
              array['owner','manager','qa_engineer']::project_role[]
            )
    )
  );
