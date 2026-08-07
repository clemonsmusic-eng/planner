import { AppProvider, useApp } from './store/AppContext';
import { MenuProvider } from './components/MenuContext';
import { AddShiftProvider } from './components/AddShiftContext';
import { Navigation } from './components/Navigation';
import { HamburgerMenu } from './components/HamburgerMenu';
import { HomePage } from './pages/HomePage';
import { ProjectListPage } from './pages/ProjectListPage';
import { InputFormPage } from './pages/InputFormPage';
import { PlanPage } from './pages/PlanPage';
import { SchedulePage } from './pages/SchedulePage';
import { ChecklistPage } from './pages/ChecklistPage';
import { SettingsPage } from './pages/SettingsPage';
import { CalendarPage } from './pages/CalendarPage';

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
    }
  })();

  return (
    <div className="flex flex-col min-h-screen bg-ios-gray-100">
      <HamburgerMenu />
      {/* Page area — leaves room for bottom nav */}
      <main
        className="flex-1 overflow-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 56px)' }}
      >
        <div className="h-full overflow-y-auto">{page}</div>
      </main>
      <Navigation />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <MenuProvider>
        <AddShiftProvider>
          <AppContent />
        </AddShiftProvider>
      </MenuProvider>
    </AppProvider>
  );
}
