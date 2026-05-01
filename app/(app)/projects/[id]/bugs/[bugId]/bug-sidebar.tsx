'use client';

import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { formatDateTime } from '@/lib/utils/format';
import { updateBugAction } from '../actions';
import type { BugPriority, BugSeverity, BugStatus } from '@/lib/supabase/database.types';

const STATUSES: BugStatus[] = [
  'new',
  'triaged',
  'in_progress',
  'resolved',
  'verified',
  'reopened',
  'closed',
  'wont_fix',
];

export default function BugSidebar({
  projectId,
  bugId,
  status,
  severity,
  priority,
  assignee,
  reporter,
  environment,
  assignees,
  createdAt,
  closedAt,
}: {
  projectId: string;
  bugId: string;
  status: BugStatus;
  severity: BugSeverity;
  priority: BugPriority;
  assignee: { id: string; full_name: string; avatar_url: string | null; email: string } | null;
  reporter: { id: string; full_name: string; avatar_url: string | null; email: string } | null;
  environment: string | null;
  assignees: { id: string; full_name: string }[];
  createdAt: string;
  closedAt: string | null;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Field label="Status">
            <form
              action={updateBugAction}
              onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}
            >
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="bug_id" value={bugId} />
              <Select name="status" defaultValue={status} className="h-8 text-xs">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </form>
          </Field>
          <Field label="Severity">
            <form
              action={updateBugAction}
              onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}
            >
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="bug_id" value={bugId} />
              <Select name="severity" defaultValue={severity} className="h-8 text-xs">
                <option value="trivial">Trivial</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
                <option value="blocker">Blocker</option>
              </Select>
            </form>
          </Field>
          <Field label="Priority">
            <form
              action={updateBugAction}
              onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}
            >
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="bug_id" value={bugId} />
              <Select name="priority" defaultValue={priority} className="h-8 text-xs">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </form>
          </Field>
          <Field label="Assignee">
            <form
              action={updateBugAction}
              onChange={(e) => (e.currentTarget as HTMLFormElement).requestSubmit()}
            >
              <input type="hidden" name="project_id" value={projectId} />
              <input type="hidden" name="bug_id" value={bugId} />
              <Select
                name="assignee_id"
                defaultValue={assignee?.id ?? ''}
                className="h-8 text-xs"
              >
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </Select>
            </form>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Person label="Reporter" person={reporter} />
          <Person label="Assignee" person={assignee} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <DetailRow label="Environment" value={environment ?? '—'} />
          <DetailRow label="Filed" value={formatDateTime(createdAt)} />
          <DetailRow label="Closed" value={closedAt ? formatDateTime(closedAt) : '—'} />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <span className="text-xs text-[color:var(--muted-foreground)]">{label}</span>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[color:var(--muted-foreground)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Person({
  label,
  person,
}: {
  label: string;
  person: { full_name: string; avatar_url: string | null; email: string } | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[color:var(--muted-foreground)]">{label}</span>
      {person ? (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={person.full_name} src={person.avatar_url} size="xs" />
          <div className="min-w-0">
            <div className="truncate text-xs font-medium">{person.full_name}</div>
            <div className="truncate text-[10px] text-[color:var(--muted-foreground)]">
              {person.email}
            </div>
          </div>
        </div>
      ) : (
        <span className="text-xs text-[color:var(--muted-foreground)]">—</span>
      )}
    </div>
  );
}
