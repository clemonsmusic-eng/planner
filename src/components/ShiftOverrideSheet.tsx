import { formatDateLabel } from '../lib/dateUtils';
import type { AvailabilitySlot } from '../types';

const OPTIONS: { value: AvailabilitySlot | null; label: string; desc: string }[] = [
  { value: null, label: 'Auto', desc: 'Use the calculated shift' },
  { value: 'AM', label: 'AM', desc: 'Morning shift' },
  { value: 'PM', label: 'PM', desc: 'Afternoon shift' },
  { value: 'Full Day', label: 'Full Day', desc: 'All day' },
  { value: 'Unavailable', label: 'Unavailable', desc: 'Block this date' },
];

export function ShiftOverrideSheet({
  date,
  current,
  onSelect,
  onClose,
}: {
  date: string;
  current: AvailabilitySlot | null;
  onSelect: (shift: AvailabilitySlot | null) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto bg-white rounded-t-3xl max-h-[70vh] flex flex-col">
        <div className="px-4 py-4 border-b border-ios-gray-200 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Override Shift</h2>
            <p className="text-xs text-ios-gray-500 truncate">{date ? formatDateLabel(date) : ''}</p>
          </div>
          <button onClick={onClose} className="text-teal-600 font-semibold flex-shrink-0">Done</button>
        </div>
        <div className="overflow-y-auto divide-y divide-ios-gray-100">
          {OPTIONS.map((opt) => {
            const active = (opt.value ?? null) === (current ?? null);
            return (
              <button
                key={opt.label}
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-4 py-3.5 min-h-[56px] active:bg-ios-gray-50"
              >
                <div className="text-left">
                  <span className={`text-base ${active ? 'text-teal-600 font-semibold' : 'text-teal-900'}`}>
                    {opt.label}
                  </span>
                  <p className="text-xs text-ios-gray-500">{opt.desc}</p>
                </div>
                {active && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-teal-600 flex-shrink-0">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <div className="h-3" />
      </div>
    </div>
  );
}
