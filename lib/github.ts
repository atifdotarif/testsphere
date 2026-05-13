import 'server-only';

// Minimal GitHub client for the Smart Test Generator. Only public read
// endpoints are used. A token is optional but strongly recommended in
// production — it raises the rate limit from 60 → 5,000 requests / hour.

const GITHUB_API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
    public hint?: string
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

function authHeader(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function ghFetch(path: string): Promise<Response> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'TestSphere',
      ...authHeader(),
    },
    cache: 'no-store',
  });

  if (res.ok) return res;

  const remaining = res.headers.get('x-ratelimit-remaining');
  if (res.status === 403 && remaining === '0') {
    throw new GitHubError(
      'GitHub rate limit exceeded',
      403,
      'Set the GITHUB_TOKEN env var to raise the per-hour limit, or wait a few minutes.'
    );
  }
  if (res.status === 404) {
    throw new GitHubError(
      'Repository or file not found',
      404,
      'Check the URL and that the repository is public.'
    );
  }
  if (res.status === 401) {
    throw new GitHubError(
      'GitHub rejected the configured token',
      401,
      'Verify GITHUB_TOKEN if it is set.'
    );
  }
  throw new GitHubError(`GitHub API error (${res.status})`, res.status);
}

export type RepoCoords = { owner: string; repo: string };

const REPO_URL_PATTERNS: RegExp[] = [
  /^https?:\/\/github\.com\/([^/]+)\/([^/.#?]+?)(?:\.git)?(?:[/?#].*)?$/i,
  /^git@github\.com:([^/]+)\/([^/.#?]+?)(?:\.git)?$/i,
  /^([^/\s]+)\/([^/\s]+)$/, // shorthand owner/repo
];

export function parseRepoUrl(input: string): RepoCoords {
  const trimmed = input.trim();
  for (const re of REPO_URL_PATTERNS) {
    const m = trimmed.match(re);
    if (m) return { owner: m[1]!, repo: m[2]! };
  }
  throw new GitHubError(
    'Could not parse repository URL',
    400,
    'Try https://github.com/OWNER/REPO or just OWNER/REPO.'
  );
}

export type RepoMeta = {
  owner: string;
  repo: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  visibility: string;
};

export async function getRepoMeta({ owner, repo }: RepoCoords): Promise<RepoMeta> {
  const res = await ghFetch(`/repos/${owner}/${repo}`);
  const data = (await res.json()) as {
    full_name: string;
    description: string | null;
    default_branch: string;
    html_url: string;
    language: string | null;
    stargazers_count: number;
    visibility: string;
  };
  return {
    owner,
    repo,
    full_name: data.full_name,
    description: data.description,
    default_branch: data.default_branch,
    html_url: data.html_url,
    language: data.language,
    stargazers_count: data.stargazers_count,
    visibility: data.visibility,
  };
}

export type TreeEntry = {
  path: string;
  type: 'blob' | 'tree';
  size: number | null;
  sha: string;
};

// Fetches the *full* recursive tree for a branch in a single API call.
// Returned by GitHub even for large repos. We let the UI filter from this
// list, so the caller never re-fetches anything.
export async function getRepoTree(
  { owner, repo }: RepoCoords,
  ref: string
): Promise<{ truncated: boolean; entries: TreeEntry[] }> {
  const res = await ghFetch(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`
  );
  const data = (await res.json()) as {
    truncated: boolean;
    tree: { path: string; type: 'blob' | 'tree'; size?: number; sha: string }[];
  };
  return {
    truncated: data.truncated,
    entries: data.tree.map((t) => ({
      path: t.path,
      type: t.type,
      size: t.size ?? null,
      sha: t.sha,
    })),
  };
}

// Hard cap on per-file size sent to the model. Keeps tokens (and bills)
// predictable. 200 KB is more than enough for source files we care about
// and skips lockfiles / minified bundles automatically.
const MAX_FILE_BYTES = 200 * 1024;

export async function getFileContent(
  { owner, repo }: RepoCoords,
  path: string,
  ref: string
): Promise<{ path: string; content: string; size: number; truncated: boolean }> {
  // Use the raw endpoint — it returns plain text directly so we don't have
  // to base64-decode and we can stream-cap the body without parsing JSON.
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'TestSphere',
      ...authHeader(),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new GitHubError(
      `Could not fetch ${path} (status ${res.status})`,
      res.status
    );
  }

  const text = await res.text();
  const truncated = text.length > MAX_FILE_BYTES;
  return {
    path,
    content: truncated ? text.slice(0, MAX_FILE_BYTES) : text,
    size: text.length,
    truncated,
  };
}

// Heuristic file-type classification used by the UI to filter the tree.
const DOC_RE = /(^|\/)(README|CHANGELOG|CONTRIBUTING|ARCHITECTURE|GETTING_STARTED)\.(md|mdx|rst|txt)$/i;
const DOC_DIR_RE = /^docs?(\/|$)/i;
const SOURCE_EXTS = new Set([
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'cs',
  'cpp',
  'cc',
  'c',
  'h',
  'hpp',
  'php',
  'sql',
  'sh',
  'vue',
  'svelte',
]);
const SKIP_DIR_RE = /(^|\/)(node_modules|dist|build|out|\.next|\.git|\.turbo|coverage|target|vendor)(\/|$)/;

export type FileKind = 'readme' | 'doc' | 'source' | 'other';

export function classify(path: string): FileKind {
  if (SKIP_DIR_RE.test(path)) return 'other';
  if (/^README\.(md|mdx|rst|txt)$/i.test(path)) return 'readme';
  if (DOC_RE.test(path) || DOC_DIR_RE.test(path)) return 'doc';
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext && SOURCE_EXTS.has(ext)) return 'source';
  return 'other';
}
