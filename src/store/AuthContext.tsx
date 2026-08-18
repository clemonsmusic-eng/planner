import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isRemoteEnabled, authErrorMessage, type Profile } from '../lib/supabase';
import { RANK, type AccessLevel } from '../lib/access';

/**
 * Who is signed in, and the most they are allowed to be.
 *
 * Two things are deliberately kept apart here. The **ceiling** is the role on
 * the account — set by an admin, stored on the server, and not something the
 * browser can talk itself into. The **level** is what this device is currently
 * showing, which may be lower: handing a phone to a mover mid-job should be one
 * tap, not a sign-out. Coming back up asks for the account password, because at
 * that point the person holding the phone has changed.
 *
 * Where the app is built without Supabase it keeps working exactly as it did:
 * `ceiling` is admin, nothing asks for a password, and the level is whatever
 * the device last chose. That is what lets accounts arrive on the live site
 * without the site going down while they do.
 */

interface AuthValue {
  /** Whether this build has a server to sign in to at all. */
  remote: boolean;
  /** Still working out whether there is a session. Renders nothing over it. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** The most this account may be. Admin when there is no server. */
  ceiling: AccessLevel;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Confirm the account password without disturbing the session. */
  verifyPassword: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isRemoteEnabled);
  // Guards against a profile fetch that resolves after the user has signed out
  // again, which would otherwise put the old role back.
  const current = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    async function readProfile(userId: string) {
      const { data } = await supabase!
        .from('profiles')
        .select('id, email, full_name, role')
        .eq('id', userId)
        .maybeSingle();
      if (current.current !== userId) return;
      setProfile((data as Profile) ?? null);
    }

    supabase.auth.getSession().then(({ data }) => {
      current.current = data.session?.user.id ?? null;
      setSession(data.session);
      if (data.session) readProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      current.current = next?.user.id ?? null;
      setSession(next);
      if (next) readProfile(next.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return null;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? authErrorMessage(error) : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) return null;
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    return error ? authErrorMessage(error) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  /**
   * Re-check the password of whoever is already signed in.
   *
   * Signing in again with the same credentials is the check: it either returns
   * a session for the same account or an error, and because it is the same
   * account the session it replaces is equivalent to the one already held.
   */
  const verifyPassword = useCallback(
    async (password: string) => {
      const email = session?.user.email;
      if (!supabase || !email) return false;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return !error;
    },
    [session]
  );

  const value = useMemo<AuthValue>(
    () => ({
      remote: isRemoteEnabled,
      loading,
      session,
      profile,
      // No server means no account to read a role off, so the device keeps the
      // run of the place and its own picker decides what it shows.
      ceiling: isRemoteEnabled ? profile?.role ?? 'team' : 'admin',
      signIn,
      signUp,
      signOut,
      verifyPassword,
    }),
    [loading, session, profile, signIn, signUp, signOut, verifyPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}

/** Clamp a device's chosen level to what the account actually allows. */
export function clampToCeiling(level: AccessLevel, ceiling: AccessLevel): AccessLevel {
  return RANK[level] > RANK[ceiling] ? ceiling : level;
}
