export function Footer({ sourceFileName, monthLabel }: { sourceFileName: string; monthLabel: string }) {
    return (
        <footer data-component="Footer" className="mt-auto border-t border-border bg-card">
            <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
                Source: {sourceFileName} · {monthLabel} · read-only · parsed in-browser
            </div>
        </footer>
    );
}
