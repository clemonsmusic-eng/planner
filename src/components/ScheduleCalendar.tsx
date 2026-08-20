import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { parseDate } from '../lib/dateUtils';
import type { ScheduleDay } from '../types';

/**
 * The month calendar beside the Schedule list on the wide layout.
 *
 * The list answers "what is this shift", the calendar answers "when is it and
 * what else is that week" — a question the list can't answer without a lot of
 * scrolling. Dragging a shift onto a day is the shortest path between the two:
 * you can see the gap you want before you commit to it.
 */

/** What a drag is carrying: a whole day, or one shift on it. */
export interface DragPayload {
  date: string;
  phaseId?: string;
  label: string;
  /**
   * Which job the shift belongs to. The project calendar only ever shows one,
   * so it goes unset there; the main calendar shows every project at once and
   * a drop has to know whose schedule it is moving.
   */
  projectId?: string;
}

interface DragState {
  payload: DragPayload;
  x: number;
  y: number;
  over: string | null;
}

/**
 * Drag-to-re-date, on pointer events.
 *
 * Not HTML5 drag-and-drop: it never fires on iPad Safari, which is half of the
 * layout this feature exists for. Listeners go on the window rather than using
 * pointer capture because a re-render during the drag can replace the node the
 * gesture started on, and capture dies with it.
 */
