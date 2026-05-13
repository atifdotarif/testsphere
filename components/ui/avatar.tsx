import { cn } from '@/lib/utils/cn';
import { initialsOf } from '@/lib/utils/format';

// Deterministic background color from the name so avatars feel personal even
// without an uploaded image — matches Linear/Slack-style identicons.
const PALETTE = [
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  'bg-orange-500/15 text-orange-700 dark:text-orange-300',
];

function paletteFor(name?: string | null): string {
  if (!name) return PALETTE[0]!;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length]!;
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    xs: 'h-5 w-5 text-[9px]',
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-11 w-11 text-sm',
  };
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ring-1 ring-[color:var(--border)]',
        src ? '' : paletteFor(name),
        sizes[size],
        className
      )}
      title={name ?? undefined}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? ''} className="h-full w-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
