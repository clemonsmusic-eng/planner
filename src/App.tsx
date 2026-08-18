import { AppProvider, useApp } from './store/AppContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { SignInPage } from './pages/SignInPage';
import { MenuProvider } from './components/MenuContext';
import { AddShiftProvider } from './components/AddShiftContext';
import { ProjectDocsProvider } from './components/ProjectDocsContext';
import { Navigation } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { HamburgerMenu } from './components/HamburgerMenu';
import { HomePage } from './pages/HomePage';
import { ProjectListPage } from './pages/ProjectListPage';
import { InputFormPage } from './pages/InputFormPage';
import { PlanPage } from './pages/PlanPage';
import { SchedulePage } from './pages/SchedulePage';
import { ChecklistPage } from './pages/ChecklistPage';
import { SettingsPage } from './pages/SettingsPage';
import { CalendarPage } from './pages/CalendarPage';
import { FurnitureInventoryPage } from './pages/FurnitureInventoryPage';
import { FloorPlansPage } from './pages/FloorPlansPage';
import { PhotosPage } from './pages/PhotosPage';
import { SupplyInventoryPage } from './pages/SupplyInventoryPage';
import { ProjectSuppliesPage } from './pages/ProjectSuppliesPage';
import { CrmPage } from './pages/CrmPage';

function AppContent() {
  const { state } = useApp();

  const page = (() => {
    switch (state.activeTab) {
      case 'home':      return <HomePage />;
      case 'projects':  return <ProjectListPage />;
      case 'inputs':    return <InputFormPage />;
      case 'plan':      return <PlanPage />;
      case 'schedule':  return <SchedulePage />;
      case 'checklist': return <ChecklistPage />;
      case 'settings':  return <SettingsPage />;
      case 'calendar':  return <CalendarPage />;
      case 'crm':       return <CrmPage />;
      case 'furniture': return <FurnitureInventoryPage />;
      case 'floorplans':return <FloorPlansPage />;
      case 'photos':    return <PhotosPage />;
      case 'supplies':  return <SupplyInventoryPage />;
      case 'project-supplies': return <ProjectSuppliesPage />;
    }
  })();

  /*
   * A bounded shell, not a growing one. With `min-h-screen` the wrapper grew to
   * fit its content, so `main`'s `overflow-hidden` clipped nothing, the pages'
   * own scroll containers never got a height to scroll within, and the document
   * scrolled instead — which took every page's sticky header off the top of the
   * screen with it. `dvh` rather than `vh` so a phone's collapsing address bar
   * doesn't leave the last row under the browser chrome.
   */
  return (
    <div className="flex flex-col h-screen h-[100dvh] overflow-hidden bg-ios-gray-100 lg:pl-64">
      <HamburgerMenu />
      <Sidebar />
      {/*
        Page area. On a phone it leaves room for the bottom bar; on desktop the
        bar is gone, so the padding goes with it and the sidebar takes its space
        from the wrapper's left padding instead.
      */}
      <main className="flex-1 overflow-hidden pb-[calc(env(safe-area-inset-bottom)+56px)] lg:pb-0">
        <div className="h-full overflow-y-auto">
          {/*
            Capped and centred so a page written for a 390px phone doesn't
            stretch a form field across a 27" monitor.
          */}
          <div className="h-full lg:max-w-6xl lg:mx-auto">{page}</div>
        </div>
      </main>
      <Navigation />
    </div>
  );
}

/**
 * The gate, where there is one.
 *
 * A build with no Supabase configured has nothing to sign in to and drops
 * straight through — the app runs on the device as it always has. A build that
 * does talk to a server waits for the session check before deciding, so a
 * signed-in user never sees the sign-in form flash past on a reload.
 */
function Gate({ children }: { children: React.ReactNode }) {
  const { remote, loading, session } = useAuth();
  if (!remote) return <>{children}</>;
  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-ios-gray-100">
        <span className="sr-only">Signing in…</span>
        <div className="w-8 h-8 rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin" />
      </div>
    );
  }
  return session ? <>{children}</> : <SignInPage />;
}

export function App() {
  return (
    <AuthProvider>
      <Gate>
        <AppProvider>
          <MenuProvider>
            <AddShiftProvider>
              <ProjectDocsProvider>
                <AppContent />
              </ProjectDocsProvider>
            </AddShiftProvider>
          </MenuProvider>
        </AppProvider>
      </Gate>
    </AuthProvider>
  );
}
