import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { GitHubError, classify, getRepoMeta, getRepoTree, parseRepoUrl } from '@/lib/github';
import { requireUser } from '@/lib/auth';

const Body = z.object({
  url: z.string().min(3).max(400),
  ref: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  // The route is gated by `proxy.ts`, but a defense-in-depth check costs
  // nothing and makes the dependency explicit.
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
    const meta = await getRepoMeta(coords);
    const ref = parsed.data.ref || meta.default_branch;
    const tree = await getRepoTree(coords, ref);

    // Hand the client a pre-classified, blob-only tree so the picker never
    // has to filter again. Skip files >300 KB or under deps/build dirs.
    const files = tree.entries
      .filter((e) => e.type === 'blob')
      .map((e) => ({
        path: e.path,
        size: e.size,
        sha: e.sha,
        kind: classify(e.path),
      }))
      .filter((e) => e.kind !== 'other' || /\.(md|mdx|rst|txt)$/i.test(e.path))
      .filter((e) => (e.size ?? 0) < 300 * 1024);

    return NextResponse.json({
      meta,
      ref,
      truncated: tree.truncated,
      files,
    });
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
