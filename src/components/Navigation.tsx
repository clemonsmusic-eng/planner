import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { TabName, ProjectStatus } from '../types';

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

  const activeTab = state.activeTab;

  // 56px each for Home + Projects when a project is open; 50% each when nothing is open
  const rightButtonWidth = hasProject ? 56 : undefined;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-ios-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Backdrop — closes popup when tapping outside; sits above page but below popup */}
      {showProjectMenu && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setShowProjectMenu(false)}
        />
      )}

      <div className="flex items-stretch min-h-[56px]">

        {/* ── Project section: slides in from the left ── */}
        <div
          className="overflow-hidden flex-shrink-0"
          style={{
            width: hasProject ? 'calc(100% - 112px)' : '0px',
            transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Inner container: always full width so content doesn't wrap during animation */}
          <div
            className="flex items-stretch h-full"
            style={{
              width: 'calc(100vw - 112px)',
              minWidth: 'calc(100vw - 112px)',
              transform: hasProject ? 'translateX(0)' : 'translateX(-24px)',
              opacity: hasProject ? 1 : 0,
              transition: 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms',
            }}
          >
            {/* Project name */}
            <div className="flex items-center pl-3 pr-2 min-w-0 flex-1 border-r border-ios-gray-200">
              <span className="text-[11px] font-semibold text-ios-gray-500 truncate leading-tight">
                {projectName}
              </span>
            </div>

            {/* Input */}
            <button
              onClick={() => setTab('inputs')}
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 flex-shrink-0 min-w-[52px] transition-colors ${
                activeTab === 'inputs' ? 'text-teal-600' : 'text-ios-gray-500'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
              </svg>
              <span className="text-[10px] font-medium">Input</span>
            </button>

            {/* Plan */}
            <button
              onClick={() => setTab('plan')}
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 flex-shrink-0 min-w-[48px] transition-colors ${
                activeTab === 'plan' ? 'text-teal-600' : 'text-ios-gray-500'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] font-medium">Plan</span>
            </button>

            {/* Schedule */}
            <button
              onClick={() => setTab('schedule')}
              className={`flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 flex-shrink-0 min-w-[60px] transition-colors ${
                activeTab === 'schedule' ? 'text-teal-600' : 'text-ios-gray-500'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z" clipRule="evenodd" />
              </svg>
              <span className="text-[10px] font-medium">Schedule</span>
            </button>
          </div>
        </div>

        {/* ── Home button ── */}
        <button
          onClick={() => setTab('home')}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-shrink-0 transition-colors ${
            activeTab === 'home' ? 'text-teal-600' : 'text-ios-gray-500'
          }`}
          style={{
            width: rightButtonWidth ?? '50%',
            transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
            <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.432z" />
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        {/* ── Projects button + popup ── */}
        <div
          className="relative flex-shrink-0"
          style={{
            width: rightButtonWidth ?? '50%',
            transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: showProjectMenu ? 70 : undefined,
          }}
        >
          {/* Popup menu — rendered above the Projects button */}
          {showProjectMenu && (
            <div className="absolute bottom-full right-0 mb-1 bg-white rounded-2xl shadow-xl border border-ios-gray-200 overflow-hidden"
                 style={{ minWidth: '188px', zIndex: 70 }}>
              {(
                [
                  { filter: 'active' as ProjectStatus, label: 'Active Projects' },
                  { filter: 'draft'  as ProjectStatus, label: 'Draft Projects'  },
                  { filter: 'archived' as ProjectStatus, label: 'Archived Projects' },
                ] as const
              ).map(({ filter, label }, i) => {
                const isCurrent = state.projectListFilter === filter && activeTab === 'projects';
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

          <button
            onClick={() => setShowProjectMenu(m => !m)}
            className={`w-full h-full flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
              activeTab === 'projects' || showProjectMenu ? 'text-teal-600' : 'text-ios-gray-500'
            }`}
          >
            {/* Folder icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 12h-15a4.483 4.483 0 00-3 1.146z" />
            </svg>
            <span className="text-[10px] font-medium">Projects</span>
          </button>
        </div>

      </div>
    </nav>
  );
}
