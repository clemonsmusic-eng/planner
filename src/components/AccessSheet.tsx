import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { ACCESS_LEVELS, type AccessLevel } from '../lib/access';

/**
 * Choosing the level this device works at.
 *
 * Stepping *down* is always allowed — handing a phone to a mover should never
 * need a code. Stepping up asks for the passcode when an admin has set one,
 * which is what stops the level being a suggestion. Setting the passcode is
 * itself an admin action, so it lives behind the level it protects.
 */
export function AccessSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp();
  const { level, passcode } = state.access;

  const [pending, setPending] = useState<AccessLevel | null>(null);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState('');
  const [codeSaved, setCodeSaved] = useState(false);

  const RANK: Record<AccessLevel, number> = { team: 0, pm: 1, admin: 2 };

  function choose(next: AccessLevel) {
    if (next === level) return onClose();
    const steppingUp = RANK[next] > RANK[level];
    if (steppingUp && passcode) {
      setPending(next);
      setEntry('');
      setError(null);
      return;
    }
    dispatch({ type: 'SET_ACCESS', access: { level: next, passcode } });
    onClose();
  }

  function confirm() {
    if (!pending) return;
    if (entry !== passcode) {
      setError('That passcode does not match.');
      return;
    }
    dispatch({ type: 'SET_ACCESS', access: { level: pending, passcode } });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl px-4 py-5 max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <h3 className="font-bold text-teal-900 mb-1">Access Level</h3>
        <p className="text-xs text-ios-gray-500 mb-4">
          Sets what this device can reach. It is remembered here until it is changed.
        </p>

        {pending ? (
          <div className="space-y-3">
            <p className="text-sm text-teal-900">
              Enter the passcode to switch to {ACCESS_LEVELS.find((l) => l.level === pending)?.label}.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
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
                    {RANK[option.level] > RANK[level] && passcode && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-ios-gray-400 ml-auto">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-ios-gray-600 mt-0.5">{option.blurb}</p>
                </button>
              ))}
            </div>

            {level === 'admin' && (
              <div className="mt-5 pt-4 border-t border-ios-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-1.5">
                  Passcode
                </p>
                <p className="text-xs text-ios-gray-600 mb-2">
                  {passcode
                    ? 'Set. Stepping up from Team Member asks for it.'
                    : 'Not set, so anyone on this device can switch to Admin.'}
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    inputMode="numeric"
                    value={newCode}
                    onChange={(e) => { setNewCode(e.target.value); setCodeSaved(false); }}
                    placeholder={passcode ? 'New passcode' : 'Set a passcode'}
                    aria-label="Set passcode"
                    className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
                  />
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_ACCESS', access: { level, passcode: newCode.trim() } });
                      setNewCode('');
                      setCodeSaved(true);
                    }}
                    className="px-4 rounded-xl bg-teal-600 text-white font-semibold text-sm min-h-[44px]"
                  >
                    Save
                  </button>
                </div>
                {codeSaved && <p className="text-xs text-teal-700 mt-1.5">Passcode updated.</p>}
                {passcode && (
                  <button
                    onClick={() => {
                      dispatch({ type: 'SET_ACCESS', access: { level, passcode: '' } });
                      setCodeSaved(false);
                    }}
                    className="text-xs text-ios-gray-500 mt-2"
                  >
                    Remove passcode
                  </button>
                )}
                {/*
                  Said plainly rather than implied: this is a working mode on a
                  shared device, not a login. The data is in this browser.
                */}
                <p className="text-[11px] text-ios-gray-500 mt-3 leading-snug">
                  Levels control what this app shows. They are not a login — project data is stored
                  in this browser and someone determined can still reach it.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
