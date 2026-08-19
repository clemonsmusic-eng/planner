/**
 * Turning what the database said into something a person can act on.
 *
 * Supabase rejects a request with a plain object — `{ message, details, hint,
 * code }` — not an Error, so anything that reached for `.message` or fell back
 * to `String(e)` printed "[object Object]" and told nobody anything. Worse, the
 * few failures that actually happen here have specific, fixable causes, and
 * the raw wording names none of them.
 */

interface Postgrestish {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
}

const text = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '');

/** Everything the failure said, for the line under the headline. */
export function errorDetail(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object') {
    const p = e as Postgrestish;
    const parts = [text(p.message), text(p.details), text(p.hint)].filter(Boolean);
    const code = text(p.code);
    if (parts.length > 0) return code ? `${parts.join(' — ')} (${code})` : parts.join(' — ');
    if (code) return `Database error ${code}`;
    try {
      return JSON.stringify(e);
    } catch {
      return 'Unknown error';
    }
  }
  return String(e ?? 'Unknown error');
}

/**
 * The headline: what to do about it, where that is knowable.
 *
 * Only the causes that actually come up. Everything else falls through to the
 * database's own wording, which is at least true even when it is unfriendly.
 */
export function errorSummary(e: unknown): string {
  const raw = errorDetail(e);

  // The tables are not there. Overwhelmingly the first-run failure: accounts
  // were set up from 0001 and the second migration never got run.
  if (/PGRST205/.test(raw) || /could not find the table/i.test(raw) || /does not exist/i.test(raw)) {
    return 'The database tables are missing. Run migration 0002_shared_data.sql in the Supabase SQL editor, then try again.';
  }
  // A column the app writes is not on the table — a half-run or edited migration.
  if (/PGRST204/.test(raw) || /could not find the .* column/i.test(raw)) {
    return 'A column the app expects is missing. The schema migration may have run only partly — re-run 0002_shared_data.sql.';
  }
  if (/row-level security|violates row-level/i.test(raw)) {
    return 'The database refused the write. Your account may not have the level for it — an admin can check under Accounts.';
  }
  if (/permission denied|42501/i.test(raw)) {
    return 'The database refused access to a table. Check that 0002_shared_data.sql ran in full.';
  }
  if (/JWT|token is expired|invalid claim/i.test(raw)) {
    return 'The sign-in has expired. Sign out and back in.';
  }
  if (/failed to fetch|network|load failed/i.test(raw)) {
    return 'Cannot reach the server. Check your signal and try again.';
  }
  return raw;
}
