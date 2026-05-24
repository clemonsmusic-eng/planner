import { AppProvider, useApp } from './store/AppContext';
import { Navigation } from './components/Navigation';
import { ProjectListPage } from './pages/ProjectListPage';
import { InputFormPage } from './pages/InputFormPage';
import { PlanPage } from './pages/PlanPage';
import { SchedulePage } from './pages/SchedulePage';

function AppContent() {
  const { state } = useApp();

  const page = (() => {
    switch (state.activeTab) {
      case 'projects': return <ProjectListPage />;
      case 'inputs':   return <InputFormPage />;
      case 'plan':     return <PlanPage />;
      case 'schedule': return <SchedulePage />;
    }
  })();

  return (
    <div className="flex flex-col min-h-screen bg-ios-gray-100">
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
      <AppContent />
    </AppProvider>
  );
}
