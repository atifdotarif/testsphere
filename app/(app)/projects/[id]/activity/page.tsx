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
};

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
    .select('id, entity_type, action, metadata, created_at, profiles(full_name, avatar_url)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    entity_type: string;
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
          {rows.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
              <Avatar name={a.profiles?.full_name} src={a.profiles?.avatar_url} size="sm" />
              <div className="flex-1">
                <div>
                  <span className="font-medium">
                    {a.profiles?.full_name ?? 'Someone'}
                  </span>{' '}
                  <span className="text-[color:var(--muted-foreground)]">
                    {ACTION_LABEL[a.action] ?? a.action.replace('_', ' ')}{' '}
                    {a.entity_type.replace('_', ' ')}
                  </span>
                  {typeof a.metadata?.title === 'string' ? (
                    <span className="ml-1 font-medium">“{a.metadata.title as string}”</span>
                  ) : null}
                </div>
                <div className="text-xs text-[color:var(--muted-foreground)]">
                  {formatRelative(a.created_at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
