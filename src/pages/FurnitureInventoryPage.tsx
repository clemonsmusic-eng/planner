import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { ProjectDocHeader, NoProjectState } from '../components/ProjectDocHeader';
import { emptyFurnitureItem, normalizeDocuments } from '../lib/documents';
import type { FurnitureItem } from '../types';

/**
 * The Furniture Inventory sheet.
 *
 * The printed form is a wide table; on a phone each row opens as a card
 * instead, with the same columns as fields. The numbering is positional —
 * row 1 is the first row — matching how the sheet is filled in by hand, so
 * deleting a row renumbers the rest rather than leaving a gap.
 */
export function FurnitureInventoryPage() {
  const { activeProject, updateDocuments } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [wishlistOnly, setWishlistOnly] = useState(false);

  if (!activeProject) {
    return <NoProjectState title="Furniture Inventory" message="Pick a project to see its inventory." />;
  }

  const docs = normalizeDocuments(activeProject.documents);
  const items = docs.furniture;
  const shown = wishlistOnly ? items.filter((i) => i.wishlist) : items;
  const wishlistCount = items.filter((i) => i.wishlist).length;

  function patch(id: string, changes: Partial<FurnitureItem>) {
    updateDocuments(activeProject!.id, (d) => ({
      ...d,
      furniture: d.furniture.map((i) => (i.id === id ? { ...i, ...changes } : i)),
    }));
  }

  function addRow() {
    const row = emptyFurnitureItem();
    updateDocuments(activeProject!.id, (d) => ({ ...d, furniture: [...d.furniture, row] }));
    setExpandedId(row.id);
  }

  function removeRow(id: string) {
    updateDocuments(activeProject!.id, (d) => ({ ...d, furniture: d.furniture.filter((i) => i.id !== id) }));
    if (expandedId === id) setExpandedId(null);
  }

  return (
    <div className="flex flex-col h-full">
      <ProjectDocHeader
        title="Furniture Inventory"
        subtitle={`${items.length} ${items.length === 1 ? 'item' : 'items'}${wishlistCount ? ` · ${wishlistCount} on wishlist` : ''}`}
      />

      <div className="px-4 py-2 border-b border-ios-gray-200 bg-white flex items-center gap-2">
        <button
          onClick={() => setWishlistOnly((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            wishlistOnly ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
          }`}
        >
          <HeartIcon filled={wishlistOnly} className="w-3.5 h-3.5" />
          Wishlist{wishlistCount > 0 ? ` ${wishlistCount}` : ''}
        </button>
        <button
          onClick={addRow}
          className="ml-auto px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 active:opacity-70"
        >
          + Add Item
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {shown.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-ios-gray-600 text-sm mb-4">
              {items.length === 0
                ? 'No furniture logged yet.'
                : 'Nothing on the wishlist yet.'}
            </p>
            {items.length === 0 && (
              <button
                onClick={addRow}
                className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
              >
                Add First Item
              </button>
            )}
          </div>
        ) : (
          shown.map((row) => {
            // Numbered by position in the full list, so filtering doesn't renumber.
            const number = items.indexOf(row) + 1;
            const open = expandedId === row.id;
            return (
              <Card key={row.id} className="overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className="w-7 flex-shrink-0 text-sm font-bold text-ios-gray-400 tabular-nums">
                    {number}
                  </span>
                  <button
                    onClick={() => setExpandedId(open ? null : row.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p className={`text-sm font-medium truncate ${row.item ? 'text-teal-900' : 'text-ios-gray-400'}`}>
                      {row.item || 'Untitled item'}
                    </p>
                    <p className="text-xs text-ios-gray-500 truncate">
                      {[dims(row), row.originLocation, row.destinationLocation].filter(Boolean).join(' · ') || 'Tap to fill in'}
                    </p>
                  </button>
                  <button
                    onClick={() => patch(row.id, { wishlist: !row.wishlist })}
                    className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                    aria-label={row.wishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-pressed={row.wishlist}
                  >
                    <HeartIcon
                      filled={row.wishlist}
                      className={`w-5 h-5 ${row.wishlist ? 'text-gray-900' : 'text-ios-gray-300'}`}
                    />
                  </button>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 text-ios-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>

                {open && (
                  <div className="border-t border-ios-gray-100 px-3 py-3 space-y-3">
                    <Field label="Item">
                      <input
                        type="text"
                        value={row.item}
                        onChange={(e) => patch(row.id, { item: e.target.value })}
                        placeholder="Dresser, sofa, dining table…"
                        className={INPUT}
                      />
                    </Field>

                    <div>
                      <label className={LABEL}>W · D · H</label>
                      <div className="flex items-center gap-2">
                        <input type="text" inputMode="decimal" value={row.width}
                          onChange={(e) => patch(row.id, { width: e.target.value })}
                          placeholder="W" className={`${INPUT} text-center`} />
                        <span className="text-ios-gray-400 text-sm flex-shrink-0">×</span>
                        <input type="text" inputMode="decimal" value={row.depth}
                          onChange={(e) => patch(row.id, { depth: e.target.value })}
                          placeholder="D" className={`${INPUT} text-center`} />
                        <span className="text-ios-gray-400 text-sm flex-shrink-0">×</span>
                        <input type="text" inputMode="decimal" value={row.height}
                          onChange={(e) => patch(row.id, { height: e.target.value })}
                          placeholder="H" className={`${INPUT} text-center`} />
                      </div>
                    </div>

                    <Field label="Origination Location">
                      <input type="text" value={row.originLocation}
                        onChange={(e) => patch(row.id, { originLocation: e.target.value })}
                        placeholder="Room it's coming from" className={INPUT} />
                    </Field>

                    <Field label="Destination Location">
                      <input type="text" value={row.destinationLocation}
                        onChange={(e) => patch(row.id, { destinationLocation: e.target.value })}
                        placeholder="Room it's going to" className={INPUT} />
                    </Field>

                    <Field label="Comments">
                      <textarea value={row.comments}
                        onChange={(e) => patch(row.id, { comments: e.target.value })}
                        rows={2} placeholder="Condition, handling notes…"
                        className={`${INPUT} resize-none`} />
                    </Field>

                    <button
                      onClick={() => removeRow(row.id)}
                      className="w-full py-2.5 text-xs font-semibold text-red-600 active:text-red-700"
                    >
                      Delete Item
                    </button>
                  </div>
                )}
              </Card>
            );
          })
        )}

        {shown.length > 0 && (
          <button
            onClick={addRow}
            className="w-full py-3 rounded-xl border border-dashed border-teal-300 text-teal-600 font-semibold text-sm min-h-[44px] active:bg-teal-50"
          >
            + Add Item
          </button>
        )}
      </div>
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

function dims(row: FurnitureItem): string {
  const parts = [row.width, row.depth, row.height].filter(Boolean);
  return parts.length > 0 ? parts.join('×') : '';
}

function HeartIcon({ filled, className = '' }: { filled: boolean; className?: string }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}
