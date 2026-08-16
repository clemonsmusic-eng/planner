import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { emptyPhaseBudgets } from '../lib/budgets';
import { formatDateLabel } from '../lib/dateUtils';
import { parseIcs } from '../lib/icsImport';
import { applyImport } from '../lib/applyImport';
import type { ImportResult, ImportedShift, ShiftSlot } from '../lib/scheduleImport';
import type { Project, ProjectInputs } from '../types';

/**
 * Importing a schedule from a file.
 *
 * Nothing here writes to a project until the review step is confirmed. A .ics
 * is read accurately, but a PDF is scanned for anything that looks like a date
 * — which is guesswork on someone else's layout — so every row arrives
 * editable, with the text it was read from underneath it, and rows the reader
 * was unsure about start switched off.
 */

type Stage = 'choose' | 'reading' | 'review' | 'done';

/** What the review list holds: a parsed row plus whether it's coming in. */
interface Row extends ImportedShift {
  include: boolean;
}

function createImportedInputs(name: string): ProjectInputs {
  return {
    clientName: name,
    projectName: '',
    community: 'First Colonial Inn',
    moveType: 'Full Move',
    status: 'draft',
    targetMoveDate: '',
    earliestStartDate: '',
    hardDeadline: '',
    flexibilityLevel: 'Medium',
    originSqFt: 0,
    destinationSqFt: 0,
    densityLevel: 'Moderate',
    phaseBudgets: emptyPhaseBudgets(),
    clientTimePreference: 'AM',
    specialNotes: '',
    contractedServices: [],
    cleanout: { enabled: false, type: '', startDate: '' },
    auction: { enabled: false },
    dateOverrides: [],
  };
}

