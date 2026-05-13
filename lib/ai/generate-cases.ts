import 'server-only';

import OpenAI from 'openai';
import type {
  TestPriority,
} from '@/lib/supabase/database.types';

export class AIError extends Error {
  constructor(message: string, public hint?: string) {
    super(message);
    this.name = 'AIError';
  }
}

export type GeneratedCase = {
  title: string;
  description: string;
  preconditions: string;
  steps: { step: string; expected: string }[];
  expected_result: string;
  priority: TestPriority;
  tags: string[];
};

export type GenerateInput = {
  projectName: string;
  repoFullName?: string;
  ref?: string | null;
  // Up to N source documents. Each is title + body. The caller is
  // responsible for trimming overly large bodies before passing them in.
  documents: { path: string; kind: string; content: string }[];
  // Number of cases the user asked for (clamped 1..15).
  count: number;
  // Free-form direction from the user, e.g. "focus on edge cases".
  guidance?: string;
};

const SYSTEM_PROMPT = `You are an experienced QA engineer.

You read product documentation and source code, then propose **realistic, executable manual test cases**.

Rules:
- Output strictly conforms to the requested JSON schema. No prose, no markdown, no \`\`\` fences.
- Each test case is something a human tester could realistically execute against a running build.
- Cover happy paths, edge cases, validation, and error handling — bias toward what the inputs reveal as user-facing behavior.
- "preconditions" describes what must be true before the tester starts (data, setup, role).
- "steps" is an ordered list. Each step has the action ("step") and the observable result ("expected"). Aim for 3–7 steps per case.
- Set "priority" by impact: "critical" for blocking flows or data integrity, "high" for major features, "medium" for normal flows, "low" for cosmetic.
- "tags" should be 1–4 short kebab-case labels derived from the feature (e.g. "auth", "checkout", "rls").
- Do NOT invent product features that are not mentioned in the documents.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cases'],
  properties: {
    cases: {
      type: 'array',
      minItems: 1,
      maxItems: 25,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'description',
          'preconditions',
          'steps',
          'expected_result',
          'priority',
          'tags',
        ],
        properties: {
          title: { type: 'string', minLength: 5, maxLength: 160 },
          description: { type: 'string', maxLength: 600 },
          preconditions: { type: 'string', maxLength: 600 },
          steps: {
            type: 'array',
            minItems: 1,
            maxItems: 12,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['step', 'expected'],
              properties: {
                step: { type: 'string', minLength: 3 },
                expected: { type: 'string', minLength: 3 },
              },
            },
          },
          expected_result: { type: 'string', maxLength: 600 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          tags: {
            type: 'array',
            maxItems: 6,
            items: { type: 'string', maxLength: 32 },
          },
        },
      },
    },
  },
} as const;

// Per-request budget. Big enough for ~10 well-formed cases, small enough to
// cap the bill if a user asks for too many at once.
const MAX_OUTPUT_TOKENS = 4000;

// Hard cap on the size of a single document we send. The UI warns earlier;
// this is the last line of defense against runaway input tokens.
const MAX_DOC_CHARS = 12_000;

export const DEFAULT_MODEL =
  process.env.OPENAI_MODEL || 'gpt-4o-mini';

function trim(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n\n[…truncated, original was ${s.length.toLocaleString()} characters]`;
}

function buildUserMessage(input: GenerateInput): string {
  const parts: string[] = [];
  parts.push(`Project name: ${input.projectName}`);
  if (input.repoFullName) {
    parts.push(`Source repository: ${input.repoFullName}${input.ref ? `@${input.ref}` : ''}`);
  }
  parts.push(`Generate ${input.count} test case(s).`);
  if (input.guidance) parts.push(`Tester guidance: ${input.guidance}`);

  parts.push('');
  parts.push('--- DOCUMENTS ---');
  for (const doc of input.documents) {
    parts.push(`\n# [${doc.kind.toUpperCase()}] ${doc.path}\n`);
    parts.push(trim(doc.content, MAX_DOC_CHARS));
  }
  return parts.join('\n');
}

export async function generateTestCases(
  input: GenerateInput
): Promise<{ cases: GeneratedCase[]; model: string; usage: { input: number; output: number } | null }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIError(
      'Smart Test Generator is not configured',
      'Set OPENAI_API_KEY in .env.local and restart the dev server.'
    );
  }
  if (input.documents.length === 0) {
    throw new AIError('No documents to analyze', 'Pick at least one file or document.');
  }

  const count = Math.min(15, Math.max(1, Math.floor(input.count || 5)));
  const client = new OpenAI({ apiKey });

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.4,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage({ ...input, count }) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'test_cases',
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; code?: string };
    if (e.status === 429) {
      throw new AIError(
        'OpenAI rate limit reached',
        'Wait a minute and try again, or generate fewer cases at once.'
      );
    }
    if (e.status === 401) {
      throw new AIError(
        'OpenAI rejected the API key',
        'Check OPENAI_API_KEY in your .env.local.'
      );
    }
    if (e.code === 'context_length_exceeded') {
      throw new AIError(
        'Too much content for the model',
        'Pick fewer or smaller files and try again.'
      );
    }
    throw new AIError(`OpenAI error: ${e.message ?? 'unknown'}`);
  }

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new AIError('OpenAI returned an empty response');

  let parsed: { cases: GeneratedCase[] };
  try {
    parsed = JSON.parse(raw) as { cases: GeneratedCase[] };
  } catch {
    throw new AIError('OpenAI returned non-JSON output');
  }
  if (!Array.isArray(parsed.cases) || parsed.cases.length === 0) {
    throw new AIError('OpenAI returned no test cases');
  }

  return {
    cases: parsed.cases,
    model: completion.model,
    usage: completion.usage
      ? { input: completion.usage.prompt_tokens, output: completion.usage.completion_tokens }
      : null,
  };
}
