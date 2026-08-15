import { AppProvider, useApp } from './store/AppContext';
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
      case 'furniture': return <FurnitureInventoryPage />;
      case 'floorplans':return <FloorPlansPage />;
      case 'photos':    return <PhotosPage />;
      case 'supplies':  return <SupplyInventoryPage />;
      case 'project-supplies': return <ProjectSuppliesPage />;
    }
  })();

  return (
    <div className="flex flex-col min-h-screen bg-ios-gray-100 lg:pl-64">
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

export function App() {
  return (
    <AppProvider>
      <MenuProvider>
        <AddShiftProvider>
          <ProjectDocsProvider>
            <AppContent />
          </ProjectDocsProvider>
        </AddShiftProvider>
      </MenuProvider>
    </AppProvider>
  );
}
