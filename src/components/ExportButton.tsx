import { useEffect, useState } from 'react';

/**
 * Export, with a say in what goes in the file.
 *
 * A Plan sent to a client and a Plan kept for the office are the same document
 * minus a section or two — team hours and the hourly budget are not usually a
 * client's business — so the format and the contents are chosen together in
 * one sheet rather than the button firing a file off immediately.
 */

export interface ExportSection {
  key: string;
  label: string;
  hint: string;
}

export type Audience = 'client' | 'internal';

export interface ExportFormat {
  key: string;
  label: string;
  hint: string;
  /** What this format can carry internally. A format with no choices lists none. */
  sections: ExportSection[];
  /** What the client version of this format contains, said in one line. */
  clientHint: string;
  run: (audience: Audience, included: Set<string>) => Promise<void> | void;
}

export function ExportButton({ formats, label = 'Export' }: { formats: ExportFormat[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formatKey, setFormatKey] = useState(formats[0]?.key ?? '');
  /*
   * A client version is a fixed, narrow document rather than a starting point
   * to prune — the whole risk being avoided is a costing or a crew list going
   * out by accident because a box was left ticked. Only Internal opens the
   * list of what to include.
   */
  const [audience, setAudience] = useState<Audience>('client');
  // Choices are kept per format, so switching to compare and back doesn't
  // silently reset what was already ticked.
  const [chosen, setChosen] = useState<Record<string, Set<string>>>({});

  const format = formats.find((f) => f.key === formatKey) ?? formats[0];
  const included = chosen[format?.key ?? ''] ?? new Set(format?.sections.map((s) => s.key) ?? []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function toggle(key: string) {
    const next = new Set(included);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChosen((prev) => ({ ...prev, [format.key]: next }));
  }

  async function run() {
    setBusy(true);
    try {
      await format.run(audience, included);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  if (!format) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600 text-sm font-semibold min-h-[36px] active:opacity-70 lg:hover:opacity-80"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        </svg>
        {label}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Export options"
            className="fixed bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl flex flex-col max-h-[85vh]"
          >
            <div className="px-4 pt-5 pb-3 flex-shrink-0">
              <h3 className="font-bold text-teal-900 mb-3">Export</h3>

              <p className="text-[11px] font-bold uppercase tracking-wide text-ios-gray-500 mb-1.5">
                Format
              </p>
              <div className="flex gap-2">
                {formats.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFormatKey(f.key)}
                    className={`flex-1 min-h-[44px] px-2 rounded-xl text-sm font-semibold transition-colors ${
                      f.key === format.key ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ios-gray-500 mt-1.5">{format.hint}</p>

              <p className="text-[11px] font-bold uppercase tracking-wide text-ios-gray-500 mt-4 mb-1.5">
                Audience
              </p>
              <div className="flex gap-2">
                {(['client', 'internal'] as Audience[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAudience(a)}
                    className={`flex-1 min-h-[44px] px-2 rounded-xl text-sm font-semibold capitalize transition-colors ${
                      a === audience ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              {audience === 'client' && (
                <p className="text-xs text-ios-gray-500 mt-1.5">{format.clientHint}</p>
              )}
            </div>

            {audience === 'internal' && format.sections.length > 0 && (
              <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ios-gray-500">
                    Include
                  </p>
                  <button
                    onClick={() =>
                      setChosen((prev) => ({
                        ...prev,
                        [format.key]:
                          included.size === format.sections.length
                            ? new Set()
                            : new Set(format.sections.map((s) => s.key)),
                      }))
                    }
                    className="text-xs font-semibold text-teal-600"
                  >
                    {included.size === format.sections.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {format.sections.map((section) => (
                    <label
                      key={section.key}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${
                        included.has(section.key)
                          ? 'border-teal-300 bg-teal-50/40'
                          : 'border-ios-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={included.has(section.key)}
                        onChange={() => toggle(section.key)}
                        className="mt-0.5 w-5 h-5 flex-shrink-0 accent-teal-600"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-teal-900">{section.label}</span>
                        <span className="block text-xs text-ios-gray-500">{section.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/*
              Clears the phone's bottom bar, which is fixed at 56px and would
              otherwise sit on top of these two buttons.
            */}
            <div className="flex-shrink-0 border-t border-ios-gray-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pb-[calc(env(safe-area-inset-bottom)+12px)] flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-3 rounded-xl border border-ios-gray-300 text-ios-gray-600 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={run}
                disabled={busy || (audience === 'internal' && format.sections.length > 0 && included.size === 0)}
                className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-40"
              >
                {busy ? 'Exporting…' : `Export ${format.label}`}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
