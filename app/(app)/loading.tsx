export default function AppLoading() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-[color:var(--muted-foreground)]">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[color:var(--primary)]" />
        Loading…
      </div>
    </div>
  );
}
