import { useState } from 'react';
import { useMenu } from './MenuContext';
import { useApp } from '../store/AppContext';
import type { TabName } from '../types';

/**
 * Destinations that used to sit in the bottom bar. Order here is the order
 * shown in the menu: Calendar, Settings, Home.
 */
const NAV_DESTINATIONS: { tab: TabName; label: string; icon: React.ReactNode }[] = [
  {
    tab: 'calendar',
    label: 'Calendar',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    tab: 'settings',
    label: 'Settings',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.992 6.992 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    tab: 'home',
    label: 'Home',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export function HamburgerButton() {
  const { toggle } = useMenu();
  return (
    <button
      onClick={toggle}
      className="w-10 h-10 flex items-center justify-center rounded-xl text-ios-gray-600 active:bg-ios-gray-100"
      aria-label="Open menu"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

export function HamburgerMenu() {
  const { isOpen, close } = useMenu();
  const { state, dispatch } = useApp();
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);

  function selectProject(id: string) {
    dispatch({ type: 'SET_ACTIVE_PROJECT', id });
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'inputs' });
    close();
  }

  function createProject() {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    dispatch({
      type: 'CREATE_PROJECT',
      project: {
        id,
        createdAt: now,
        updatedAt: now,
        inputs: {
          clientName: '',
          projectName: '',
          community: state.communities[0] ?? '',
          moveType: 'Full Move',
          status: 'draft',
          targetMoveDate: '',
          earliestStartDate: '',
          hardDeadline: '',
          flexibilityLevel: 'Medium',
          originSqFt: 0,
          destinationSqFt: 0,
          densityLevel: 'Moderate',
          budgetedManHours: 0,
          clientTimePreference: 'AM',
          specialNotes: '',
          cleanout: { enabled: false, type: '', startDate: '' },
          auction: { enabled: false },
          dateOverrides: [],
        },
        schedule: null,
      },
    });
    close();
  }

  if (!isOpen) return null;

  const activeProjects  = state.projects.filter(p => (p.inputs.status ?? 'active') === 'active');
  const draftProjects   = state.projects.filter(p => (p.inputs.status ?? 'active') === 'draft');
  const archivedProjects = state.projects.filter(p => (p.inputs.status ?? 'active') === 'archived');

  function ProjectRow({ project }: { project: typeof state.projects[0] }) {
    const isSelected = project.id === state.activeProjectId;
    const isDraft = (project.inputs.status ?? 'active') === 'draft';
    return (
      <button
        onClick={() => selectProject(project.id)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
          isSelected ? 'bg-teal-50' : 'active:bg-ios-gray-100'
        }`}
      >
        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isSelected
              ? 'bg-teal-600'
              : isDraft
              ? 'bg-amber-400'
              : 'bg-ios-gray-300'
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-teal-700' : 'text-teal-900'}`}>
              {project.inputs.clientName || 'Untitled Project'}
            </p>
            {isDraft && (
              <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                Draft
              </span>
            )}
          </div>
          {project.inputs.community && (
            <p className="text-xs text-ios-gray-500 truncate">{project.inputs.community}</p>
          )}
        </div>
        {isSelected && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-teal-600 flex-shrink-0">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-black/40"
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 z-[61] w-[280px] bg-white flex flex-col shadow-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-ios-gray-200">
          <div>
            <p className="text-[11px] font-semibold text-ios-gray-500 uppercase tracking-wider">Smooth Transitions</p>
            <h2 className="text-lg font-bold text-teal-900">Move Planner</h2>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ios-gray-100 text-ios-gray-600"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Destinations moved out of the bottom bar, which now carries only
              the menu and the project drawer. */}
          <div className="px-3 pt-3 pb-1 space-y-0.5">
            {NAV_DESTINATIONS.map(({ tab, label, icon }) => {
              const isCurrent = state.activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => { dispatch({ type: 'SET_ACTIVE_TAB', tab }); close(); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:bg-ios-gray-100 ${
                    isCurrent ? 'bg-teal-50 text-teal-700' : 'text-teal-900'
                  }`}
                >
                  <span className={`w-5 h-5 flex-shrink-0 ${isCurrent ? 'text-teal-600' : 'text-ios-gray-500'}`}>
                    {icon}
                  </span>
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="mx-4 my-1 border-t border-ios-gray-200" />

          {/* ── Active Projects ──────────────────────────────────── */}
          {activeProjects.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider">
                  Active · {activeProjects.length}
                </p>
              </div>
              <div className="px-3 space-y-1">
                {activeProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
              </div>
            </>
          )}

          {/* ── Draft Projects (collapsible) ─────────────────────── */}
          {draftProjects.length > 0 && (
            <div className="px-3 mt-1">
              <button
                onClick={() => setDraftOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:bg-ios-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider">
                    Drafts · {draftProjects.length}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-4 h-4 text-ios-gray-400 transition-transform ${draftOpen ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {draftOpen && (
                <div className="space-y-1 mt-1">
                  {draftProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
                </div>
              )}
            </div>
          )}

          {/* No projects at all */}
          {activeProjects.length === 0 && draftProjects.length === 0 && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider">Projects</p>
            </div>
          )}

          {/* ── Archived Projects (collapsible) ─────────────────── */}
          <div className="px-3 pb-1 mt-1">
            {archivedProjects.length > 0 && (
              <>
                <button
                  onClick={() => setArchivedOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:bg-ios-gray-100"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-ios-gray-400" />
                    <span className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider">
                      Archived · {archivedProjects.length}
                    </span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 text-ios-gray-400 transition-transform ${archivedOpen ? 'rotate-180' : ''}`}
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {archivedOpen && (
                  <div className="space-y-1 mt-1">
                    {archivedProjects.map((project) => {
                      const isSelected = project.id === state.activeProjectId;
                      return (
                        <button
                          key={project.id}
                          onClick={() => selectProject(project.id)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors opacity-50 ${
                            isSelected ? 'bg-teal-50' : 'active:bg-ios-gray-100'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-ios-gray-400" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate text-ios-gray-600">
                              {project.inputs.clientName || 'Untitled Project'}
                            </p>
                            {project.inputs.community && (
                              <p className="text-xs text-ios-gray-500 truncate">{project.inputs.community}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* New project button */}
            <button
              onClick={createProject}
              className="w-full flex items-center gap-3 px-3 py-3 mt-1 rounded-xl text-left text-teal-600 active:bg-teal-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span className="text-sm font-semibold">New Project</span>
            </button>
          </div>

          <div className="h-2" />
        </div>
      </div>
    </>
  );
}
