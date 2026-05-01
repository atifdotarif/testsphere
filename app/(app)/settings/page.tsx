import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils/format';
import ProfileForm from './profile-form';

export const metadata = { title: 'Settings' };

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  qa_engineer: 'QA Engineer',
  developer: 'Developer',
  viewer: 'Viewer',
};

export default async function SettingsPage() {
  const { profile } = await requireUser();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Account settings"
        description="Manage your profile and how teammates see you."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar size="lg" name={profile.full_name} src={profile.avatar_url} />
            <div>
              <div className="text-base font-semibold">{profile.full_name}</div>
              <div className="text-xs text-[color:var(--muted-foreground)]">
                {profile.email} · joined {formatDate(profile.created_at)}
              </div>
              <div className="mt-1">
                <Badge tone="accent">{ROLE_LABEL[profile.role] ?? profile.role}</Badge>
              </div>
            </div>
          </div>
          <ProfileForm
            initial={{
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
