import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AppUser, UserRole } from '../types/game';

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loadProfile: (supabaseUser: User) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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
        },
      });
    }
  },
}));
