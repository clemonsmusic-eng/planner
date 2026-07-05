import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useGameStore } from './store/gameStore';
import { useUiStore } from './store/uiStore';

// Pages
import LandingPage from './pages/LandingPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import RoleSelectPage from './pages/RoleSelectPage';
import ClassSelectPage from './pages/ClassSelectPage';
import InstrumentSelectPage from './pages/InstrumentSelectPage';
import BootCampPage from './pages/BootCampPage';
import HubPage from './pages/HubPage';
import ZonePage from './pages/ZonePage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LibraryPage from './pages/LibraryPage';
import AlliesPage from './pages/AlliesPage';
import SimulatorPage from './pages/SimulatorPage';
import GearPage from './pages/GearPage';
import ShopPage from './pages/ShopPage';
import WorldMapPage from './pages/WorldMapPage';
import CustomizePage from './pages/CustomizePage';
import FingeringChartPage from './pages/FingeringChartPage';
import PartyPage from './pages/PartyPage';
import SideQuestsPage from './pages/SideQuestsPage';
import LoadingScreen from './components/LoadingScreen';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const guest = useUiStore((s) => s.guest);
  if (loading) return <LoadingScreen />;
  if (!user && !guest) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireCharacter({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthStore();
  const { character, loading: gameLoading } = useGameStore();
  const guest = useUiStore((s) => s.guest);

  if (authLoading || gameLoading) return <LoadingScreen />;
  if (!user && !guest) return <Navigate to="/" replace />;
  if (!character) return <Navigate to={guest ? '/instrument-select' : '/class-select'} replace />;
  if (character.suspended) return <SuspendedScreen />;
  if (!character.bootCampComplete) return <Navigate to="/boot-camp" replace />;
  return <>{children}</>;
}

function SuspendedScreen() {
  const { signOut } = useAuthStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">⏸</div>
      <h1 className="fantasy-title text-2xl text-academy-gold mb-3">Account Paused</h1>
      <p className="text-academy-cream/60 text-sm max-w-sm mb-6">
        Your band director has temporarily paused your account. Please check with your
        teacher to have it reinstated.
      </p>
      <button onClick={signOut} className="btn-secondary text-sm">Sign out</button>
    </div>
  );
}

export default function App() {
  const { setSession, loadProfile, setLoading } = useAuthStore();
  const { loadCharacter, loadGuestCharacter } = useGameStore();

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user).then(() => {
          loadCharacter(session.user.id).finally(() => setLoading(false));
        });
      } else {
        // No session — restore a guest character from localStorage if present.
        if (useUiStore.getState().guest) loadGuestCharacter();
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await loadProfile(session.user);
          await loadCharacter(session.user.id);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setSession, loadProfile, setLoading, loadCharacter, loadGuestCharacter]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />

      {/* Auth required, no character needed */}
      <Route path="/role-select" element={
        <RequireAuth><RoleSelectPage /></RequireAuth>
      } />
      <Route path="/class-select" element={
        <RequireAuth><ClassSelectPage /></RequireAuth>
      } />
      <Route path="/instrument-select" element={
        <RequireAuth><InstrumentSelectPage /></RequireAuth>
      } />
      <Route path="/boot-camp" element={
        <RequireAuth><BootCampPage /></RequireAuth>
      } />

      {/* Full game — requires character + boot camp complete */}
      <Route path="/hub" element={
        <RequireCharacter><HubPage /></RequireCharacter>
      } />
      <Route path="/zone/:zoneId" element={
        <RequireCharacter><ZonePage /></RequireCharacter>
      } />

      {/* Teacher */}
      <Route path="/dashboard" element={
        <RequireAuth><TeacherDashboardPage /></RequireAuth>
      } />

      {/* Leaderboard */}
      <Route path="/leaderboard" element={
        <RequireCharacter><LeaderboardPage /></RequireCharacter>
      } />

      {/* Library */}
      <Route path="/library" element={
        <RequireCharacter><LibraryPage /></RequireCharacter>
      } />

      {/* Symphony Allies */}
      <Route path="/allies" element={
        <RequireCharacter><AlliesPage /></RequireCharacter>
      } />

      {/* Battle Simulator */}
      <Route path="/simulator" element={
        <RequireCharacter><SimulatorPage /></RequireCharacter>
      } />

      {/* Equipment / Gear */}
      <Route path="/party" element={
        <RequireCharacter><PartyPage /></RequireCharacter>
      } />

      <Route path="/gear" element={
        <RequireCharacter><GearPage /></RequireCharacter>
      } />

      {/* Side Quests */}
      <Route path="/quests" element={
        <RequireCharacter><SideQuestsPage /></RequireCharacter>
      } />

      {/* Gear Shop */}
      <Route path="/shop" element={
        <RequireCharacter><ShopPage /></RequireCharacter>
      } />

      {/* World Map */}
      <Route path="/world" element={
        <RequireCharacter><WorldMapPage /></RequireCharacter>
      } />

      {/* Fingering Charts */}
      <Route path="/fingering" element={
        <RequireCharacter><FingeringChartPage /></RequireCharacter>
      } />

      {/* Avatar customization — available to both teachers and students */}
      <Route path="/customize" element={
        <RequireAuth><CustomizePage /></RequireAuth>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
