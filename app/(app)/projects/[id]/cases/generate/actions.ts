'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AIError, generateTestCases, type GeneratedCase } from '@/lib/ai/generate-cases';

const DocSchema = z.object({
  path: z.string().min(1).max(500),
  kind: z.string().min(1).max(40),
  content: z.string().min(1).max(60_000),
});

const GenerateSchema = z.object({
  documents: z.array(DocSchema).min(1).max(8),
  count: z.coerce.number().int().min(1).max(15),
  guidance: z.string().max(500).optional(),
  repo: z.string().max(160).optional(),
  ref: z.string().max(100).optional().nullable(),
});

export type GenerateState =
  | {
      ok: true;
      cases: GeneratedCase[];
      model: string;
      inputTokens: number;
      outputTokens: number;
      meta: { repo?: string; ref?: string | null; files: string[] };
    }
  | { ok: false; message: string; hint?: string }
  | undefined;

export async function generateCasesAction(
  projectId: string,
  _prev: GenerateState,
  formData: FormData
): Promise<GenerateState> {
  await requireUser();

  let parsedDocs: { path: string; kind: string; content: string }[] = [];
  try {
    parsedDocs = JSON.parse((formData.get('documents') as string) || '[]');
  } catch {
    return { ok: false, message: 'Could not parse selected documents' };
  }

  const parsed = GenerateSchema.safeParse({
    documents: parsedDocs,
    count: formData.get('count') ?? 5,
    guidance: formData.get('guidance') || undefined,
    repo: formData.get('repo') || undefined,
    ref: formData.get('ref') || null,
  });
  if (!parsed.success) {
    return { ok: false, message: 'Invalid input — check the document selection.' };
  }

  // Fetch the project name once for richer prompt context.
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .maybeSingle();

  try {
    const { cases, model, usage } = await generateTestCases({
      projectName: project?.name ?? 'Untitled project',
      repoFullName: parsed.data.repo,
      ref: parsed.data.ref,
      documents: parsed.data.documents,
      count: parsed.data.count,
      guidance: parsed.data.guidance,
    });

    return {
      ok: true,
      cases,
      model,
      inputTokens: usage?.input ?? 0,
      outputTokens: usage?.output ?? 0,
      meta: {
        repo: parsed.data.repo,
        ref: parsed.data.ref ?? null,
        files: parsed.data.documents.map((d) => d.path),
      },
    };
  } catch (err) {
    if (err instanceof AIError) {
      return { ok: false, message: err.message, hint: err.hint };
    }
    return { ok: false, message: 'Unexpected error generating cases' };
  }
}

const SaveSchema = z.object({
  project_id: z.string().uuid(),
  suite_id: z.string().uuid().optional().nullable(),
  model: z.string().max(80),
  repo: z.string().max(160).optional().nullable(),
  ref: z.string().max(100).optional().nullable(),
  cases: z.array(
    z.object({
      title: z.string().min(3),
      description: z.string().optional().default(''),
      preconditions: z.string().optional().default(''),
      expected_result: z.string().optional().default(''),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      tags: z.array(z.string()).default([]),
      steps: z
        .array(z.object({ step: z.string().min(1), expected: z.string().min(1) }))
        .min(1),
      source_files: z.array(z.string()).optional().default([]),
    })
  ).min(1),
});

export type SaveState =
  | { ok: true; saved: number }
  | { ok: false; message: string }
  | undefined;

export async function saveGeneratedCasesAction(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const { userId } = await requireUser();

  let payload: unknown;
  try {
    payload = JSON.parse((formData.get('payload') as string) || '{}');
  } catch {
    return { ok: false, message: 'Bad payload' };
  }

  const parsed = SaveSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: 'Invalid cases payload' };
  }

  const supabase = await createClient();

  const generatedAt = new Date().toISOString();
  const rows = parsed.data.cases.map((c) => {
    // The model emits a short narrative `description` and a separate
    // `preconditions` field. Our schema only has `preconditions`, so we
    // compose a clean prose block: preconditions first (real test state),
    // then the narrative as supporting context.
    const blocks: string[] = [];
    if (c.preconditions?.trim()) blocks.push(c.preconditions.trim());
    if (c.description?.trim()) {
      blocks.push(
        `_Context:_ ${c.description.trim()}`
      );
    }
    return {
      project_id: parsed.data.project_id,
      suite_id: parsed.data.suite_id ?? null,
      title: c.title,
      preconditions: blocks.length > 0 ? blocks.join('\n\n') : null,
      expected_result: c.expected_result || null,
      priority: c.priority,
      status: 'draft' as const,
      tags: c.tags,
      steps: c.steps,
      source: {
        type: 'ai',
        provider: 'openai',
        model: parsed.data.model,
        repo: parsed.data.repo ?? null,
        ref: parsed.data.ref ?? null,
        files: c.source_files,
        generated_at: generatedAt,
      },
      created_by: userId,
    };
  });

  const { error, data: inserted } = await supabase
    .from('test_cases')
    .insert(rows)
    .select('id');

  if (error) return { ok: false, message: error.message };

  await supabase.from('activity_log').insert({
    project_id: parsed.data.project_id,
    user_id: userId,
    entity_type: 'test_case',
    action: 'generated',
    metadata: {
      count: rows.length,
      model: parsed.data.model,
      repo: parsed.data.repo,
      ref: parsed.data.ref,
    },
  });

  revalidatePath(`/projects/${parsed.data.project_id}/cases`);
  revalidatePath(`/projects/${parsed.data.project_id}`);
  return { ok: true, saved: inserted?.length ?? rows.length };
}
