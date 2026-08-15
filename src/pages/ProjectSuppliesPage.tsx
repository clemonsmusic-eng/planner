import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { ProjectDocHeader, NoProjectState } from '../components/ProjectDocHeader';
import { normalizeDocuments } from '../lib/documents';
import {
  visibleCategories,
  availableOf,
  newUsageEntry,
  normalizeUsage,
  usedEverywhere,
  usedOnProject,
} from '../lib/supplies';
import { formatDateLabel } from '../lib/dateUtils';
import type { SupplyItem } from '../types';

/**
 * Supplies used on one job.
 *
 * The list is the master inventory, so anything the Director adds there shows up
 * here. Logging a quantity draws it down: the master's On Hand is its stocked
 * figure less everything logged across all projects, so a correction here puts
 * the stock straight back.
 */
export function ProjectSuppliesPage() {
  const { state, activeProject, updateDocuments } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [usedOnly, setUsedOnly] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (!activeProject) {
    return <NoProjectState title="Supplies" message="Pick a project to track its supplies." />;
  }

  const docs = normalizeDocuments(activeProject.documents);
  const usage = normalizeUsage(docs.supplyUsage);
  const allDocs = state.projects.map((p) => p.documents);

  /**
   * Consumables only — equipment is tracked on the master and never drawn.
   * An item switched to equipment after a draw stays listed here while that
   * draw exists, so the entry can still be seen and corrected rather than
   * being stranded with stock held against it.
   */
  const supplies = state.supplies.filter(
    (s) => s.consumable || usedOnProject(usage, s.id) > 0
  );

  const totalLogged = usage.reduce((n, u) => n + u.quantity, 0);

  /** Log a draw, or fold it into today's entry so repeated taps don't pile up rows. */
  function draw(supplyId: string, delta: number) {
    updateDocuments(activeProject!.id, (d) => {
      const current = normalizeUsage(d.supplyUsage);
      const today = new Date().toISOString().slice(0, 10);
      const existing = current.find((u) => u.supplyId === supplyId && u.date === today && !u.note);

      if (existing) {
        const quantity = existing.quantity + delta;
        return {
          ...d,
          supplyUsage:
            quantity > 0
              ? current.map((u) => (u.id === existing.id ? { ...u, quantity } : u))
              : current.filter((u) => u.id !== existing.id),
        };
      }
      if (delta <= 0) return d;
      return { ...d, supplyUsage: [...current, newUsageEntry(supplyId, delta)] };
    });
  }

  function removeEntry(entryId: string) {
    updateDocuments(activeProject!.id, (d) => ({
      ...d,
      supplyUsage: normalizeUsage(d.supplyUsage).filter((u) => u.id !== entryId),
    }));
  }

  const categories = visibleCategories(state.supplyCategories, supplies);

  return (
    <div className="flex flex-col h-full">
      <ProjectDocHeader
        title="Supplies"
        subtitle={totalLogged > 0 ? `${totalLogged} drawn on this job` : 'Nothing drawn yet'}
      />

      <div className="px-4 py-2 border-b border-ios-gray-200 bg-white flex items-center gap-2">
        <button
          onClick={() => setUsedOnly((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            usedOnly ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
          }`}
        >
          Used on this job
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {supplies.length === 0 && (
          <div className="text-center py-16 px-6">
            <p className="text-ios-gray-600 text-sm">
              {state.supplies.length === 0
                ? "The master supply inventory is empty. It's managed from Home → Supply Inventory."
                : 'No consumables in the master inventory yet. Mark an item Consumable there and it shows up here.'}
            </p>
          </div>
        )}

        {categories.map((category) => {
          const items = supplies
            .filter((s) => s.category === category)
            .filter((s) => !usedOnly || usedOnProject(usage, s.id) > 0);
          if (items.length === 0) return null;

          const isCollapsed = collapsed[category] ?? false;
          return (
            <Card key={category} className="overflow-hidden">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [category]: !isCollapsed }))}
                aria-expanded={!isCollapsed}
                className="w-full px-4 py-3 flex items-center gap-2 min-h-[48px] text-left"
              >
                <h2 className="font-bold text-teal-900 text-sm flex-1 min-w-0 truncate">{category}</h2>
                <span className="text-xs text-ios-gray-500 flex-shrink-0">{items.length}</span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                  className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>

              {!isCollapsed && (
                <div className="border-t border-ios-gray-100">
                  {items.map((row) => (
                    <SupplyRow
                      key={row.id}
                      row={row}
                      mine={usedOnProject(usage, row.id)}
                      remaining={availableOf(row, usedEverywhere(allDocs, row.id))}
                      entries={usage.filter((u) => u.supplyId === row.id)}
                      open={openId === row.id}
                      onToggle={() => setOpenId(openId === row.id ? null : row.id)}
                      onDraw={(delta) => draw(row.id, delta)}
                      onRemoveEntry={removeEntry}
                    />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SupplyRow({
  row,
  mine,
  remaining,
  entries,
  open,
  onToggle,
  onDraw,
  onRemoveEntry,
}: {
  row: SupplyItem;
  mine: number;
  remaining: number;
  entries: { id: string; quantity: number; date: string; note: string }[];
  open: boolean;
  onToggle: () => void;
  onDraw: (delta: number) => void;
  onRemoveEntry: (id: string) => void;
}) {
  const neverStocked = row.stocked === 0;
  return (
    <div className="border-b border-ios-gray-100 last:border-0">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-teal-900 truncate">
            {row.name || 'Untitled item'}
            {row.unit ? <span className="text-ios-gray-500 font-normal"> · {row.unit}</span> : null}
            {!row.consumable && (
              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-ios-gray-100 text-ios-gray-600">
                Equipment
              </span>
            )}
          </p>
          <p className="text-xs text-ios-gray-500 truncate">
            {/*
              Nothing counted in yet is not the same as having run out — the
              warning is reserved for stock that actually went to zero, so a
              fresh inventory doesn't read as one long emergency.
            */}
            {neverStocked ? (
              <span className="text-ios-gray-400">Not counted in yet</span>
            ) : remaining <= 0 ? (
              <span className="text-red-600 font-semibold">None left in stock</span>
            ) : (
              `${remaining} left in stock`
            )}
            {row.description ? ` · ${row.description}` : ''}
          </p>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onDraw(-1)}
            disabled={mine <= 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-200 lg:hover:bg-ios-gray-200 disabled:opacity-30"
            aria-label={`Return one ${row.name}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
            </svg>
          </button>
          <span
            className={`w-7 text-center text-sm font-bold tabular-nums ${mine > 0 ? 'text-teal-700' : 'text-ios-gray-300'}`}
          >
            {mine}
          </span>
          <button
            onClick={() => onDraw(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-teal-600 active:bg-teal-50 lg:hover:bg-teal-50"
            aria-label={`Take one ${row.name}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-3 bg-ios-gray-50/60">
          {entries.length === 0 ? (
            <p className="text-xs text-ios-gray-500 py-2">Nothing drawn on this job yet.</p>
          ) : (
            <ul className="divide-y divide-ios-gray-200">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-2 py-2">
                  <span className="text-xs text-ios-gray-600 flex-1 min-w-0 truncate">
                    {formatDateLabel(e.date)}
                    {e.note ? ` · ${e.note}` : ''}
                  </span>
                  <span className="text-sm font-semibold text-teal-900 tabular-nums">{e.quantity}</span>
                  <button
                    onClick={() => onRemoveEntry(e.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-ios-gray-400 active:text-red-600 lg:hover:text-red-600 flex-shrink-0"
                    aria-label="Remove this entry"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
