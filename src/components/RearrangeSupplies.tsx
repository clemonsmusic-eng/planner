import { useEffect, useRef, useState } from 'react';
import type { SupplyItem } from '../types';

/**
 * Drag-to-rearrange for the master supply list.
 *
 * Built on pointer events rather than HTML5 drag-and-drop, which never fires on
 * iOS Safari — this has to work on a phone first.
 *
 * The list reorders live under the finger instead of showing a floating copy of
 * the row: the working array is held here while a drag is in flight and handed
 * back on release, so the store sees one write per drag rather than one per
 * pixel of movement.
 *
 * Order within the array *is* the display order, and an item's section is its
 * category, so a drag does both jobs at once — dropping a row under a different
 * heading recategorises it. Section headings drag too, which reorders the
 * category list and leaves the items alone.
 *
 * The move/up listeners go on the window rather than the grip handle. Pointer
 * capture would be the obvious choice, but reordering detaches and reinserts
 * the dragged row, and a captured element that leaves the DOM loses capture —
 * so the drop event never arrives and the reorder is never committed.
 */
export function RearrangeSupplies({
  supplies,
  categories,
  onCommit,
  onCommitCategories,
}: {
  supplies: SupplyItem[];
  categories: string[];
  onCommit: (next: SupplyItem[]) => void;
  onCommitCategories: (next: string[]) => void;
}) {
  // While dragging, this shadows the prop so the parent isn't re-rendered on
  // every move; null means "not dragging, show what was passed in".
  const [working, setWorking] = useState<SupplyItem[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  // A section drag reorders the category list; an item drag reorders the array.
  const [dragSection, setDragSection] = useState<string | null>(null);
  const [workingCats, setWorkingCats] = useState<string[] | null>(null);
  const workingCatsRef = useRef<string[] | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef<number | null>(null);
  // Whatever actually scrolls: an ancestor with its own overflow, or the page.
  const scrollTarget = useRef<HTMLElement | null>(null);
  // Read by the window listeners, which are bound once per drag and would
  // otherwise close over the array as it was when the drag started.
  const workingRef = useRef<SupplyItem[] | null>(null);

  const list = working ?? supplies;
  const shownCategories = workingCats ?? categories;

  function setWork(next: SupplyItem[] | null) {
    workingRef.current = next;
    setWorking(next);
  }

  function setWorkCats(next: string[] | null) {
    workingCatsRef.current = next;
    setWorkingCats(next);
  }

  function stopAutoScroll() {
    if (autoScroll.current !== null) {
      cancelAnimationFrame(autoScroll.current);
      autoScroll.current = null;
    }
  }

  /**
   * The element that actually moves when this list scrolls. The page layout is
   * min-h-screen, so nothing here clips and it's the document that scrolls —
   * but that's a layout detail, so find it rather than assume it.
   */
  function findScrollTarget(): HTMLElement {
    let el = scrollerRef.current?.parentElement ?? null;
    while (el) {
      const overflow = getComputedStyle(el).overflowY;
      if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight + 4) return el;
      el = el.parentElement;
    }
    return document.scrollingElement as HTMLElement;
  }

  /**
   * Nudge the view when the finger is held near an edge — with thirty-odd items
   * the drop target is usually off screen. The bottom inset clears the fixed
   * nav bar, which would otherwise swallow the last stretch of the drag.
   */
  function runAutoScroll(clientY: number) {
    stopAutoScroll();
    const scroller = scrollTarget.current;
    if (!scroller) return;

    const top = 90;
    const bottom = window.innerHeight - 110;
    const speed =
      clientY < top
        ? -Math.ceil((top - clientY) / 5)
        : clientY > bottom
        ? Math.ceil((clientY - bottom) / 5)
        : 0;
    if (speed === 0) return;

    const step = () => {
      scroller.scrollTop += speed;
      autoScroll.current = requestAnimationFrame(step);
    };
    autoScroll.current = requestAnimationFrame(step);
  }

  function moveTo(current: SupplyItem[], id: string, index: number, category: string): SupplyItem[] {
    const from = current.findIndex((s) => s.id === id);
    if (from < 0) return current;
    const next = [...current];
    const [row] = next.splice(from, 1);
    const at = from < index ? index - 1 : index;
    next.splice(at, 0, { ...row, category });
    return next;
  }

  useEffect(() => {
    if (!dragId && !dragSection) return;

    function onMove(e: PointerEvent) {
      e.preventDefault();
      runAutoScroll(e.clientY);

      const under = document.elementFromPoint(e.clientX, e.clientY);

      // ── Dragging a whole section ────────────────────────────────────────
      if (dragSection) {
        const sectionEl = under?.closest<HTMLElement>('[data-section]');
        if (!sectionEl) return;
        const over = sectionEl.dataset.section!;
        if (over === dragSection) return;
        const cats = workingCatsRef.current ?? categories;
        const from = cats.indexOf(dragSection);
        const to = cats.indexOf(over);
        if (from < 0 || to < 0) return;
        const next = [...cats];
        next.splice(from, 1);
        next.splice(to, 0, dragSection);
        setWorkCats(next);
        return;
      }

      // What's under the finger. Rows keep pointer-events on and no floating
      // copy is drawn, so this always lands on a real row or heading.
      const rowEl = under?.closest<HTMLElement>('[data-supply-id]');
      const headerEl = under?.closest<HTMLElement>('[data-category]');

      const current = workingRef.current ?? supplies;

      if (rowEl) {
        const overId = rowEl.dataset.supplyId!;
        if (overId === dragId) return;
        const overIndex = current.findIndex((s) => s.id === overId);
        if (overIndex < 0) return;
        // Past the midpoint means the row belongs after the one it's over.
        const box = rowEl.getBoundingClientRect();
        const after = e.clientY > box.top + box.height / 2;
        setWork(moveTo(current, dragId!, overIndex + (after ? 1 : 0), current[overIndex].category));
        return;
      }

      if (headerEl) {
        // Dropping on a heading puts the row at the top of that section, which
        // is the only way into a section that has no rows yet.
        const category = headerEl.dataset.category!;
        const first = current.findIndex((s) => s.category === category);
        setWork(moveTo(current, dragId!, first < 0 ? current.length : first, category));
      }
    }

    function onEnd() {
      stopAutoScroll();
      const finishedCats = workingCatsRef.current;
      if (finishedCats) onCommitCategories(finishedCats);
      const finished = workingRef.current;
      if (finished) onCommit(finished);
      setWorkCats(null);
      setWork(null);
      setDragId(null);
      setDragSection(null);
    }

    // passive:false so preventDefault actually suppresses the touch scroll.
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
      stopAutoScroll();
    };
  }, [dragId, dragSection]);

  return (
    <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-amber-900 leading-snug">
          Drag a row by its handle to reorder it, or onto another section's heading to move it
          there. Section handles drag whole sections.
        </p>
      </div>

      {shownCategories.map((category) => {
        const items = list.filter((s) => s.category === category);
        const sectionDragging = category === dragSection;
        return (
          <div
            key={category}
            data-section={category}
            className={`rounded-2xl shadow-sm border overflow-hidden transition-colors ${
              sectionDragging ? 'bg-teal-50 border-teal-300 opacity-90' : 'bg-white border-ios-gray-200'
            }`}
          >
            <div
              data-category={category}
              className="px-2 py-3 bg-ios-gray-50 border-b border-ios-gray-200 flex items-center gap-1"
            >
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  scrollTarget.current = findScrollTarget();
                  setDragSection(category);
                  setWorkCats(shownCategories);
                }}
                style={{ touchAction: 'none' }}
                className="w-10 h-10 -my-1 flex items-center justify-center text-ios-gray-400 flex-shrink-0 active:text-teal-600"
                aria-label={`Reorder ${category} section`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M7 4.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM7 10a1.25 1.25 0 11-2.5 0A1.25 1.25 0 017 10zm0 5.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM15.5 4.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM15.5 10a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm0 5.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z" />
                </svg>
              </button>
              <h2 className="font-bold text-teal-900 text-sm flex-1 min-w-0 truncate">{category}</h2>
              <span className="text-xs text-ios-gray-500 flex-shrink-0">{items.length}</span>
            </div>

            {items.length === 0 ? (
              <div data-category={category} className="px-4 py-6 text-center">
                <p className="text-xs text-ios-gray-400">Drop an item here</p>
              </div>
            ) : (
              items.map((row) => {
                const isDragging = row.id === dragId;
                return (
                  <div
                    key={row.id}
                    data-supply-id={row.id}
                    className={`flex items-center gap-3 px-3 py-3 border-b border-ios-gray-100 last:border-0 transition-colors ${
                      isDragging ? 'bg-teal-50 opacity-80' : 'bg-white'
                    }`}
                  >
                    <button
                      onPointerDown={(e) => {
                        e.preventDefault();
                        scrollTarget.current = findScrollTarget();
                        setDragId(row.id);
                        setWork(list);
                      }}
                      // Without this the browser claims the gesture and scrolls
                      // the page instead of dragging the row.
                      style={{ touchAction: 'none' }}
                      className="w-10 h-10 -my-1 flex items-center justify-center text-ios-gray-400 flex-shrink-0 active:text-teal-600"
                      aria-label={`Reorder ${row.name || 'item'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M7 4.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM7 10a1.25 1.25 0 11-2.5 0A1.25 1.25 0 017 10zm0 5.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM15.5 4.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zM15.5 10a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0zm0 5.5a1.25 1.25 0 11-2.5 0 1.25 1.25 0 012.5 0z" />
                      </svg>
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${row.name ? 'text-teal-900' : 'text-ios-gray-400'}`}>
                        {row.name || 'Untitled item'}
                        {row.unit ? <span className="text-ios-gray-500 font-normal"> · {row.unit}</span> : null}
                      </p>
                      <p className="text-xs text-ios-gray-500 truncate">
                        {row.consumable ? 'Consumable' : 'Equipment'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
