import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { RearrangeSupplies } from '../components/RearrangeSupplies';
import {
  visibleCategories,
  availableOf,
  emptySupplyItem,
  stockedForOnHand,
  usedEverywhere,
  type SupplyCategory,
} from '../lib/supplies';
import type { SupplyItem } from '../types';

/**
 * Master supply inventory — the Director of Operations' list.
 *
 * Every project's supply page draws against these items, so what's shown as On
 * Hand is what's been stocked less everything the projects have used. Editing
 * On Hand here is a physical recount: the stocked figure absorbs the change so
 * the two stay consistent.
 */
export function SupplyInventoryPage() {
  const { state, dispatch } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SupplyItem | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [rearranging, setRearranging] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [sectionDraft, setSectionDraft] = useState('');
  const [confirmSection, setConfirmSection] = useState<string | null>(null);

  const supplies = state.supplies;
  const allDocs = state.projects.map((p) => p.documents);

  function write(next: SupplyItem[]) {
    dispatch({ type: 'UPDATE_SUPPLIES', supplies: next });
  }

  function patch(id: string, changes: Partial<SupplyItem>) {
    write(supplies.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  }

  // ── Sections ────────────────────────────────────────────────────────────────
  // A section name is stored on every item in it, so renaming or removing one
  // has to rewrite those items in the same action or they'd be orphaned.

  function renameSection(from: string, to: string) {
    const name = to.trim();
    if (!name || name === from) { setEditingSection(null); return; }
    if (categories.includes(name)) { setEditingSection(null); return; }
    dispatch({
      type: 'UPDATE_SUPPLY_CATEGORIES',
      categories: categories.map((c) => (c === from ? name : c)),
      supplies: supplies.map((s) => (s.category === from ? { ...s, category: name } : s)),
    });
    setEditingSection(null);
  }

  function addSection() {
    let name = 'New Section';
    for (let n = 2; categories.includes(name); n++) name = `New Section ${n}`;
    dispatch({ type: 'UPDATE_SUPPLY_CATEGORIES', categories: [...categories, name] });
    setEditingSection(name);
    setSectionDraft(name);
  }

  function removeSection(name: string) {
    const remaining = categories.filter((c) => c !== name);
    const fallback = remaining[0];
    dispatch({
      type: 'UPDATE_SUPPLY_CATEGORIES',
      categories: remaining,
      // Items move rather than vanish; they carry stock and usage history.
      supplies: fallback
        ? supplies.map((s) => (s.category === name ? { ...s, category: fallback } : s))
        : supplies,
    });
    setConfirmSection(null);
  }

  function addItem(category: SupplyCategory) {
    const row = emptySupplyItem(category);
    write([...supplies, row]);
    setExpandedId(row.id);
    setCollapsed((c) => ({ ...c, [category]: false }));
  }

  const categories = visibleCategories(state.supplyCategories, supplies);

  const totalOut = supplies.reduce((n, s) => n + usedEverywhere(allDocs, s.id), 0);
  const consumableCount = supplies.filter((s) => s.consumable).length;

  return (
    <div className="flex flex-col h-full">
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-teal-900 leading-tight">Supply Inventory</h1>
            <p className="text-xs text-ios-gray-600">
              {rearranging
                ? 'Drag to reorder or move between sections'
                : `Master list · ${supplies.length} items · ${consumableCount} consumable${
                    totalOut > 0 ? ` · ${totalOut} drawn by projects` : ''
                  }`}
            </p>
          </div>
          <button
            onClick={() => { setRearranging((v) => !v); setExpandedId(null); }}
            aria-pressed={rearranging}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold min-h-[36px] transition-colors ${
              rearranging ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
            }`}
          >
            {rearranging ? 'Done' : 'Rearrange'}
          </button>
        </div>
      </div>

      {rearranging && (
        <RearrangeSupplies
          supplies={supplies}
          categories={categories}
          onCommit={write}
          onCommitCategories={(next) =>
            dispatch({ type: 'UPDATE_SUPPLY_CATEGORIES', categories: next })
          }
        />
      )}

      {!rearranging && (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-teal-50/70 border border-teal-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-teal-900 leading-snug">
            Consumables show on every project's Supplies page, where managers draw them down;
            On Hand already has that taken off. Equipment is tracked here only.
          </p>
        </div>

        {categories.map((category) => {
          const items = supplies.filter((s) => s.category === category);
          const isCollapsed = collapsed[category] ?? false;
          return (
            <Card key={category} className="overflow-hidden">
              {editingSection === category ? (
                <div className="px-3 py-2.5 flex items-center gap-2 border-b border-ios-gray-100">
                  <input
                    autoFocus
                    value={sectionDraft}
                    onChange={(e) => setSectionDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') renameSection(category, sectionDraft); }}
                    className="flex-1 min-w-0 min-h-[40px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
                    aria-label={`Rename ${category}`}
                  />
                  <button
                    onClick={() => renameSection(category, sectionDraft)}
                    className="px-3 min-h-[40px] rounded-xl bg-teal-600 text-white text-sm font-semibold flex-shrink-0"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setConfirmSection(category)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-ios-gray-400 active:text-red-600 flex-shrink-0"
                    aria-label={`Remove ${category} section`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
              <div className="w-full px-4 py-3 flex items-center gap-1 min-h-[48px]">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [category]: !isCollapsed }))}
                  aria-expanded={!isCollapsed}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  <h2 className="font-bold text-teal-900 text-sm flex-1 min-w-0 truncate">{category}</h2>
                  <span className="text-xs text-ios-gray-500 flex-shrink-0">{items.length}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => { setEditingSection(category); setSectionDraft(category); }}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-ios-gray-400 active:text-teal-600 flex-shrink-0"
                  aria-label={`Edit ${category} section`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>
              )}

              {!isCollapsed && (
                <div className="border-t border-ios-gray-100">
                  {items.map((row) => {
                    const used = usedEverywhere(allDocs, row.id);
                    const onHand = availableOf(row, used);
                    const open = expandedId === row.id;
                    return (
                      <div key={row.id} className="border-b border-ios-gray-100 last:border-0">
                        <button
                          onClick={() => setExpandedId(open ? null : row.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-ios-gray-50"
                        >
                          <span className="flex-1 min-w-0">
                            <span className={`block text-sm font-medium truncate ${row.name ? 'text-teal-900' : 'text-ios-gray-400'}`}>
                              {row.name || 'Untitled item'}
                              {row.unit ? <span className="text-ios-gray-500 font-normal"> · {row.unit}</span> : null}
                            </span>
                            <span className="block text-xs text-ios-gray-500 truncate">
                              {[
                                row.consumable ? 'Consumable' : 'Equipment',
                                row.description,
                                used > 0 ? `${used} used on jobs` : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </span>
                          {/*
                            Red is for stock that ran out, not for stock that
                            was never counted in — otherwise a fresh inventory
                            is a wall of warnings.
                          */}
                          <span
                            className={`flex-shrink-0 text-sm font-bold tabular-nums px-2 py-0.5 rounded-lg ${
                              row.stocked === 0
                                ? 'text-ios-gray-300'
                                : onHand <= 0
                                ? 'bg-red-50 text-red-700'
                                : 'text-teal-900'
                            }`}
                          >
                            {onHand}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className={`w-4 h-4 text-ios-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                          >
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {open && (
                          <div className="px-4 pb-4 pt-1 space-y-3 bg-ios-gray-50/60">
                            <Field label="Item">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => patch(row.id, { name: e.target.value })}
                                placeholder="Item name"
                                className={INPUT}
                              />
                            </Field>

                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className={LABEL}>On Hand</label>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={onHand}
                                  onChange={(e) =>
                                    patch(row.id, {
                                      stocked: stockedForOnHand(parseInt(e.target.value, 10) || 0, used),
                                    })
                                  }
                                  className={INPUT}
                                />
                              </div>
                              <div className="flex-1">
                                <label className={LABEL}>Units</label>
                                <input
                                  type="text"
                                  value={row.unit}
                                  onChange={(e) => patch(row.id, { unit: e.target.value })}
                                  placeholder="box, roll…"
                                  className={INPUT}
                                />
                              </div>
                              <div className="flex-1">
                                <label className={LABEL}>Cost/Unit</label>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  value={row.costPerUnit ?? ''}
                                  onChange={(e) =>
                                    patch(row.id, {
                                      costPerUnit: e.target.value === '' ? null : parseFloat(e.target.value),
                                    })
                                  }
                                  placeholder="—"
                                  className={INPUT}
                                />
                              </div>
                            </div>

                            {used > 0 && (
                              <p className="text-[11px] text-ios-gray-500">
                                {row.stocked} stocked − {used} used on jobs = {onHand} on hand.
                                Setting On Hand records a recount.
                              </p>
                            )}

                            <Field label="Description / Use">
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => patch(row.id, { description: e.target.value })}
                                placeholder="300', carry 2…"
                                className={INPUT}
                              />
                            </Field>

                            <div>
                              <label className={LABEL}>Type</label>
                              <div className="flex gap-2">
                                {([true, false] as const).map((value) => (
                                  <button
                                    key={String(value)}
                                    onClick={() => patch(row.id, { consumable: value })}
                                    aria-pressed={row.consumable === value}
                                    className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-colors ${
                                      row.consumable === value
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-ios-gray-100 text-ios-gray-600'
                                    }`}
                                  >
                                    {value ? 'Consumable' : 'Equipment'}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[11px] text-ios-gray-500 mt-1.5">
                                {row.consumable
                                  ? 'Listed on every project\u2019s supply page, where it can be drawn down.'
                                  : 'Tracked here only \u2014 it never appears on a project\u2019s supply page.'}
                              </p>
                            </div>

                            <Field label="Category">
                              <select
                                value={row.category}
                                onChange={(e) => patch(row.id, { category: e.target.value })}
                                className={`${INPUT} appearance-none`}
                              >
                                {categories.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </Field>

                            <button
                              onClick={() => setConfirmDelete(row)}
                              className="w-full py-2.5 text-xs font-semibold text-red-600 active:text-red-700"
                            >
                              Remove from Inventory
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => addItem(category as SupplyCategory)}
                    className="w-full py-3 text-sm font-semibold text-teal-600 active:bg-teal-50"
                  >
                    + Add to {category}
                  </button>
                </div>
              )}
            </Card>
          );
        })}

        <button
          onClick={addSection}
          className="w-full py-3 rounded-xl border border-dashed border-teal-300 text-teal-600 font-semibold text-sm min-h-[44px] active:bg-teal-50"
        >
          + Add Section
        </button>
      </div>
      )}

      {confirmSection && (
        <ConfirmSheet
          title="Remove section"
          message={
            supplies.some((s) => s.category === confirmSection)
              ? `Remove the ${confirmSection} section? Its ${supplies.filter((s) => s.category === confirmSection).length} item(s) move to ${categories.filter((c) => c !== confirmSection)[0] ?? 'no section'}, keeping their stock.`
              : `Remove the empty ${confirmSection} section?`
          }
          confirmLabel="Remove Section"
          onConfirm={() => { removeSection(confirmSection); setEditingSection(null); }}
          onClose={() => setConfirmSection(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmSheet
          title="Remove supply"
          message={`Remove ${confirmDelete.name || 'this item'} from the master inventory? It disappears from every project's supply list too; usage already logged stays on those projects.`}
          confirmLabel="Remove"
          onConfirm={() => {
            write(supplies.filter((s) => s.id !== confirmDelete.id));
            if (expandedId === confirmDelete.id) setExpandedId(null);
            setConfirmDelete(null);
          }}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

const INPUT =
  'w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500';
const LABEL = 'block text-[11px] font-bold text-ios-gray-500 uppercase tracking-wide mb-1.5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}
