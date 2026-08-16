import { useEffect, useRef, useState } from 'react';

/**
 * The Export control, shared by the tabs that have something to export.
 *
 * The formats differ per tab — a Plan has no calendar to hand out — so the
 * menu is passed in rather than fixed here, and each builder is only invoked
 * when its item is chosen so a renderer nobody uses is never loaded.
 */

export interface ExportOption {
  label: string;
  hint: string;
  run: () => Promise<void> | void;
}

export function ExportButton({ options, label = 'Export' }: { options: ExportOption[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [nudge, setNudge] = useState(0);

  /*
   * The menu hangs off the button's right edge, which on a narrow screen can
   * put its left edge past the side of the window — the button is mid-header,
   * not at the margin. Measured once open and pushed back into view, because
   * where it lands depends on what else is in the header beside it.
   */
  useEffect(() => {
    if (!open) return setNudge(0);
    const box = menu.current?.getBoundingClientRect();
    if (!box) return;
    if (box.left < 8) setNudge(8 - box.left);
    else if (box.right > window.innerWidth - 8) setNudge(window.innerWidth - 8 - box.right);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  async function choose(option: ExportOption) {
    setBusy(true);
    setOpen(false);
    try {
      await option.run();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex-shrink-0" ref={wrap}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600 text-sm font-semibold min-h-[36px] active:opacity-70 lg:hover:opacity-80 disabled:opacity-40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        </svg>
        {busy ? 'Exporting…' : label}
      </button>

      {open && (
        <div
          ref={menu}
          role="menu"
          style={{ transform: nudge ? `translateX(${nudge}px)` : undefined }}
          className="absolute right-0 top-full mt-1 z-[55] w-60 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-lg border border-ios-gray-200 overflow-hidden"
        >
          {options.map((option) => (
            <button
              key={option.label}
              role="menuitem"
              onClick={() => choose(option)}
              className="w-full text-left px-4 py-3 border-b border-ios-gray-100 last:border-0 active:bg-ios-gray-50 lg:hover:bg-ios-gray-50"
            >
              <p className="text-sm font-semibold text-teal-900">{option.label}</p>
              <p className="text-xs text-ios-gray-500">{option.hint}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
