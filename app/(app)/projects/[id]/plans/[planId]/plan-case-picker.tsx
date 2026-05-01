'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge, PRIORITY_TONES } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { setPlanCasesAction } from '../actions';
import type { TestPriority } from '@/lib/supabase/database.types';

type CaseRow = {
  id: string;
  title: string;
  priority: TestPriority;
  test_suites: { name: string } | null;
};

export default function PlanCasePicker({
  projectId,
  planId,
  cases,
  included,
}: {
  projectId: string;
  planId: string;
  cases: CaseRow[];
  included: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(included));
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!query) return cases;
    const q = query.toLowerCase();
    return cases.filter((c) => c.title.toLowerCase().includes(q));
  }, [cases, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    const fd = new FormData();
    fd.set('project_id', projectId);
    fd.set('plan_id', planId);
    selected.forEach((id) => fd.append('case_id', id));
    startTransition(() => setPlanCasesAction(fd));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Filter cases…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-3 text-sm text-[color:var(--muted-foreground)]">
          {selected.size} selected of {cases.length}
          <Button onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save plan'}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
        <table className="w-full text-sm">
          <thead className="bg-[color:var(--muted)] text-xs uppercase tracking-wider text-[color:var(--muted-foreground)]">
            <tr>
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Suite</th>
              <th className="px-4 py-3 text-left">Priority</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-t border-[color:var(--border)] hover:bg-[color:var(--muted)]/50"
                onClick={() => toggle(c.id)}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    readOnly
                    checked={selected.has(c.id)}
                    className="accent-[color:var(--primary)]"
                  />
                </td>
                <td className="px-4 py-3 font-medium">{c.title}</td>
                <td className="px-4 py-3 text-[color:var(--muted-foreground)]">
                  {c.test_suites?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={PRIORITY_TONES[c.priority]}>{c.priority}</Badge>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-[color:var(--muted-foreground)]">
                  No matching cases.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
