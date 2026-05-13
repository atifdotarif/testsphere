import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { formatRelative } from '@/lib/utils/format';

export const metadata = { title: 'Activity' };

const ACTION_LABEL: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  status_changed: 'changed status of',
  commented: 'commented on',
  completed: 'completed',
  aborted: 'aborted',
  assigned: 'assigned',
  unassigned: 'unassigned',
  bulk_assigned: 'bulk-assigned cases in',
  generated: 'generated cases for',
};

const ENTITY_LABEL: Record<string, string> = {
  test_case: 'test case',
  test_run: 'test run',
  test_run_result: 'execution',
  test_plan: 'test plan',
  bug: 'bug',
  project: 'project',
};

type Change = { from: unknown; to: unknown };

function formatVal(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v).replace(/_/g, ' ');
}

function entityHref(
  projectId: string,
  entityType: string,
  entityId: string | null
): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case 'test_case':
      return `/projects/${projectId}/cases/${entityId}`;
    case 'bug':
      return `/projects/${projectId}/bugs/${entityId}`;
    case 'test_run':
      return `/projects/${projectId}/runs/${entityId}`;
    case 'test_plan':
      return `/projects/${projectId}/plans/${entityId}`;
    default:
      return null;
  }
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('activity_log')
    .select(
      'id, entity_type, entity_id, action, metadata, created_at, profiles(full_name, avatar_url)'
    )
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    entity_type: string;
    entity_id: string | null;
    action: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    profiles: { full_name: string; avatar_url: string | null } | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Audit trail of every change inside this project."
      />
      {rows.length === 0 ? (
        <EmptyState title="Nothing yet" description="Project activity will show up here." />
      ) : (
        <ul className="divide-y divide-[color:var(--border)] rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
          {rows.map((a) => {
            const actor = a.profiles?.full_name ?? 'Someone';
            const actionLabel = ACTION_LABEL[a.action] ?? a.action.replace('_', ' ');
            const entityLabel = ENTITY_LABEL[a.entity_type] ?? a.entity_type.replace('_', ' ');
            const href = entityHref(id, a.entity_type, a.entity_id);
            const meta = a.metadata ?? {};
            const title = typeof meta.title === 'string' ? meta.title : null;
            const name = typeof meta.name === 'string' ? meta.name : null;
            const subject = title ?? name;
            const changes = meta.changes as Record<string, Change> | undefined;

            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <Avatar
                  name={a.profiles?.full_name}
                  src={a.profiles?.avatar_url}
                  size="sm"
                />
                <div className="flex-1">
                  <div>
                    <span className="font-medium">{actor}</span>{' '}
                    <span className="text-[color:var(--muted-foreground)]">
                      {actionLabel} {entityLabel}
                    </span>
                    {subject ? (
                      href ? (
                        <Link href={href} className="ml-1 font-medium hover:underline">
                          “{subject}”
                        </Link>
                      ) : (
                        <span className="ml-1 font-medium">“{subject}”</span>
                      )
                    ) : href ? (
                      <Link href={href} className="ml-1 font-medium hover:underline">
                        →
                      </Link>
                    ) : null}
                  </div>
                  {changes ? (
                    <div className="mt-1 space-y-0.5 text-xs text-[color:var(--muted-foreground)]">
                      {Object.entries(changes).map(([field, c]) => (
                        <div key={field}>
                          <span className="font-medium capitalize">
                            {field.replace('_', ' ')}:
                          </span>{' '}
                          <span className="line-through opacity-70">{formatVal(c.from)}</span>{' '}
                          → <span className="font-medium">{formatVal(c.to)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {a.action === 'generated' && typeof meta.count === 'number' ? (
                    <div className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                      {meta.count as number} case(s) ·
                      {typeof meta.model === 'string' ? ` model ${meta.model}` : ''}
                      {typeof meta.repo === 'string' ? ` · from ${meta.repo}` : ''}
                    </div>
                  ) : null}
                  <div className="text-xs text-[color:var(--muted-foreground)]">
                    {formatRelative(a.created_at)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