export function useShiftDrag(enabled: boolean, onDrop: (payload: DragPayload, toDate: string) => void) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const pending = useRef<{ payload: DragPayload; x: number; y: number; active: boolean } | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  useEffect(() => {
    const dateUnder = (x: number, y: number): string | null =>
      document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-cal-date]')?.dataset.calDate ?? null;

    function onMove(e: PointerEvent) {
      const held = pending.current;
      if (!held) return;
      // A press only becomes a drag past a few pixels, so tapping a card to
      // collapse it still reads as a tap.
      if (!held.active) {
        if (Math.hypot(e.clientX - held.x, e.clientY - held.y) < 6) return;
        held.active = true;
      }
      e.preventDefault();
      setDrag({ payload: held.payload, x: e.clientX, y: e.clientY, over: dateUnder(e.clientX, e.clientY) });
    }

    function onUp(e: PointerEvent) {
      const held = pending.current;
      pending.current = null;
      if (held?.active) {
        const to = dateUnder(e.clientX, e.clientY);
        if (to && to !== held.payload.date) dropRef.current(held.payload, to);
      }
      setDrag(null);
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  /** Spread onto whatever should be grabbable. */
  const dragHandle = useCallback(
    (payload: DragPayload) =>
      enabled
        ? {
            onPointerDown: (e: React.PointerEvent) => {
              if (e.button !== 0) return;
              pending.current = { payload, x: e.clientX, y: e.clientY, active: false };
            },
            // Stops iPadOS scrolling the list out from under the gesture.
            style: { touchAction: 'none' as const, cursor: 'grab' as const },
          }
        : {},
    [enabled]
  );

  return { drag, dragHandle };
}

/** The pill that follows the pointer. Rendered by the page, above everything. */
export function DragGhost({ drag }: { drag: DragState | null }) {
  if (!drag) return null;
  return (
    <div
      className="fixed z-[70] pointer-events-none px-2.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold shadow-lg max-w-[220px] truncate"
      style={{ left: drag.x + 12, top: drag.y + 12 }}
    >
      {drag.payload.label}
      {drag.over && <span className="opacity-80"> → {format(parseDate(drag.over), 'MMM d')}</span>}
    </div>
  );
}

const WEEKDAYS_FULL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAYS_WORK = ['M', 'T', 'W', 'T', 'F'];

/** Saturday and Sunday, which the business doesn't normally work. */
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/**
 * Which visit a phase belongs to, and what happens on it.
 *
 * Phase names read "Second Visit: Initial Sort & Pack" — the visit on one side
 * of the colon, the work on the other. A month cell has room for both only if
 * the visit is cut down to its number, so "Second Visit" becomes "V2" and sits
 * against the work rather than replacing it. A phase with no visit prefix
 * — move day, the cleanout — is just its own name.
 */
const VISIT_NUMBERS: Record<string, string> = {
  first: '1', second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6',
};

function phaseParts(name: string): { visit: string | null; work: string } {
  const [head, ...rest] = name.split(':');
  if (rest.length === 0) return { visit: null, work: head.trim() };
  const ordinal = head.trim().split(/\s+/)[0].toLowerCase();
  const n = VISIT_NUMBERS[ordinal] ?? (/^\d+/.exec(ordinal)?.[0] ?? null);
  return { visit: n ? `V${n}` : head.trim(), work: rest.join(':').trim() };
}

export function ScheduleCalendar({
  days,
  activeDate,
  onPickDate,
  dropDate,
  dragging,
  disabled,
}: {
  days: ScheduleDay[];
  activeDate: string | null;
  onPickDate: (date: string) => void;
  dropDate: string | null;
  dragging: boolean;
  disabled: boolean;
}) {
  // Opens on the month the plan starts in, and follows the plan if it moves
  // wholesale — but not once the user has paged somewhere themselves.
  const anchor = days[0]?.date;
  const [month, setMonth] = useState(() => (anchor ? startOfMonth(parseDate(anchor)) : startOfMonth(new Date())));
  const seen = useRef(anchor);
  useEffect(() => {
    if (anchor && seen.current === undefined) setMonth(startOfMonth(parseDate(anchor)));
    seen.current = anchor;
  }, [anchor]);

  const byDate = new Map(days.map((d) => [d.date, d]));
  const allCells = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  });
  /*
   * Saturday and Sunday are dropped from the grid outright, so the five days
   * the business works get the width instead of spending a seventh of it on
   * two empty boxes. A weekend that carries a shift keeps its column — hiding
   * one would hide the shift on it — and since the filter takes whole rows out
   * of whole weeks the grid stays rectangular either way.
   */
  const worked = allCells.some((c) => isWeekend(c) && byDate.has(format(c, 'yyyy-MM-dd')));
  const cells = worked ? allCells : allCells.filter((c) => !isWeekend(c));
  const headings = worked ? WEEKDAYS_FULL : WEEKDAYS_WORK;

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 hover:bg-ios-gray-100"
          aria-label="Previous month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <h3 className="text-sm font-bold text-teal-900">{format(month, 'MMMM yyyy')}</h3>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 hover:bg-ios-gray-100"
          aria-label="Next month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className={`grid ${worked ? 'grid-cols-7' : 'grid-cols-5'} mb-1`}>
        {headings.map((d, i) => (
          <div
            key={i}
            className={`text-center text-[10px] font-semibold uppercase py-1 ${
              worked && (i === 0 || i === 6) ? 'text-ios-gray-400' : 'text-ios-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className={`grid ${worked ? 'grid-cols-7' : 'grid-cols-5'} gap-1`}>
        {cells.map((cell) => {
          const iso = format(cell, 'yyyy-MM-dd');
          const day = byDate.get(iso);
          const phases = day ? [...new Map(day.entries.map((e) => [e.phaseId, e])).values()] : [];
          const isDrop = dropDate === iso;
          const weekend = isWeekend(cell);

          return (
            <div
              key={iso}
              data-cal-date={iso}
              onClick={() => day && onPickDate(iso)}
              className={[
                'min-h-[62px] rounded-lg border p-1 flex flex-col gap-0.5 transition-colors',
                isSameMonth(cell, month) ? (weekend ? 'bg-ios-gray-50' : 'bg-white') : 'bg-ios-gray-50 opacity-60',
                isDrop
                  ? 'border-teal-500 ring-2 ring-teal-400 bg-teal-50'
                  : activeDate === iso
                  ? 'border-teal-400 bg-teal-50/60'
                  : 'border-ios-gray-200',
                day ? 'cursor-pointer' : dragging ? 'cursor-copy' : '',
              ].join(' ')}
            >
              <span
                className={`text-[10px] font-semibold leading-none ${
                  isToday(cell) ? 'text-white bg-teal-600 rounded-full px-1 py-0.5 self-start' : 'text-ios-gray-500'
                }`}
              >
                {format(cell, 'd')}
              </span>
              {phases.slice(0, 2).map((e) => {
                const { visit, work } = phaseParts(e.phaseName);
                return (
                  <span
                    key={e.phaseId}
                    className="flex items-center gap-0.5 text-[9px] leading-tight font-semibold px-1 py-0.5 rounded bg-teal-100 text-teal-800 min-w-0"
                    title={e.phaseName}
                  >
                    {visit && (
                      <span className="flex-shrink-0 px-1 rounded bg-teal-700 text-white tabular-nums">{visit}</span>
                    )}
                    <span className="truncate">{work}</span>
                  </span>
                );
              })}
              {phases.length > 2 && (
                <span className="text-[9px] text-ios-gray-500 px-1">+{phases.length - 2} more</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-ios-gray-500">
        {disabled
          ? 'The schedule is locked. Unlock it to move shifts.'
          : 'Drag a shift from the list onto a day to change its date. Nothing else about the shift changes.'}
      </p>
    </div>
  );
}
