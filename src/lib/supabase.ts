import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AccessLevel } from './access';

/**
 * The connection to Supabase, where there is one.
 *
 * Deliberately optional. The app was built to run with no server at all and
 * still does: a build without the two environment variables gets a null client
 * and falls back to the device-local access levels it has always used. That is
 * what lets accounts land on the live site in stages rather than as one
 * switch-over, and it is why every caller checks for null rather than assuming
 * a session.
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Whether this build talks to a server. */
export const isRemoteEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isRemoteEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The app is served from a sub-path and has no OAuth redirects to
        // catch, so there is nothing useful in the URL to detect.
        detectSessionInUrl: false,
        storageKey: 'st-planner-auth',
      },
    })
  : null;

/** A row of public.profiles — who someone is, and the most they may be. */
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AccessLevel;
}

/** A pending or accepted invitation, as the Team & Access screen lists them. */
export interface Invitation {
  email: string;
  role: AccessLevel;
  full_name: string;
  created_at: string;
  accepted_at: string | null;
}

/**
 * Supabase errors arrive with the database's wording, which is sometimes ours
 * — the sign-up trigger raises the "not been invited" message on purpose — and
 * sometimes a phrase nobody outside Postgres should have to read.
 */
export function authErrorMessage(error: { message: string } | null): string {
  if (!error) return '';
  const raw = error.message;
  // What an unreachable server looks like from fetch. Worth naming, because
  // this app gets used at job sites where the signal comes and goes and
  // "Failed to fetch" tells a mover nothing they can act on.
  if (/failed to fetch|network ?error|load failed/i.test(raw)) {
    return 'Cannot reach the server. Check your signal and try again.';
  }
  if (/not been invited/i.test(raw)) return 'That address has not been invited. Ask an admin to add you.';
  if (/invalid login credentials/i.test(raw)) return 'That email and password do not match.';
  if (/email not confirmed/i.test(raw)) return 'Check your inbox and confirm your address first.';
  if (/user already registered/i.test(raw)) return 'There is already an account for that address. Sign in instead.';
  if (/password should be at least/i.test(raw)) return 'Pick a password of at least six characters.';
  if (/database error saving new user/i.test(raw)) {
    // What Supabase says when the sign-up trigger raises. The real reason is
    // almost always the invitation check, so say that rather than the wrapper.
    return 'That address has not been invited. Ask an admin to add you.';
  }
  return raw;
}
