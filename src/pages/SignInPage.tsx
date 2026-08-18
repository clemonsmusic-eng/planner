import { useState } from 'react';
import { useAuth } from '../store/AuthContext';

/**
 * The gate, shown in place of the app when nobody is signed in.
 *
 * It carries a sign-up form as well as a sign-in one, but signing up is not
 * open: the database rejects an address nobody has invited. The form is here
 * so an invited person can set their own password rather than being handed one
 * — the invitation decides *whether* you get in and *as what*, the form only
 * decides your password.
 */
export function SignInPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const problem =
      mode === 'in' ? await signIn(email, password) : await signUp(email, password, fullName);
    setBusy(false);
    if (problem) { setError(problem); return; }
    if (mode === 'up') {
      // Whether a confirmation mail is needed depends on the project's setting,
      // so this covers both: it is true either way that the next step is to
      // sign in, and harmless to say so when they already are.
      setNotice('Account created. Check your inbox if it asks you to confirm, then sign in.');
      setMode('in');
      setPassword('');
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-ios-gray-100 px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-600">Smooth Transitions</p>
          <h1 className="text-2xl font-bold text-teal-900 mt-1">Move Planner</h1>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-ios-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-ios-gray-100 rounded-xl">
            {([['in', 'Sign In'], ['up', 'Set Up Account']] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); setNotice(''); }}
                aria-pressed={mode === m}
                className={`min-h-[38px] rounded-lg text-sm font-semibold ${
                  mode === m ? 'bg-white text-teal-800 shadow-sm' : 'text-ios-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'up' && (
            <div>
              <label htmlFor="auth-name" className="block text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-1.5">
                Your Name
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base text-teal-900"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-1.5">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base text-teal-900"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-1.5">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base text-teal-900"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          {notice && (
            <p role="status" className="text-sm text-teal-700 bg-teal-50 rounded-lg px-3 py-2">{notice}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full min-h-[48px] rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50"
          >
            {busy ? 'Working…' : mode === 'in' ? 'Sign In' : 'Create Account'}
          </button>

          {mode === 'up' && (
            <p className="text-xs text-ios-gray-500 leading-snug">
              Accounts are by invitation. If an admin has not added your address yet, this will
              tell you so — ask them to add you and try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
