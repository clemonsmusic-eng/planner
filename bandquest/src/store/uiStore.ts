import { create } from 'zustand';

// Lightweight UI/client-only preferences, persisted to localStorage.
const DEMO_KEY = 'bq_demo_mode';
const GUEST_KEY = 'bq_guest';

function loadDemo(): boolean {
  try { return localStorage.getItem(DEMO_KEY) === '1'; } catch { return false; }
}
function saveDemo(v: boolean) {
  try { localStorage.setItem(DEMO_KEY, v ? '1' : '0'); } catch { /* ignore */ }
}
function loadGuest(): boolean {
  try { return localStorage.getItem(GUEST_KEY) === '1'; } catch { return false; }
}
function saveGuestFlag(v: boolean) {
  try { localStorage.setItem(GUEST_KEY, v ? '1' : '0'); } catch { /* ignore */ }
}

interface UiState {
  // Demo Mode: resolve microphone performance challenges with a silent
  // tap-timing mini-game instead, so the whole game is playable with no
  // audible input. Aural/rhythm challenges (button/tap) are unaffected.
  demoMode: boolean;
  setDemoMode: (v: boolean) => void;
  toggleDemoMode: () => void;

  // Guest Mode: play with no account. The character lives in localStorage and
  // store mutations skip Supabase entirely.
  guest: boolean;
  setGuest: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  demoMode: loadDemo(),
  setDemoMode: (v) => { saveDemo(v); set({ demoMode: v }); },
  toggleDemoMode: () => { const v = !get().demoMode; saveDemo(v); set({ demoMode: v }); },

  guest: loadGuest(),
  setGuest: (v) => { saveGuestFlag(v); set({ guest: v }); },
}));
