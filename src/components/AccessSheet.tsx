import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { ACCESS_LEVELS, RANK, isStepUp, type AccessLevel } from '../lib/access';

/**
 * Choosing the level this device works at.
 *
 * Stepping *down* is always allowed — handing a phone to a mover should never
 * need a code. Stepping up asks for that level's passcode, which is what stops
 * the level being a suggestion. The passcodes themselves are changed in
 * Settings, behind the level they protect.
 */
export function AccessSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const { level, passcodes } = state.access;

  const [pending, setPending] = useState<AccessLevel | null>(null);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);

  function choose(next: AccessLevel) {
    if (next === level) return onClose();
    if (isStepUp(level, next)) {
      setPending(next);
      setEntry('');
      setError(null);
      return;
    }
    dispatch({ type: 'SET_ACCESS', access: { level: next, passcodes } });
    onClose();
  }

  function confirm() {
    if (!pending || pending === 'team') return;
    if (entry.trim() !== passcodes[pending]) {
      setError('That passcode does not match.');
      return;
    }
    dispatch({ type: 'SET_ACCESS', access: { level: pending, passcodes } });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+68px)] lg:pb-[calc(env(safe-area-inset-bottom)+20px)] max-h-[85vh] overflow-y-auto"
      >
        <h3 className="font-bold text-teal-900 mb-1">Access Level</h3>
        <p className="text-xs text-ios-gray-500 mb-4">
          Sets what this device can reach. It is remembered here until it is changed.
        </p>

        {pending ? (
          <div className="space-y-3">
            <p className="text-sm text-teal-900">
              Enter the passcode for {ACCESS_LEVELS.find((l) => l.level === pending)?.label}.
            </p>
            <input
              type="password"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              value={entry}
              onChange={(e) => { setEntry(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && confirm()}
              aria-label="Passcode"
              className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setPending(null)}
                className="flex-1 py-3 rounded-xl border border-ios-gray-300 text-ios-gray-600 font-semibold"
              >
                Back
              </button>
              <button
                onClick={confirm}
                className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold"
              >
                Unlock
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {ACCESS_LEVELS.map((option) => (
                <button
                  key={option.level}
                  onClick={() => choose(option.level)}
                  className={`w-full text-left rounded-xl border px-4 py-3 ${
                    option.level === level
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-ios-gray-200 active:bg-ios-gray-50 lg:hover:bg-ios-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-teal-900">{option.label}</span>
                    {option.level === level && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-600 text-white">
                        Current
                      </span>
                    )}
                    {RANK[option.level] > RANK[level] && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-ios-gray-400 ml-auto">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-ios-gray-600 mt-0.5">{option.blurb}</p>
                </button>
              ))}
            </div>

            {/*
              Said plainly rather than implied: this is a working mode on a
              shared device, not a login. The data is in this browser.
            */}
            <p className="text-[11px] text-ios-gray-500 mt-4 leading-snug">
              Levels control what this app shows. They are not a login — project data is stored in
              this browser and someone determined can still reach it. Passcodes are changed in
              Settings.
            </p>
          </>
        )}
      </div>
    </>
  );
}