export function ImportSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('choose');
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openProjects = state.projects.filter((p) => (p.inputs.status ?? 'active') !== 'archived');
  // Defaults to a new project rather than the open one: an import that creates
  // its own project cannot damage work that is already there, and merging into
  // an existing plan should be something chosen, not something defaulted into.
  const [target, setTarget] = useState<'new' | string>('new');
  const [newName, setNewName] = useState('');
  const [outcome, setOutcome] = useState<{ added: number; skipped: number; name: string } | null>(null);

  // The picker opens with the sheet: choosing a file is the whole first step,
  // and a sheet whose only content is one button is a step for its own sake.
  useEffect(() => {
    fileInput.current?.click();
  }, []);

  async function readFile(file: File) {
    setFileName(file.name);
    setStage('reading');
    setError(null);
    try {
      const isIcs = /\.ics$/i.test(file.name) || file.type === 'text/calendar';
      const parsed = isIcs
        ? parseIcs(await file.text())
        : // Loaded on demand: the PDF reader is larger than the rest of the app,
          // and only an import that is actually a PDF should pay for it.
          await (await import('../lib/pdfImport')).parsePdfSchedule(file);
      setResult(parsed);
      setRows(parsed.shifts.map((s) => ({ ...s, include: s.confidence === 'high' })));
      setNewName(parsed.suggestedName ?? file.name.replace(/\.[^.]+$/, ''));
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That file could not be read.');
      setStage('choose');
    }
  }

  function update(id: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function runImport() {
    const chosen = rows.filter((r) => r.include);
    if (chosen.length === 0) return;

    let project: Project;
    if (target === 'new') {
      project = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        inputs: createImportedInputs(newName.trim() || 'Imported project'),
        schedule: null,
      };
      dispatch({ type: 'CREATE_PROJECT', project });
    } else {
      const found = state.projects.find((p) => p.id === target);
      if (!found) return;
      project = found;
    }

    const { project: updated, skipped } = applyImport(
      project,
      chosen,
      state.phaseTemplates,
      state.teamMembers
    );
    dispatch({ type: 'REPLACE_PROJECT', project: updated });
    dispatch({ type: 'SET_ACTIVE_PROJECT', id: updated.id });
    // Creating a project jumps to its Input tab, which would unmount this sheet
    // mid-import and swallow the summary. Stay put until Done is pressed.
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'projects' });
    setOutcome({
      added: chosen.length - skipped.length,
      skipped: skipped.length,
      name: updated.inputs.clientName || 'the project',
    });
    setStage('done');
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 top-10 lg:inset-10 lg:top-16 lg:bottom-16 lg:mx-auto lg:max-w-3xl z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ios-gray-200 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-teal-900">Import Schedule</h2>
            <p className="text-xs text-ios-gray-500 truncate">
              {fileName || 'PDF or calendar (.ics) file'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
            aria-label="Close import"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.ics,application/pdf,text/calendar"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
            e.target.value = '';
          }}
        />

        <div className="flex-1 overflow-y-auto">
          {stage === 'choose' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              {error && <p className="text-sm text-red-600 max-w-sm">{error}</p>}
              <p className="text-sm text-ios-gray-600 max-w-sm">
                Pick a PDF or a calendar file. Dates, shifts and any crew named on them are read out
                and shown for review before anything is added.
              </p>
              <button
                onClick={() => fileInput.current?.click()}
                className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
              >
                Choose File
              </button>
              <p className="text-xs text-ios-gray-500 max-w-sm">
                Scanned or photographed pages are images, not text, and cannot be read.
              </p>
            </div>
          )}

          {stage === 'reading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              <p className="text-sm text-ios-gray-600">Reading {fileName}…</p>
            </div>
          )}

          {stage === 'review' && result && (
            <div className="px-4 py-3 space-y-3">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                  {w}
                </p>
              ))}

              {rows.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-ios-gray-600">No shifts could be read from this file.</p>
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="mt-3 text-sm font-semibold text-teal-600"
                  >
                    Try another file
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-ios-gray-600">
                      {rows.length} shift{rows.length === 1 ? '' : 's'} found · {includedCount} selected
                    </p>
                    <button
                      onClick={() =>
                        setRows((prev) => {
                          const turnOn = prev.some((r) => !r.include);
                          return prev.map((r) => ({ ...r, include: turnOn }));
                        })
                      }
                      className="text-sm font-semibold text-teal-600 px-2 py-1"
                    >
                      {rows.some((r) => !r.include) ? 'Select all' : 'Clear all'}
                    </button>
                  </div>

                  {rows.map((row) => (
                    <ReviewRow key={row.id} row={row} onChange={(patch) => update(row.id, patch)} />
                  ))}
                </>
              )}
            </div>
          )}

          {stage === 'done' && outcome && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-teal-600">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-teal-900 font-semibold">
                {outcome.added} shift{outcome.added === 1 ? '' : 's'} added to {outcome.name}
              </p>
              {outcome.skipped > 0 && (
                <p className="text-xs text-ios-gray-600 max-w-sm">
                  {outcome.skipped} were already scheduled on those dates and were left as they are.
                </p>
              )}
              <button
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE_TAB', tab: 'schedule' });
                  onClose();
                }}
                className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
              >
                View Schedule
              </button>
            </div>
          )}
        </div>

        {stage === 'review' && rows.length > 0 && (
          <div
            className="border-t border-ios-gray-200 px-4 py-3 space-y-3 flex-shrink-0 bg-white"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-1.5">
                Import into
              </p>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                aria-label="Import into"
                className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
              >
                <option value="new">New project</option>
                {openProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.inputs.clientName || 'Untitled'}
                    {p.schedule ? ' (adds to its schedule)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {target === 'new' && (
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name"
                aria-label="New project name"
                className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
              />
            )}
            <button
              onClick={runImport}
              disabled={includedCount === 0}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold min-h-[48px] disabled:opacity-40"
            >
              Import {includedCount} Shift{includedCount === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

const SLOTS: ShiftSlot[] = ['AM', 'PM', 'Full Day'];

function ReviewRow({ row, onChange }: { row: Row; onChange: (patch: Partial<Row>) => void }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        row.include ? 'border-teal-300 bg-teal-50/40' : 'border-ios-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={row.include}
          onChange={(e) => onChange({ include: e.target.checked })}
          aria-label={`Import ${row.title} on ${formatDateLabel(row.date)}`}
          className="mt-1 w-5 h-5 flex-shrink-0 accent-teal-600"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={row.title}
              onChange={(e) => onChange({ title: e.target.value })}
              aria-label="Shift name"
              className="flex-1 min-w-0 text-sm font-semibold text-teal-900 bg-transparent border-b border-transparent focus:border-teal-400 focus:outline-none py-0.5"
            />
            {row.confidence === 'low' && (
              <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Unsure
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={row.date}
              onChange={(e) => e.target.value && onChange({ date: e.target.value })}
              aria-label="Date"
              className="min-h-[36px] rounded-lg border border-ios-gray-300 bg-white px-2 text-sm text-teal-900"
            />
            <select
              value={row.shift}
              onChange={(e) => onChange({ shift: e.target.value as ShiftSlot })}
              aria-label="Shift"
              className="min-h-[36px] rounded-lg border border-ios-gray-300 bg-white px-2 text-sm text-teal-900"
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-sm text-ios-gray-600">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={row.hours}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  if (Number.isFinite(n) && n > 0) onChange({ hours: n });
                }}
                aria-label="Hours per person"
                className="w-16 min-h-[36px] rounded-lg border border-ios-gray-300 bg-white px-2 text-sm text-teal-900"
              />
              hrs each
            </label>
          </div>

          {row.crew.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.crew.map((c) => (
                <span
                  key={`${c.role}-${c.name}`}
                  className="text-[11px] bg-white border border-ios-gray-200 text-teal-900 px-2 py-0.5 rounded-full"
                >
                  <span className="text-ios-gray-500">{c.role}</span> {c.name}
                </span>
              ))}
            </div>
          )}

          {row.note && <p className="text-xs text-ios-gray-600 whitespace-pre-line">{row.note}</p>}

          {/* What the row was read from, so a wrong guess is visible as one. */}
          <p className="text-[11px] text-ios-gray-400 truncate" title={row.source}>
            from: {row.source}
          </p>
        </div>
      </div>
    </div>
  );
}
