import { AppProvider, useApp } from './store/AppContext';
import { MenuProvider } from './components/MenuContext';
import { Navigation } from './components/Navigation';
import { HamburgerMenu } from './components/HamburgerMenu';
import { InputFormPage } from './pages/InputFormPage';
import { PlanPage } from './pages/PlanPage';
import { SchedulePage } from './pages/SchedulePage';
import { SettingsPage } from './pages/SettingsPage';
import { CalendarPage } from './pages/CalendarPage';
import { ChecklistPage } from './pages/ChecklistPage';

function AppContent() {
  const { state } = useApp();

  const page = (() => {
    switch (state.activeTab) {
      case 'projects':  return <InputFormPage />;
      case 'inputs':    return <InputFormPage />;
      case 'plan':      return <PlanPage />;
      case 'schedule':  return <SchedulePage />;
      case 'settings':  return <SettingsPage />;
      case 'calendar':  return <CalendarPage />;
      case 'checklist': return <ChecklistPage />;
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
        <AppContent />
      </MenuProvider>
    </AppProvider>
  );
}
