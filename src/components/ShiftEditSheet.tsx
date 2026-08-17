import { useState } from 'react';
import { formatDateLabel } from '../lib/dateUtils';
import { defaultStartFor } from '../lib/shiftStartTimes';

/**
 * The one window for changing a shift.
 *
 * Shift type, date and start time used to be three separate controls in the
 * day header — a clock, a calendar and, on the shift itself, a second calendar.
 * They are all answers to "when is this", so they are asked together here and
 * applied in one go.
 */

export interface ShiftEditValues {
  shift: 'AM' | 'PM' | 'Full Day';
  date: string;
  /** "HH:mm", or null to fall back to the Settings default for the slot. */
  startTime: string | null;
}

const SHIFTS: ('AM' | 'PM' | 'Full Day')[] = ['AM', 'PM', 'Full Day'];

/** "09:00" as "9:00 AM", for naming the default a blank field falls back to. */
function clockLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const suffix = h < 12 ? 'AM' : 'PM';
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function ShiftEditSheet({
  title,
  subtitle,
  initial,
  shiftTimes,
  onApply,
  onClose,
}: {
  title: string;
  subtitle?: string;
  initial: ShiftEditValues;
  shiftTimes: { am: string; pm: string };
  onApply: (values: ShiftEditValues) => void;
  onClose: () => void;
}) {
  const [shift, setShift] = useState(initial.shift);
  const [date, setDate] = useState(initial.date);
  const [startTime, setStartTime] = useState(initial.startTime ?? '');

  const fallback = defaultStartFor(shift, shiftTimes);

  function save() {
    onApply({
      shift,
      date: date || initial.date,
      // An empty field is not "no start", it is "whatever Settings says" — so
      // it clears the override rather than storing a blank one.
      startTime: startTime.trim() === '' ? null : startTime,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto lg:m-auto lg:max-w-lg lg:w-full bg-white rounded-t-3xl lg:rounded-3xl max-h-[85vh] flex flex-col">
        <div className="px-4 py-4 border-b border-ios-gray-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-teal-900">{title}</h2>
            <p className="text-xs text-ios-gray-500 truncate">{subtitle || formatDateLabel(initial.date)}</p>
          </div>
          <button onClick={onClose} className="text-ios-gray-500 font-semibold flex-shrink-0">Cancel</button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-2">
              Shift Type
            </label>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Shift type">
              {SHIFTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShift(s)}
                  aria-pressed={shift === s}
                  className={`min-h-[44px] rounded-xl border text-sm font-semibold ${
                    shift === s
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-ios-gray-300 bg-white text-teal-900'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="shift-edit-date"
              className="block text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-2"
            >
              Date
            </label>
            <input
              id="shift-edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900"
            />
            <p className="mt-1.5 text-xs text-ios-gray-500">
              Moving the shift keeps its crew, hours and notes.
            </p>
          </div>

          <div>
            <label
              htmlFor="shift-edit-time"
              className="block text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-2"
            >
              Specific Start Time
            </label>
            <div className="flex items-center gap-2">
              <input
                id="shift-edit-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900"
              />
              <button
                type="button"
                onClick={() => setStartTime('')}
                disabled={startTime === ''}
                className="min-h-[44px] px-3 rounded-xl border border-ios-gray-300 text-sm font-semibold text-ios-gray-600 disabled:opacity-40"
              >
                Default
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ios-gray-500">
              {startTime
                ? 'This shift only. Everything else keeps the Settings time.'
                : `Starts at ${clockLabel(fallback)}, the ${shift === 'PM' ? 'PM' : 'AM'} time from Settings.`}
            </p>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-ios-gray-200">
          <button
            onClick={save}
            className="w-full min-h-[48px] rounded-xl bg-teal-600 text-white font-semibold"
          >
            Save Shift
          </button>
        </div>
      </div>
    </div>
  );
}
