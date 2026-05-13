-- =====================================================================
-- Patch: Smart Test Generator
--
-- Adds an optional `source` JSONB column to test_cases so AI-generated
-- cases can record the GitHub repo / files they were derived from. New
-- installs of schema.sql also include this column.
-- =====================================================================

alter table public.test_cases
  add column if not exists source jsonb;

comment on column public.test_cases.source is
  'Optional provenance for the test case. For AI-generated cases this is '
  '{"type":"ai","provider":"openai","model":"...","repo":"owner/name","files":[...],"ref":"..."}';
