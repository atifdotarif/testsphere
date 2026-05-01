'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { createRunAction } from './actions';

type Plan = { id: string; name: string };
type Case = { id: string; title: string };

export default function NewRunForm({
  projectId,
  plans,
  cases,
  preselectedPlanId,
}: {
  projectId: string;
  plans: Plan[];
  cases: Case[];
  preselectedPlanId: string | null;
}) {
  const [planId, setPlanId] = useState<string>(preselectedPlanId ?? '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (!filter) return cases;
    const q = filter.toLowerCase();
    return cases.filter((c) => c.title.toLowerCase().includes(q));
  }, [cases, filter]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(formData: FormData) {
    if (!planId) {
      selected.forEach((id) => formData.append('case_id', id));
    }
    startTransition(() => createRunAction(projectId, formData));
  }

  return (
    <form action={submit} className="space-y-3">
      <div>
        <Label htmlFor="run-name">Run name</Label>
        <Input id="run-name" name="name" required placeholder="Smoke test 2026-05-02" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="env">Environment</Label>
          <Input id="env" name="environment" placeholder="staging" />
        </div>
        <div>
          <Label htmlFor="plan">Plan</Label>
          <Select
            id="plan"
            name="plan_id"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">Ad-hoc (pick cases)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="run-desc">Description</Label>
        <Textarea id="run-desc" name="description" rows={2} />
      </div>

      {!planId ? (
        <div>
          <Label>Cases to include</Label>
          <Input
            placeholder="Filter…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-48 overflow-y-auto rounded-lg border border-[color:var(--border)]">
            {filtered.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 border-b border-[color:var(--border)] px-3 py-2 text-sm hover:bg-[color:var(--muted)]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="accent-[color:var(--primary)]"
                />
                {c.title}
              </label>
            ))}
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-[color:var(--muted-foreground)]">
                No cases.
              </div>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-[color:var(--muted-foreground)]">
            {selected.size} selected
          </p>
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={pending || (!planId && selected.size === 0)}
      >
        {pending ? 'Starting…' : 'Start run'}
      </Button>
    </form>
  );
}
