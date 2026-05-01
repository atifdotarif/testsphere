import { Sidebar } from '@/components/app-shell/sidebar';
import { Topbar } from '@/components/app-shell/topbar';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();

  // Sidebar projects: only the projects this user can see (RLS handles filtering).
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from('project_members')
    .select('projects(id, key, name)')
    .eq('user_id', profile.id);

  type Row = { projects: { id: string; key: string; name: string } | null };
  const projects = ((memberships ?? []) as unknown as Row[])
    .map((m) => m.projects)
    .filter((p): p is { id: string; key: string; name: string } => Boolean(p));

  return (
    <div className="flex min-h-screen">
      <Sidebar projects={projects} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
