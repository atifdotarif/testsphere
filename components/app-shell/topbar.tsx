import { ChevronDown, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/avatar';
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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--card)] px-4 lg:px-6">
      <div className="lg:hidden">
        <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
          Test Sphere
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1">
        <Link
          href="/settings"
          className="hidden h-9 items-center gap-2 rounded-md px-2 text-left hover:bg-[color:var(--muted)] sm:flex"
          title="Account settings"
        >
          <Avatar name={profile.full_name} src={profile.avatar_url} size="sm" />
          <div className="text-xs leading-tight">
            <div className="font-medium">{profile.full_name}</div>
            <div className="text-[11px] text-[color:var(--muted-foreground)]">
              {ROLE_LABEL[profile.role]}
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-[color:var(--muted-foreground)]" />
        </Link>
        <Link
          href="/settings"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)] sm:hidden"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:bg-[color:var(--muted)] hover:text-[color:var(--foreground)]"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
