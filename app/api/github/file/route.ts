import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { GitHubError, getFileContent, parseRepoUrl } from '@/lib/github';
import { requireUser } from '@/lib/auth';

const Body = z.object({
  url: z.string().min(3).max(400),
  ref: z.string().min(1).max(100),
  path: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  await requireUser();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: z.flattenError(parsed.error).fieldErrors },
      { status: 400 }
    );
  }

  try {
    const coords = parseRepoUrl(parsed.data.url);
    const file = await getFileContent(coords, parsed.data.path, parsed.data.ref);
    return NextResponse.json(file);
  } catch (err) {
    if (err instanceof GitHubError) {
      return NextResponse.json(
        { error: err.message, hint: err.hint },
        { status: err.status }
      );
    }
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
