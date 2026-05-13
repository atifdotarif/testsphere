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
    // Clip the shell to the viewport so the sidebar never grows with the
    // page and only the main column scrolls.
    <div className="flex h-screen overflow-hidden">
      <Sidebar projects={projects} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar profile={profile} />
        <main className="flex-1 overflow-y-auto bg-[color:var(--background)] px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
