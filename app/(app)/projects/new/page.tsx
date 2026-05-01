import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import NewProjectForm from './new-project-form';
import { requireUser } from '@/lib/auth';

export const metadata = { title: 'New project' };

export default async function NewProjectPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'New' }]}
        title="Create a new project"
        description="Each project gets its own test cases, runs, bugs and member roster."
      />
      <Card>
        <CardContent>
          <NewProjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
