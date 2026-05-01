'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge, PRIORITY_TONES, RESULT_TONES } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea, Input, Label } from '@/components/ui/input';
import { setResultAction } from '../actions';
import type { ResultStatus, TestStep } from '@/lib/supabase/database.types';

const STATUSES: { value: ResultStatus; label: string }[] = [
  { value: 'passed', label: 'Pass' },
  { value: 'failed', label: 'Fail' },
  { value: 'blocked', label: 'Block' },
  { value: 'skipped', label: 'Skip' },
  { value: 'pending', label: 'Reset' },
];

export default function RunRow({
  projectId,
  runId,
  row,
  locked,
}: {
  projectId: string;
  runId: string;
  row: {
    resultId: string;
    status: ResultStatus;
    notes: string | null;
    durationMs: number | null;
    executedAt: string | null;
    tcase: {
      id: string;
      title: string;
      preconditions: string | null;
      expected_result: string | null;
      steps: TestStep[];
      priority: 'low' | 'medium' | 'high' | 'critical';
    };
  };
  locked: boolean;
}) {
  const [open, setOpen] = useState(row.status === 'failed' || row.status === 'blocked');
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<ResultStatus>(row.status);

  function setStatusOnly(next: ResultStatus) {
    setStatus(next);
    const fd = new FormData();
    fd.set('result_id', row.resultId);
    fd.set('run_id', runId);
    fd.set('project_id', projectId);
    fd.set('status', next);
    fd.set('notes', row.notes ?? '');
    if (row.durationMs != null) fd.set('duration_ms', String(row.durationMs));
    startTransition(() => setResultAction(fd));
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 text-left"
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="font-medium">{row.tcase.title}</span>
          </button>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone={PRIORITY_TONES[row.tcase.priority]}>{row.tcase.priority}</Badge>
            <Badge tone={RESULT_TONES[status]}>{status}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={locked || pending}
              onClick={() => setStatusOnly(s.value)}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                status === s.value
                  ? toneClassFor(s.value)
                  : 'border-[color:var(--border)] hover:bg-[color:var(--muted)]'
              } ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {s.label}
            </button>
          ))}
          <Link
            href={`/projects/${projectId}/bugs/new?run_result=${row.resultId}&case=${row.tcase.id}`}
            className="ml-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-[color:var(--destructive)]/40 px-2 text-xs font-medium text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/10"
          >
            <Bug className="h-3.5 w-3.5" />
            File bug
          </Link>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-4">
          {row.tcase.preconditions ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Preconditions
              </div>
              <p className="whitespace-pre-wrap text-sm">{row.tcase.preconditions}</p>
            </div>
          ) : null}
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Steps
            </div>
            <ol className="space-y-2">
              {row.tcase.steps.map((s, i) => (
                <li
                  key={i}
                  className="grid gap-2 rounded-md bg-[color:var(--card)] p-3 sm:grid-cols-2"
                >
                  <div>
                    <div className="text-[10px] uppercase text-[color:var(--muted-foreground)]">
                      Step {i + 1}
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{s.step}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[color:var(--muted-foreground)]">
                      Expected
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{s.expected}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {row.tcase.expected_result ? (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                Final expected outcome
              </div>
              <p className="whitespace-pre-wrap text-sm">{row.tcase.expected_result}</p>
            </div>
          ) : null}

          <form
            action={(fd) => {
              fd.set('result_id', row.resultId);
              fd.set('run_id', runId);
              fd.set('project_id', projectId);
              fd.set('status', status);
              startTransition(() => setResultAction(fd));
            }}
            className="grid gap-3 sm:grid-cols-[1fr_140px_auto]"
          >
            <div>
              <Label htmlFor={`notes-${row.resultId}`}>Notes / evidence</Label>
              <Textarea
                id={`notes-${row.resultId}`}
                name="notes"
                rows={2}
                defaultValue={row.notes ?? ''}
                placeholder="What you observed, links to screenshots, etc."
                disabled={locked}
              />
            </div>
            <div>
              <Label htmlFor={`duration-${row.resultId}`}>Duration (ms)</Label>
              <Input
                id={`duration-${row.resultId}`}
                name="duration_ms"
                type="number"
                min={0}
                defaultValue={row.durationMs ?? ''}
                disabled={locked}
              />
            </div>
            <Button type="submit" size="sm" disabled={locked || pending}>
              {pending ? 'Saving…' : 'Save details'}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function toneClassFor(s: ResultStatus): string {
  switch (s) {
    case 'passed':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    case 'failed':
      return 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300';
    case 'blocked':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
    case 'skipped':
      return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
    default:
      return 'border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)]';
  }
}
