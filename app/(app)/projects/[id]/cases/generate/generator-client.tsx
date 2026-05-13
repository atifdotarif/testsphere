'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileCode2,
  FileText,
  GitBranch,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Badge, PRIORITY_TONES } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';
import {
  generateCasesAction,
  saveGeneratedCasesAction,
  type GenerateState,
  type SaveState,
} from './actions';
import type { GeneratedCase } from '@/lib/ai/generate-cases';

type FileEntry = {
  path: string;
  size: number | null;
  sha: string;
  kind: 'readme' | 'doc' | 'source' | 'other';
};

type RepoMeta = {
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

type Step = 1 | 2 | 3 | 4;

const KIND_LABEL: Record<FileEntry['kind'], string> = {
  readme: 'README',
  doc: 'Docs',
  source: 'Source',
  other: 'Other',
};

const KIND_ICON: Record<FileEntry['kind'], React.ReactNode> = {
  readme: <FileText className="h-4 w-4" />,
  doc: <FileText className="h-4 w-4" />,
  source: <FileCode2 className="h-4 w-4" />,
  other: <FileText className="h-4 w-4" />,
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GeneratorClient({
  projectId,
  suites,
  aiConfigured,
  githubAuthed,
}: {
  projectId: string;
  suites: { id: string; name: string }[];
  aiConfigured: boolean;
  githubAuthed: boolean;
}) {
  const router = useRouter();

  // ------- step 1: repo input
  const [step, setStep] = useState<Step>(1);
  const [repoUrl, setRepoUrl] = useState('');
  const [meta, setMeta] = useState<RepoMeta | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [ref, setRef] = useState<string>('');
  const [truncated, setTruncated] = useState(false);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoHint, setRepoHint] = useState<string | null>(null);

  // ------- step 2: selection
  const [selected, setSelected] = useState<Map<string, { content: string; kind: string }>>(
    new Map()
  );
  const [filter, setFilter] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | FileEntry['kind']>('all');
  const [fetchingPaths, setFetchingPaths] = useState<Set<string>>(new Set());

  // ------- step 3: generate
  const [count, setCount] = useState(5);
  const [guidance, setGuidance] = useState('');
  const [genState, setGenState] = useState<GenerateState>(undefined);
  const [genPending, startGen] = useTransition();

  // ------- step 4: review/edit/save
  const [draftCases, setDraftCases] = useState<GeneratedCase[]>([]);
  const [discarded, setDiscarded] = useState<Set<number>>(new Set());
  const [suiteId, setSuiteId] = useState<string>('');
  const [savePending, startSave] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>(undefined);

  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (kindFilter !== 'all' && f.kind !== kindFilter) return false;
      if (filter && !f.path.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [files, filter, kindFilter]);

  const selectedCount = selected.size;
  const totalSelectedBytes = useMemo(
    () => Array.from(selected.values()).reduce((sum, v) => sum + v.content.length, 0),
    [selected]
  );

  async function handleFetchRepo(e?: React.FormEvent) {
    e?.preventDefault();
    if (!repoUrl.trim()) return;
    setRepoLoading(true);
    setRepoError(null);
    setRepoHint(null);
    try {
      const res = await fetch('/api/github/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRepoError(data.error ?? 'Could not fetch repository');
        setRepoHint(data.hint ?? null);
        return;
      }
      setMeta(data.meta);
      setRef(data.ref);
      setFiles(data.files);
      setTruncated(data.truncated);
      setSelected(new Map());
      // Auto-suggest README
      const readme = (data.files as FileEntry[]).find((f) => f.kind === 'readme');
      if (readme) {
        await fetchAndSelect(readme);
      }
      setStep(2);
    } catch {
      setRepoError('Network error reaching the GitHub API');
    } finally {
      setRepoLoading(false);
    }
  }

  async function fetchAndSelect(file: FileEntry) {
    if (selected.has(file.path)) {
      // toggle off
      setSelected((prev) => {
        const next = new Map(prev);
        next.delete(file.path);
        return next;
      });
      return;
    }
    if (!meta) return;
    setFetchingPaths((s) => new Set(s).add(file.path));
    try {
      const res = await fetch('/api/github/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: meta.html_url,
          ref,
          path: file.path,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRepoError(data.error ?? 'Could not fetch file');
        return;
      }
      setSelected((prev) => {
        const next = new Map(prev);
        next.set(file.path, { content: data.content, kind: file.kind });
        return next;
      });
    } finally {
      setFetchingPaths((s) => {
        const next = new Set(s);
        next.delete(file.path);
        return next;
      });
    }
  }

  function handleGenerate() {
    if (selected.size === 0) return;
    const documents = Array.from(selected.entries()).map(([path, v]) => ({
      path,
      kind: v.kind,
      content: v.content,
    }));
    const fd = new FormData();
    fd.set('documents', JSON.stringify(documents));
    fd.set('count', String(count));
    if (guidance) fd.set('guidance', guidance);
    if (meta) fd.set('repo', meta.full_name);
    if (ref) fd.set('ref', ref);

    startGen(async () => {
      const result = await generateCasesAction(projectId, undefined, fd);
      setGenState(result);
      if (result?.ok) {
        setDraftCases(result.cases);
        setDiscarded(new Set());
        setStep(4);
      }
    });
  }

  function updateCase(index: number, patch: Partial<GeneratedCase>) {
    setDraftCases((prev) => {
      const next = prev.slice();
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  }

  function updateStep(caseIdx: number, stepIdx: number, patch: Partial<GeneratedCase['steps'][number]>) {
    setDraftCases((prev) => {
      const next = prev.slice();
      const c = { ...next[caseIdx]! };
      const newSteps = c.steps.slice();
      newSteps[stepIdx] = { ...newSteps[stepIdx]!, ...patch };
      c.steps = newSteps;
      next[caseIdx] = c;
      return next;
    });
  }

  function handleSave() {
    if (!genState?.ok) return;
    const kept = draftCases
      .map((c, i) => ({ c, i }))
      .filter(({ i }) => !discarded.has(i))
      .map(({ c }) => ({
        ...c,
        source_files: genState.meta.files,
      }));
    if (kept.length === 0) return;

    const fd = new FormData();
    fd.set(
      'payload',
      JSON.stringify({
        project_id: projectId,
        suite_id: suiteId || null,
        model: genState.model,
        repo: genState.meta.repo ?? null,
        ref: genState.meta.ref ?? null,
        cases: kept,
      })
    );

    startSave(async () => {
      const result = await saveGeneratedCasesAction(undefined, fd);
      setSaveState(result);
      if (result?.ok) {
        router.push(`/projects/${projectId}/cases`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {!aiConfigured ? (
        <ConfigBanner
          tone="danger"
          title="OpenAI is not configured"
          body="Set OPENAI_API_KEY in your .env.local and restart the dev server. Generation will not work until then."
        />
      ) : null}
      {!githubAuthed ? (
        <ConfigBanner
          tone="info"
          title="No GitHub token set"
          body="Public repositories work out of the box, but unauthenticated calls are limited to 60/hour. Set GITHUB_TOKEN to raise the limit to 5,000/hour."
        />
      ) : null}

      <Stepper current={step} />

      {/* STEP 1 */}
      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Connect a public repository
            </CardTitle>
            <CardDescription>
              Paste a GitHub URL or shorthand. We&apos;ll fetch the file tree and let you pick what
              to send to the model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFetchRepo} className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="repo">Repository URL</Label>
                <Input
                  id="repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/vercel/next.js or vercel/next.js"
                  required
                />
              </div>
              <Button type="submit" disabled={repoLoading} className="self-end">
                {repoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {repoLoading ? 'Fetching…' : 'Continue'}
              </Button>
            </form>
            {repoError ? (
              <ErrorBox title={repoError} hint={repoHint ?? undefined} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 2 */}
      {step >= 2 && meta ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  {meta.full_name}
                </CardTitle>
                <CardDescription>
                  {meta.description ?? 'No description.'}
                  {meta.language ? <> · {meta.language}</> : null} · {meta.stargazers_count} ★
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setMeta(null);
                  setFiles([]);
                  setSelected(new Map());
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Change repo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[160px_1fr_180px]">
              <div>
                <Label htmlFor="branch">Ref / branch</Label>
                <Input
                  id="branch"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder={meta.default_branch}
                />
              </div>
              <div>
                <Label htmlFor="filter">Filter files</Label>
                <Input
                  id="filter"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="e.g. checkout, /docs/"
                />
              </div>
              <div>
                <Label htmlFor="kind">Type</Label>
                <Select
                  id="kind"
                  value={kindFilter}
                  onChange={(e) => setKindFilter(e.target.value as 'all' | FileEntry['kind'])}
                >
                  <option value="all">All</option>
                  <option value="readme">README</option>
                  <option value="doc">Docs</option>
                  <option value="source">Source</option>
                </Select>
              </div>
            </div>

            {truncated ? (
              <ConfigBanner
                tone="warn"
                title="Repository tree was truncated"
                body="GitHub returned only part of the tree because the repo is very large. Use the filter to narrow it down."
              />
            ) : null}

            <div className="overflow-hidden rounded-xl border border-[color:var(--border)]">
              <div className="max-h-[420px] overflow-y-auto">
                <ul className="divide-y divide-[color:var(--border)]">
                  {filteredFiles.length === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-[color:var(--muted-foreground)]">
                      No matching files.
                    </li>
                  ) : null}
                  {filteredFiles.map((f) => {
                    const isSelected = selected.has(f.path);
                    const isFetching = fetchingPaths.has(f.path);
                    return (
                      <li
                        key={f.path}
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm transition',
                          isSelected
                            ? 'bg-[color:var(--accent)]'
                            : 'hover:bg-[color:var(--muted)]/60'
                        )}
                        onClick={() => fetchAndSelect(f)}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              'grid h-5 w-5 shrink-0 place-items-center rounded',
                              isSelected
                                ? 'bg-[color:var(--primary)] text-white'
                                : 'bg-[color:var(--muted)] text-[color:var(--muted-foreground)]'
                            )}
                          >
                            {isFetching ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isSelected ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              KIND_ICON[f.kind]
                            )}
                          </span>
                          <span className="truncate font-mono text-xs">{f.path}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone={f.kind === 'source' ? 'info' : 'accent'}>
                            {KIND_LABEL[f.kind]}
                          </Badge>
                          <span className="text-xs tabular-nums text-[color:var(--muted-foreground)]">
                            {formatSize(f.size)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="flex items-center justify-between border-t border-[color:var(--border)] bg-[color:var(--muted)]/40 px-4 py-2 text-xs">
                <span>
                  {selectedCount} selected · {(totalSelectedBytes / 1024).toFixed(1)} KB
                </span>
                <Button
                  size="sm"
                  disabled={selectedCount === 0}
                  onClick={() => setStep(3)}
                >
                  Configure generation
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 3 */}
      {step >= 3 && meta ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate test cases
            </CardTitle>
            <CardDescription>
              The model will only see the files you selected. Smaller, focused inputs produce
              better cases.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <div>
                <Label htmlFor="count">How many?</Label>
                <Input
                  id="count"
                  type="number"
                  min={1}
                  max={15}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="guidance">Tester guidance (optional)</Label>
                <Textarea
                  id="guidance"
                  value={guidance}
                  onChange={(e) => setGuidance(e.target.value)}
                  rows={2}
                  placeholder="e.g. Focus on auth edge cases. Skip happy-path login."
                />
              </div>
            </div>

            <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-4 text-xs">
              <div className="font-semibold">Sending to model:</div>
              <ul className="mt-1 space-y-0.5 font-mono">
                {Array.from(selected.keys()).map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
              <div className="mt-2 text-[color:var(--muted-foreground)]">
                ≈ {(totalSelectedBytes / 1024).toFixed(1)} KB across {selectedCount} file(s)
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                Back to file picker
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={genPending || !aiConfigured || selectedCount === 0}
              >
                {genPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {genPending ? 'Generating…' : 'Generate'}
              </Button>
            </div>

            {genState && !genState.ok ? (
              <ErrorBox title={genState.message} hint={genState.hint} />
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 4 */}
      {step === 4 && genState?.ok ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Review &amp; edit before saving</CardTitle>
                  <CardDescription>
                    {draftCases.length - discarded.size} case(s) ready · model {genState.model} ·
                    {' '}{genState.inputTokens.toLocaleString()} in / {genState.outputTokens.toLocaleString()} out tokens
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div>
                    <Label htmlFor="suite" className="sr-only">
                      Save into suite
                    </Label>
                    <Select
                      id="suite"
                      value={suiteId}
                      onChange={(e) => setSuiteId(e.target.value)}
                      className="h-9 w-[200px] text-sm"
                    >
                      <option value="">Save unassigned</option>
                      {suites.map((s) => (
                        <option key={s.id} value={s.id}>
                          Save into: {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    onClick={handleSave}
                    disabled={savePending || draftCases.length - discarded.size === 0}
                  >
                    {savePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {savePending ? 'Saving…' : `Save ${draftCases.length - discarded.size} case(s)`}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {saveState && !saveState.ok ? (
              <CardContent>
                <ErrorBox title={saveState.message} />
              </CardContent>
            ) : null}
          </Card>

          {draftCases.map((c, i) => (
            <CaseEditor
              key={i}
              index={i}
              kase={c}
              discarded={discarded.has(i)}
              onUpdate={(patch) => updateCase(i, patch)}
              onUpdateStep={(stepIdx, patch) => updateStep(i, stepIdx, patch)}
              onToggleDiscard={() => {
                setDiscarded((s) => {
                  const n = new Set(s);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                });
              }}
            />
          ))}

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setStep(3)}>
              Generate another batch
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const items: { n: Step; label: string }[] = [
    { n: 1, label: 'Repo' },
    { n: 2, label: 'Files' },
    { n: 3, label: 'Generate' },
    { n: 4, label: 'Review' },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-3 text-sm">
      {items.map((it) => (
        <li key={it.n} className="flex items-center gap-2">
          <span
            className={cn(
              'grid h-6 w-6 place-items-center rounded-full border text-xs font-semibold',
              current >= it.n
                ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-white'
                : 'border-[color:var(--border)] text-[color:var(--muted-foreground)]'
            )}
          >
            {current > it.n ? <Check className="h-3 w-3" /> : it.n}
          </span>
          <span
            className={cn(
              'font-medium',
              current >= it.n
                ? 'text-[color:var(--foreground)]'
                : 'text-[color:var(--muted-foreground)]'
            )}
          >
            {it.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CaseEditor({
  index,
  kase,
  discarded,
  onUpdate,
  onUpdateStep,
  onToggleDiscard,
}: {
  index: number;
  kase: GeneratedCase;
  discarded: boolean;
  onUpdate: (patch: Partial<GeneratedCase>) => void;
  onUpdateStep: (stepIdx: number, patch: Partial<GeneratedCase['steps'][number]>) => void;
  onToggleDiscard: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-[color:var(--card)] transition',
        discarded
          ? 'border-dashed border-[color:var(--border)] opacity-50'
          : 'border-[color:var(--border)]'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border)] px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="rounded bg-[color:var(--muted)] px-1.5 py-0.5 font-mono">#{index + 1}</span>
          <Badge tone={PRIORITY_TONES[kase.priority]}>{kase.priority}</Badge>
          {kase.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded bg-[color:var(--muted)] px-1.5 py-0.5 text-[10px] text-[color:var(--muted-foreground)]"
            >
              {t}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleDiscard}
          className={cn(
            'text-xs font-medium',
            discarded
              ? 'text-[color:var(--primary)]'
              : 'text-[color:var(--destructive)] hover:underline'
          )}
        >
          {discarded ? 'Restore' : 'Discard'}
        </button>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <Label>Title</Label>
          <Input
            value={kase.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={kase.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
            />
          </div>
          <div>
            <Label>Preconditions</Label>
            <Textarea
              rows={2}
              value={kase.preconditions}
              onChange={(e) => onUpdate({ preconditions: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Steps</Label>
          <div className="space-y-2">
            {kase.steps.map((s, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--muted)]/40 p-2 sm:grid-cols-2"
              >
                <Textarea
                  rows={2}
                  value={s.step}
                  onChange={(e) => onUpdateStep(idx, { step: e.target.value })}
                  placeholder={`Step ${idx + 1}`}
                />
                <Textarea
                  rows={2}
                  value={s.expected}
                  onChange={(e) => onUpdateStep(idx, { expected: e.target.value })}
                  placeholder="Expected"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <div>
            <Label>Final expected outcome</Label>
            <Textarea
              rows={2}
              value={kase.expected_result}
              onChange={(e) => onUpdate({ expected_result: e.target.value })}
            />
          </div>
          <div>
            <Label>Priority</Label>
            <Select
              value={kase.priority}
              onChange={(e) =>
                onUpdate({ priority: e.target.value as GeneratedCase['priority'] })
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigBanner({
  tone,
  title,
  body,
}: {
  tone: 'danger' | 'info' | 'warn';
  title: string;
  body: string;
}) {
  const cls = {
    danger:
      'border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/5 text-[color:var(--destructive)]',
    info: 'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300',
    warn: 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300',
  }[tone];
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-4 text-sm', cls)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs opacity-90">{body}</div>
      </div>
    </div>
  );
}

function ErrorBox({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mt-3 rounded-md border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/10 px-3 py-2 text-sm text-[color:var(--destructive)]">
      <div className="font-medium">{title}</div>
      {hint ? <div className="text-xs opacity-80">{hint}</div> : null}
    </div>
  );
}
