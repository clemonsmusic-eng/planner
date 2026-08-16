import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { contactSummary } from '../lib/contacts';
import { markDuplicates, parseContactFile, type ImportedContact } from '../lib/contactsIo';
import type { CrmContact } from '../types';

/**
 * Bringing contacts into the book from a file.
 *
 * Reviewed before anything is written, like every other import here — a
 * spreadsheet from somewhere else will have columns this doesn't recognise and
 * rows that are already in the book, and both are better shown than guessed
 * at. Rows that match something already there arrive switched off.
 */

type Stage = 'choose' | 'reading' | 'review' | 'done';

interface Row extends ImportedContact {
  include: boolean;
}

export function CrmImportSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>('choose');
  const [fileName, setFileName] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(0);

  // The picker opens with the sheet: choosing a file is the whole first step.
  useEffect(() => {
    fileInput.current?.click();
  }, []);

  async function read(file: File) {
    setFileName(file.name);
    setStage('reading');
    setError(null);
    try {
      const parsed = parseContactFile(file.name, await file.text());
      const marked = markDuplicates(parsed.contacts, state.crmContacts);
      setWarnings(parsed.warnings);
      setRows(marked.map((c) => ({ ...c, include: !c.duplicateOf })));
      setStage('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That file could not be read.');
      setStage('choose');
    }
  }

  function runImport() {
    const chosen = rows.filter((r) => r.include);
    if (chosen.length === 0) return;
    const now = new Date().toISOString();
    const fresh: CrmContact[] = chosen.map(({ id: _id, duplicateOf: _dup, include: _inc, ...details }) => ({
      ...details,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }));
    dispatch({ type: 'UPDATE_CRM_CONTACTS', contacts: [...state.crmContacts, ...fresh] });
    setAdded(fresh.length);
    setStage('done');
  }

  const chosen = rows.filter((r) => r.include).length;
  const duplicates = rows.filter((r) => r.duplicateOf).length;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Import contacts"
        className="fixed inset-x-0 bottom-0 top-10 lg:inset-10 lg:top-16 lg:bottom-16 lg:mx-auto lg:max-w-2xl z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ios-gray-200 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-teal-900">Import Contacts</h2>
            <p className="text-xs text-ios-gray-500 truncate">{fileName || 'CSV or vCard (.vcf) file'}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close import"
            className="w-9 h-9 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <input
          ref={fileInput}
          type="file"
          accept=".csv,.vcf,text/csv,text/vcard"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) read(file);
            e.target.value = '';
          }}
        />

        <div className="flex-1 overflow-y-auto">
          {stage === 'choose' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              {error && <p className="text-sm text-red-600 max-w-sm">{error}</p>}
              <p className="text-sm text-ios-gray-600 max-w-sm">
                A spreadsheet with a header row, or a vCard file exported from a phone or another
                contacts app.
              </p>
              <button
                onClick={() => fileInput.current?.click()}
                className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
              >
                Choose File
              </button>
            </div>
          )}

          {stage === 'reading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
              <p className="text-sm text-ios-gray-600">Reading {fileName}…</p>
            </div>
          )}

          {stage === 'review' && (
            <div className="px-4 py-3 space-y-3">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                  {w}
                </p>
              ))}

              {rows.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-ios-gray-600">No contacts could be read from this file.</p>
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
                      {rows.length} found · {chosen} selected
                      {duplicates > 0 ? ` · ${duplicates} already in the book` : ''}
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
                    <label
                      key={row.id}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${
                        row.include ? 'border-teal-300 bg-teal-50/40' : 'border-ios-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={row.include}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, include: e.target.checked } : r))
                          )
                        }
                        aria-label={`Import ${contactSummary(row)}`}
                        className="mt-0.5 w-5 h-5 flex-shrink-0 accent-teal-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-teal-900 truncate">
                            {contactSummary(row)}
                          </span>
                          {row.duplicateOf && (
                            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Already here
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-ios-gray-500 truncate">
                          {[row.contactType || 'No type', row.workPhone || row.cellPhone, row.email]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </label>
                  ))}
                </>
              )}
            </div>
          )}

          {stage === 'done' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-teal-600">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-teal-900 font-semibold">
                {added} contact{added === 1 ? '' : 's'} added
              </p>
              <button
                onClick={onClose}
                className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {stage === 'review' && rows.length > 0 && (
          <div className="border-t border-ios-gray-200 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pb-[calc(env(safe-area-inset-bottom)+12px)] flex-shrink-0 bg-white">
            <button
              onClick={runImport}
              disabled={chosen === 0}
              className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold min-h-[48px] disabled:opacity-40"
            >
              Import {chosen} Contact{chosen === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
