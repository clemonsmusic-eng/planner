import { useCallback, useEffect, useState } from 'react';
import { supabase, type Invitation, type Profile } from '../lib/supabase';
import { useAuth } from '../store/AuthContext';
import { ACCESS_LEVELS, ACCESS_LABELS, type AccessLevel } from '../lib/access';

/**
 * The accounts panel: who has one, and who has been invited to make one.
 *
 * Inviting does not send anything — there is no server-side mail here, and an
 * edge function holding a service key would be a lot of machinery for a team
 * of ten. What an invitation does is open the door: the row is what lets that
 * address complete a sign-up at all, and it carries the level the account
 * lands on. Telling the person to go and sign up is a message the admin sends
 * however they normally would.
 */
export function AccountsPanel() {
  const { profile } = useAuth();
  const [people, setPeople] = useState<Profile[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AccessLevel>('team');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const [a, b] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, role').order('full_name'),
      supabase.from('invitations').select('email, role, full_name, created_at, accepted_at').order('created_at'),
    ]);
    setPeople((a.data as Profile[]) ?? []);
    setInvites((b.data as Invitation[]) ?? []);
    setError(a.error?.message ?? b.error?.message ?? '');
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.from('invitations').insert({
      email: email.trim().toLowerCase(),
      full_name: name.trim(),
      role,
      invited_by: profile?.id ?? null,
    });
    setBusy(false);
    if (err) {
      setError(/duplicate key/i.test(err.message) ? 'That address has already been invited.' : err.message);
      return;
    }
    setEmail('');
    setName('');
    setRole('team');
    void refresh();
  }

  async function setPersonRole(id: string, next: AccessLevel) {
    if (!supabase) return;
    const { error: err } = await supabase.from('profiles').update({ role: next }).eq('id', id);
    if (err) { setError(err.message); return; }
    void refresh();
  }

  async function revoke(inviteEmail: string) {
    if (!supabase) return;
    const { error: err } = await supabase.from('invitations').delete().eq('email', inviteEmail);
    if (err) { setError(err.message); return; }
    void refresh();
  }

  const pending = invites.filter((i) => !i.accepted_at);

  return (
    <div className="px-4 py-3 space-y-5">
      <form onSubmit={invite} className="space-y-2.5">
        <p className="text-xs text-ios-gray-500 leading-snug">
          Adding an address lets that person create an account at the sign-in screen and sets the
          level they land on. Nothing is emailed — tell them to go and sign up.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            aria-label="Email to invite"
            autoCapitalize="none"
            autoCorrect="off"
            className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            aria-label="Name of the person being invited"
            className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AccessLevel)}
            aria-label="Level for the invited account"
            className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 text-base text-teal-900"
          >
            {ACCESS_LEVELS.map((l) => (
              <option key={l.level} value={l.level}>{l.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="px-5 min-h-[44px] rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-50"
          >
            Invite
          </button>
        </div>
      </form>

      {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {loading && <p className="text-sm text-ios-gray-500">Loading…</p>}

      {pending.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-2">
            Invited, not signed up yet
          </h4>
          <div className="space-y-1.5">
            {pending.map((i) => (
              <div key={i.email} className="flex items-center gap-2 rounded-xl border border-dashed border-ios-gray-300 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-teal-900 truncate">{i.full_name || i.email}</p>
                  {i.full_name && <p className="text-xs text-ios-gray-500 truncate">{i.email}</p>}
                </div>
                <span className="text-xs text-ios-gray-600 flex-shrink-0">{ACCESS_LABELS[i.role]}</span>
                <button
                  onClick={() => revoke(i.email)}
                  className="text-xs font-semibold text-red-600 px-2 py-1 flex-shrink-0"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ios-gray-500 mb-2">Accounts</h4>
        <div className="space-y-1.5">
          {people.map((person) => (
            <div key={person.id} className="flex items-center gap-2 rounded-xl border border-ios-gray-200 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-teal-900 truncate">
                  {person.full_name || person.email}
                  {person.id === profile?.id && <span className="text-ios-gray-500 font-normal"> · you</span>}
                </p>
                <p className="text-xs text-ios-gray-500 truncate">{person.email}</p>
              </div>
              <select
                value={person.role}
                onChange={(e) => setPersonRole(person.id, e.target.value as AccessLevel)}
                aria-label={`Level for ${person.full_name || person.email}`}
                className="min-h-[38px] rounded-lg border border-ios-gray-300 bg-white px-2 text-sm text-teal-900 flex-shrink-0"
              >
                {ACCESS_LEVELS.map((l) => (
                  <option key={l.level} value={l.level}>{l.label}</option>
                ))}
              </select>
            </div>
          ))}
          {!loading && people.length === 0 && (
            <p className="text-sm text-ios-gray-500">No accounts yet.</p>
          )}
        </div>
        <p className="text-[11px] text-ios-gray-500 leading-snug mt-2">
          A level here is the most that account can reach. Someone can still work at a lower one on
          a given device — that is the picker on the home screen, and it does not change this.
          Demoting yourself is allowed and takes effect at once, so leave at least one other admin.
        </p>
      </div>
    </div>
  );
}
