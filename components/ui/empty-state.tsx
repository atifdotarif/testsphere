import { cn } from '@/lib/utils/cn';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-[color:var(--border)] bg-[color:var(--card)] px-6 py-14 text-center',
        className
      )}
    >
      {icon ? (
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-md border border-[color:var(--border)] bg-[color:var(--muted)] text-[color:var(--muted-foreground)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-xs text-[color:var(--muted-foreground)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
