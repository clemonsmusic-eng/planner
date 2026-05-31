import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AppUser, UserRole, Appearance } from '../types/game';
import { normalizeAppearance } from '../lib/appearance';

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null; needsConfirm: boolean }>;
  signOut: () => Promise<void>;
  loadProfile: (supabaseUser: User) => Promise<void>;
  saveAppearance: (appearance: Appearance) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,

  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          hd: '*',  // allow any Google Workspace domain
        },
      },
    });
  },

  signInWithMagicLink: async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  },

  signInWithPassword: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUpWithPassword: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { error: error.message, needsConfirm: false };
    // If email confirmation is on, there's a user but no session yet.
    const needsConfirm = !data.session && !!data.user;
    return { error: null, needsConfirm };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  loadProfile: async (supabaseUser: User) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (profile) {
      set({
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email ?? '',
          role: profile.role as UserRole,
          displayName: profile.display_name,
          appearance: normalizeAppearance(profile.appearance),
        },
      });
    } else {
      // First sign-in — profile will be created on the role-selection screen
      set({
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email ?? '',
          role: 'student',  // default; user will choose
          displayName: supabaseUser.user_metadata?.full_name ?? supabaseUser.email ?? 'Musician',
          appearance: normalizeAppearance(null),
        },
      });
    }
  },

  saveAppearance: async (appearance: Appearance) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, appearance } });
    await supabase
      .from('profiles')
      .update({ appearance })
      .eq('id', user.id);
  },
}));
