import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { logoutAction } from '@/app/(auth)/actions';
import type { Profile } from '@/lib/supabase/database.types';

const ROLE_LABEL: Record<Profile['role'], string> = {
  admin: 'Admin',
  manager: 'Manager',
  qa_engineer: 'QA Engineer',
  developer: 'Developer',
  viewer: 'Viewer',
};

export function Topbar({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--card)]/80 px-4 backdrop-blur lg:px-6">
      <div className="lg:hidden">
        <Link href="/dashboard" className="text-sm font-semibold">
          Test Sphere
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3">
        <Badge tone="accent">{ROLE_LABEL[profile.role]}</Badge>
        <Link
          href="/settings"
          className="hidden items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[color:var(--muted)] sm:flex"
        >
          <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
          <div className="text-left text-xs">
            <div className="font-medium leading-tight">{profile.full_name}</div>
            <div className="leading-tight text-[color:var(--muted-foreground)]">
              {profile.email}
            </div>
          </div>
          <User className="h-4 w-4 text-[color:var(--muted-foreground)]" />
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm hover:bg-[color:var(--muted)]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
