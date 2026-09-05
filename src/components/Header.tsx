export function Header({
  monthLabel,
  counsellorCount,
  teamCount,
}: {
  monthLabel?: string | undefined;
  counsellorCount?: number | undefined;
  teamCount?: number | undefined;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          COUNSELLOR PERFORMANCE — ADVANCED MIS
        </h1>
        {monthLabel && (
          <p className="mt-1 text-sm text-zinc-500">
            {monthLabel} • {counsellorCount ?? 0} counsellors • {teamCount ?? 0} teams
          </p>
        )}
      </div>
    </header>
  );
}
