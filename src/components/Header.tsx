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
        <header data-component="Header" className="border-b border-border bg-card">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    COUNSELLOR PERFORMANCE — ADVANCED MIS
                </h1>
                {monthLabel && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {monthLabel} • {counsellorCount ?? 0} counsellors • {teamCount ?? 0} teams
                    </p>
                )}
            </div>
        </header>
    );
}
