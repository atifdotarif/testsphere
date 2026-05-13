'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Bug, ChevronDown, ChevronUp, UserCircle2 } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge, BUG_STATUS_TONES, PRIORITY_TONES, RESULT_TONES } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea, Input, Label, Select } from '@/components/ui/input';
import { formatRelative } from '@/lib/utils/format';
import { assignResultAction, setResultAction } from '../actions';
import type {
  BugStatus,
  ResultStatus,
  TestStep,
} from '@/lib/supabase/database.types';

const STATUSES: { value: ResultStatus; label: string }[] = [
  { value: 'passed', label: 'Pass' },
  { value: 'failed', label: 'Fail' },
  { value: 'blocked', label: 'Block' },
  { value: 'skipped', label: 'Skip' },
  { value: 'pending', label: 'Reset' },
];

type Member = { id: string; full_name: string; avatar_url: string | null };

type LinkedBug = {
  id: string;
  title: string;
  status: BugStatus;
};

export default function RunRow({
  projectId,
  runId,
  currentUserId,
  canAssign,
  members,
  linkedBugs,
  row,
  locked,
}: {
  projectId: string;
  runId: string;
  currentUserId: string;
  canAssign: boolean;
  members: Member[];
  linkedBugs: LinkedBug[];
  row: {
    resultId: string;
    status: ResultStatus;
    notes: string | null;
    durationMs: number | null;
    executedAt: string | null;
    assigneeId: string | null;
    assignee: { full_name: string; avatar_url: string | null } | null;
    executor: { full_name: string; avatar_url: string | null } | null;
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
  const [assigneeId, setAssigneeId] = useState<string>(row.assigneeId ?? '');
  const isMine = row.assigneeId === currentUserId;
  const isUnassigned = !row.assigneeId;

  // Strict rule: in a live run, only the assignee (or a manager/owner) can
  // edit a row. Unassigned rows must be claimed via "Take it" first.
  const editable = !locked && (canAssign || isMine);

  // Tooltip explaining why buttons are disabled, when applicable.
  const disabledReason = locked
    ? 'This run is no longer active'
    : isUnassigned
      ? 'Claim this case with "Take it" first'
      : !isMine && !canAssign
        ? `Assigned to ${row.assignee?.full_name ?? 'someone else'}`
        : undefined;

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

  function changeAssignee(next: string) {
    setAssigneeId(next);
    const fd = new FormData();
    fd.set('result_id', row.resultId);
    fd.set('run_id', runId);
    fd.set('project_id', projectId);
    fd.set('assignee_id', next);
    startTransition(() => assignResultAction(fd));
  }

  function takeIt() {
    changeAssignee(currentUserId);
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-[color:var(--card)] ${
        isMine ? 'border-[color:var(--primary)]/40 ring-1 ring-[color:var(--primary)]/10' : 'border-[color:var(--border)]'
      }`}
    >
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
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={PRIORITY_TONES[row.tcase.priority]}>{row.tcase.priority}</Badge>
            <Badge tone={RESULT_TONES[status]}>{status}</Badge>
            <AssigneePill
              assignee={row.assignee}
              assigneeId={row.assigneeId}
              isMine={isMine}
            />
            {row.executor && row.executedAt ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-[color:var(--muted)] px-1.5 py-0.5 text-[10px] text-[color:var(--muted-foreground)]"
                title={`Last updated by ${row.executor.full_name}`}
              >
                <Avatar
                  name={row.executor.full_name}
                  src={row.executor.avatar_url}
                  size="xs"
                />
                executed by {row.executor.full_name} · {formatRelative(row.executedAt)}
              </span>
            ) : null}
            {linkedBugs.map((b) => (
              <Link
                key={b.id}
                href={`/projects/${projectId}/bugs/${b.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/20"
                title={b.title}
              >
                <Bug className="h-3 w-3" />
                <span className="max-w-[160px] truncate">{b.title}</span>
                <Badge tone={BUG_STATUS_TONES[b.status]} className="text-[9px]">
                  {b.status.replace('_', ' ')}
                </Badge>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {/* Status buttons */}
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={!editable || pending}
              title={disabledReason}
              onClick={() => setStatusOnly(s.value)}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                status === s.value
                  ? toneClassFor(s.value)
                  : 'border-[color:var(--border)] hover:bg-[color:var(--muted)]'
              } ${!editable ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {s.label}
            </button>
          ))}

          {/* Quick "claim" button when row is unassigned and viewer isn't a manager */}
          {!canAssign && !row.assigneeId && !locked ? (
            <button
              type="button"
              onClick={takeIt}
              disabled={pending}
              className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-md border border-[color:var(--border)] px-2 text-xs font-medium hover:bg-[color:var(--muted)]"
            >
              <UserCircle2 className="h-3.5 w-3.5" />
              Take it
            </button>
          ) : null}

          <Link
            href={`/projects/${projectId}/bugs/new?run_result=${row.resultId}&case=${row.tcase.id}`}
            className="ml-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-[color:var(--destructive)]/40 px-2 text-xs font-medium text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/10"
          >
            <Bug className="h-3.5 w-3.5" />
            File bug
          </Link>
        </div>
      </div>

      {/* Assignment row (owner/manager only) */}
      {canAssign && !locked ? (
        <div className="flex items-center gap-2 border-t border-[color:var(--border)] bg-[color:var(--muted)]/30 px-4 py-2 text-xs">
          <UserCircle2 className="h-3.5 w-3.5 text-[color:var(--muted-foreground)]" />
          <span className="text-[color:var(--muted-foreground)]">Assignee</span>
          <Select
            value={assigneeId}
            onChange={(e) => changeAssignee(e.target.value)}
            disabled={pending}
            className="h-7 max-w-[220px] text-xs"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {open ? (
        <div className="space-y-3 border-t border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-4">
          {!editable && disabledReason ? (
            <div className="flex items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-xs text-[color:var(--muted-foreground)]">
              <UserCircle2 className="h-3.5 w-3.5" />
              {disabledReason}.
              {isUnassigned && !canAssign ? (
                <button
                  type="button"
                  onClick={takeIt}
                  disabled={pending}
                  className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md border border-[color:var(--primary)]/40 bg-[color:var(--primary)]/10 px-2 text-xs font-medium text-[color:var(--primary)] hover:bg-[color:var(--primary)]/20"
                >
                  <UserCircle2 className="h-3.5 w-3.5" />
                  Take it
                </button>
              ) : null}
            </div>
          ) : null}
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
                disabled={!editable}
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
                disabled={!editable}
              />
            </div>
            <Button type="submit" size="sm" disabled={!editable || pending}>
              {pending ? 'Saving…' : 'Save details'}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function AssigneePill({
  assignee,
  assigneeId,
  isMine,
}: {
  assignee: { full_name: string; avatar_url: string | null } | null;
  assigneeId: string | null;
  isMine: boolean;
}) {
  if (!assigneeId || !assignee) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[color:var(--border)] px-2 py-0.5 text-[10px] text-[color:var(--muted-foreground)]">
        <UserCircle2 className="h-3 w-3" />
        Unassigned
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[10px] ${
        isMine
          ? 'border-[color:var(--primary)]/40 bg-[color:var(--primary)]/10 text-[color:var(--primary)]'
          : 'border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)]'
      }`}
    >
      <Avatar name={assignee.full_name} src={assignee.avatar_url} size="xs" />
      {isMine ? 'You' : assignee.full_name}
    </span>
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
