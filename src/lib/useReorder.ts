import { useEffect, useRef, useState } from 'react';

/**
 * Drag-to-reorder for a list of rows.
 *
 * Pointer events rather than HTML5 drag-and-drop, which never fires on iOS
 * Safari. Listeners go on the window rather than using pointer capture: the
 * list re-renders on every position change, which replaces the node the
 * gesture started on and takes the capture with it.
 *
 * Rows identify themselves with `data-reorder` (the scope) and
 * `data-reorder-index`, so several independent lists can be on one page
 * without a drag in one reaching into another.
 */
export function useReorder<T>(items: T[], onReorder: (next: T[]) => void, scope: string) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // The reducer sees each move as it happens, but React state is a render
  // behind during a fast drag, so the live order is tracked here too.
  const live = useRef<{ items: T[]; index: number } | null>(null);

  useEffect(() => {
    if (dragIndex === null) return;

    function onMove(e: PointerEvent) {
      e.preventDefault();
      const row = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>(`[data-reorder="${CSS.escape(scope)}"]`);
      if (!row) return;
      const over = Number(row.dataset.reorderIndex);
      const current = live.current ?? { items, index: dragIndex! };
      if (!Number.isInteger(over) || over === current.index) return;

      // Past the midpoint counts as the far side, so a row can be dropped
      // below the last one rather than only ever landing above it.
      const box = row.getBoundingClientRect();
      let to = over + (e.clientY > box.top + box.height / 2 ? 1 : 0);
      if (current.index < to) to -= 1;
      if (to < 0 || to >= current.items.length || to === current.index) return;

      const next = [...current.items];
      const [moved] = next.splice(current.index, 1);
      next.splice(to, 0, moved);
      live.current = { items: next, index: to };
      setDragIndex(to);
      onReorder(next);
    }

    function onEnd() {
      live.current = null;
      setDragIndex(null);
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [dragIndex, items, onReorder, scope]);

  return {
    dragIndex,
    /** Spread onto each row so a drag can find it. */
    rowProps: (index: number) => ({
      'data-reorder': scope,
      'data-reorder-index': index,
    }),
    /** Spread onto the grip inside each row. */
    handleProps: (index: number) => ({
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        live.current = { items, index };
        setDragIndex(index);
      },
      // Stops iPadOS scrolling the page out from under the gesture.
      style: { touchAction: 'none' as const, cursor: 'grab' as const },
    }),
  };
}

/** The grip mark, so every reorderable list looks the same. */
export const GRIP_PATH =
  'M7 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM7 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 10a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM16 16a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z';
