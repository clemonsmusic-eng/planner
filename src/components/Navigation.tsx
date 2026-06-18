import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { TabName, ProjectStatus } from '../types';

// Icons
const IconHome = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
    <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
  </svg>
);

const IconFolder = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 12h-15a4.483 4.483 0 00-3 1.146z" />
  </svg>
);

const IconInput = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
  </svg>
);

const IconPlan = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
  </svg>
);

const IconSchedule = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z" clipRule="evenodd" />
  </svg>
);

const IconCalendar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm-1.5 8.25v6.75a.75.75 0 00.75.75h10.5a.75.75 0 00.75-.75V10.5H5.25zM9 12.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H9zm-.75 3a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75zM12 12.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H12zm-.75 3a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H12a.75.75 0 01-.75-.75zM15 12.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H15zm-.75 3a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H15a.75.75 0 01-.75-.75z" clipRule="evenodd" />
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
  </svg>
);

function NavBtn({
  onClick,
  active,
  icon,
  label,
  className = '',
}: {
  onClick: () => void;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors flex-shrink-0 ${
        active ? 'text-teal-600' : 'text-ios-gray-500'
      } ${className}`}
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

const VSEP = () => (
  <div className="w-px bg-ios-gray-200 self-stretch my-2 flex-shrink-0" />
);

export function Navigation() {
  const { state, dispatch } = useApp();
  const [showProjectMenu, setShowProjectMenu] = useState(false);

  const activeProject = state.activeProjectId
    ? state.projects.find(p => p.id === state.activeProjectId)
    : null;
  const hasProject = !!activeProject;
  const projectName = activeProject
    ? (activeProject.inputs.projectName || activeProject.inputs.clientName || 'Project')
    : '';

  function setTab(tab: TabName) {
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
  }

  function goToFilter(filter: ProjectStatus) {
    dispatch({ type: 'SET_PROJECT_LIST_FILTER', filter });
    setTab('projects');
    setShowProjectMenu(false);
  }

  const t = state.activeTab;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-ios-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Backdrop — closes Projects popup */}
      {showProjectMenu && (
        <div className="fixed inset-0 z-[60]" onClick={() => setShowProjectMenu(false)} />
      )}

      {/* Projects popup — centered above the nav, clears the safe area */}
      {showProjectMenu && (
        <div
          className="fixed z-[70] bg-white rounded-2xl shadow-xl border border-ios-gray-200 overflow-hidden"
          style={{
            bottom: 'calc(56px + env(safe-area-inset-bottom) + 4px)',
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '196px',
          }}
        >
          {(
            [
              { filter: 'active'   as ProjectStatus, label: 'Active Projects'   },
              { filter: 'draft'    as ProjectStatus, label: 'Draft Projects'    },
              { filter: 'archived' as ProjectStatus, label: 'Archived Projects' },
            ] as const
          ).map(({ filter, label }, i) => {
            const isCurrent = state.projectListFilter === filter && t === 'projects';
            return (
              <button
                key={filter}
                onClick={() => goToFilter(filter)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left active:bg-ios-gray-100 ${
                  i > 0 ? 'border-t border-ios-gray-100' : ''
                } ${isCurrent ? 'text-teal-700 font-semibold' : 'text-teal-900'}`}
              >
                <span className="w-4 flex-shrink-0 flex items-center justify-center">
                  {isCurrent && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-teal-600">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-stretch min-h-[56px]">

        {/* ── Home (always left) ── */}
        <NavBtn onClick={() => setTab('home')} active={t === 'home'} icon={<IconHome />} label="Home" className="w-14" />

        <VSEP />

        {/* ── Middle section: flex-1, two layers crossfade ── */}
        <div className="flex-1 relative overflow-hidden min-w-0">

          {/* Layer A — Projects button (visible when no project open) */}
          <div
            className="absolute inset-0 flex items-stretch"
            style={{
              opacity: hasProject ? 0 : 1,
              transform: hasProject ? 'translateX(-8px)' : 'translateX(0)',
              transition: 'opacity 260ms ease-out, transform 260ms ease-out',
              pointerEvents: hasProject ? 'none' : 'auto',
            }}
          >
            <button
              onClick={() => setShowProjectMenu(m => !m)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                t === 'projects' || showProjectMenu ? 'text-teal-600' : 'text-ios-gray-500'
              }`}
            >
              <IconFolder />
              <span className="text-[10px] font-medium leading-none">Projects</span>
            </button>
          </div>

          {/* Layer B — Project name + tabs (visible when project is open, slides in from left) */}
          <div
            className="absolute inset-0 flex items-stretch"
            style={{
              opacity: hasProject ? 1 : 0,
              transform: hasProject ? 'translateX(0)' : 'translateX(-16px)',
              transition: 'opacity 280ms ease-out, transform 280ms ease-out',
              pointerEvents: hasProject ? 'auto' : 'none',
            }}
          >
            {/* Project name — tappable to go to projects list */}
            <button
              onClick={() => setTab('projects')}
              className="flex flex-col items-center justify-center px-2 border-r border-ios-gray-200 flex-shrink-0 min-w-0 transition-colors text-ios-gray-500"
              style={{ maxWidth: '30%', minWidth: '52px' }}
            >
              <IconFolder />
              <span className="text-[9px] font-semibold leading-none text-ios-gray-400 truncate w-full text-center mt-0.5">
                {projectName}
              </span>
            </button>

            {/* Input */}
            <button
              onClick={() => setTab('inputs')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                t === 'inputs' ? 'text-teal-600' : 'text-ios-gray-500'
              }`}
            >
              <IconInput />
              <span className="text-[10px] font-medium leading-none">Input</span>
            </button>

            {/* Plan */}
            <button
              onClick={() => setTab('plan')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                t === 'plan' ? 'text-teal-600' : 'text-ios-gray-500'
              }`}
            >
              <IconPlan />
              <span className="text-[10px] font-medium leading-none">Plan</span>
            </button>

            {/* Schedule */}
            <button
              onClick={() => setTab('schedule')}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                t === 'schedule' ? 'text-teal-600' : 'text-ios-gray-500'
              }`}
            >
              <IconSchedule />
              <span className="text-[10px] font-medium leading-none">Schedule</span>
            </button>
          </div>

        </div>

        <VSEP />

        {/* ── Calendar (always right) ── */}
        <NavBtn onClick={() => setTab('calendar')} active={t === 'calendar'} icon={<IconCalendar />} label="Calendar" className="w-16" />

        {/* ── Settings (always rightmost) ── */}
        <NavBtn onClick={() => setTab('settings')} active={t === 'settings'} icon={<IconSettings />} label="Settings" className="w-16" />

      </div>
    </nav>
  );
}
