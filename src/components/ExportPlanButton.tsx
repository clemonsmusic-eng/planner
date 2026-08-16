import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { buildPlanDocument, planFileStem } from '../lib/planDocument';
import { downloadBlob } from '../lib/furnitureExport';
import type { Project, ScheduleResult } from '../types';

/**
 * Export the Plan as a document.
 *
 * Both formats are built from the same block model, so the PDF and the Word
 * file say the same thing. The renderers are loaded on demand: most sessions
 * never export, and neither writer is small.
 */
export function ExportPlanButton({ project, schedule }: { project: Project; schedule: ScheduleResult }) {
  const { state } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  async function exportAs(format: 'pdf' | 'docx') {
    setBusy(format);
    setOpen(false);
    try {
      const doc = buildPlanDocument(project, schedule, state.teamMembers, state.services, state.shiftTimes);
      const stem = planFileStem(project);
      if (format === 'pdf') {
        const { buildDocumentPdf } = await import('../lib/pdf');
        downloadBlob(buildDocumentPdf(doc), `${stem}.pdf`);
      } else {
        const { buildDocx } = await import('../lib/docx');
        downloadBlob(buildDocx(doc), `${stem}.docx`);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative flex-shrink-0" ref={wrap}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy !== null}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600 text-sm font-semibold min-h-[36px] active:opacity-70 lg:hover:opacity-80 disabled:opacity-40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
          <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        </svg>
        {busy ? 'Exporting…' : 'Export'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-56 bg-white rounded-xl shadow-lg border border-ios-gray-200 overflow-hidden"
        >
          <button
            role="menuitem"
            onClick={() => exportAs('pdf')}
            className="w-full text-left px-4 py-3 border-b border-ios-gray-100 active:bg-ios-gray-50 lg:hover:bg-ios-gray-50"
          >
            <p className="text-sm font-semibold text-teal-900">PDF</p>
            <p className="text-xs text-ios-gray-500">For sending or printing</p>
          </button>
          <button
            role="menuitem"
            onClick={() => exportAs('docx')}
            className="w-full text-left px-4 py-3 active:bg-ios-gray-50 lg:hover:bg-ios-gray-50"
          >
            <p className="text-sm font-semibold text-teal-900">Word (.docx)</p>
            <p className="text-xs text-ios-gray-500">For editing before it goes out</p>
          </button>
        </div>
      )}
    </div>
  );
}
