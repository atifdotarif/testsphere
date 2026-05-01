import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import type {
  BugPriority,
  BugSeverity,
  BugStatus,
  ResultStatus,
  RunStatus,
  TestPriority,
  ProjectRole,
} from '@/lib/supabase/database.types';

type Tone =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'accent';

const TONE_CLASSES: Record<Tone, string> = {
  default:
    'bg-[color:var(--muted)] text-[color:var(--foreground)] border-[color:var(--border)]',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  neutral: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
  accent: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  );
}

export const RESULT_TONES: Record<ResultStatus, Tone> = {
  pending: 'neutral',
  passed: 'success',
  failed: 'danger',
  blocked: 'warning',
  skipped: 'info',
};

export const RUN_TONES: Record<RunStatus, Tone> = {
  not_started: 'neutral',
  in_progress: 'info',
  completed: 'success',
  aborted: 'danger',
};

export const PRIORITY_TONES: Record<TestPriority, Tone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

export const BUG_SEVERITY_TONES: Record<BugSeverity, Tone> = {
  trivial: 'neutral',
  minor: 'info',
  major: 'warning',
  critical: 'danger',
  blocker: 'danger',
};

export const BUG_PRIORITY_TONES: Record<BugPriority, Tone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

export const BUG_STATUS_TONES: Record<BugStatus, Tone> = {
  new: 'info',
  triaged: 'accent',
  in_progress: 'warning',
  resolved: 'success',
  verified: 'success',
  reopened: 'danger',
  closed: 'neutral',
  wont_fix: 'neutral',
};

export const ROLE_TONES: Record<ProjectRole, Tone> = {
  owner: 'accent',
  manager: 'info',
  qa_engineer: 'success',
  developer: 'warning',
  viewer: 'neutral',
};
