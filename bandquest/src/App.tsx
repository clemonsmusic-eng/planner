import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { useGameStore } from './store/gameStore';

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
import LoadingScreen from './components/LoadingScreen';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireCharacter({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthStore();
  const { character, loading: gameLoading } = useGameStore();

  if (authLoading || gameLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (!character) return <Navigate to="/class-select" replace />;
  if (!character.bootCampComplete) return <Navigate to="/boot-camp" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setSession, loadProfile, setLoading } = useAuthStore();
  const { loadCharacter } = useGameStore();

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user).then(() => {
          loadCharacter(session.user.id).finally(() => setLoading(false));
        });
      } else {
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
  }, [setSession, loadProfile, setLoading, loadCharacter]);

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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
