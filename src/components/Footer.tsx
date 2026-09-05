export function Footer({
  sourceFileName,
  monthLabel,
}: {
  sourceFileName: string;
  monthLabel: string;
}) {
  return (
    <footer data-component="Footer" className="mt-auto border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-zinc-500 sm:px-6 lg:px-8">
        Source: {sourceFileName} · {monthLabel} · read-only · parsed in-browser
      </div>
    </footer>
  );
}
