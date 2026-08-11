import { useState } from 'react';
import { useMenu } from './MenuContext';
import { useApp } from '../store/AppContext';
import type { TabName } from '../types';

/**
 * Destinations that used to sit in the bottom bar. Order here is the order
 * shown in the menu, bottom group: Home, Calendar, Inventory, Settings.
 */
const NAV_DESTINATIONS: { tab: TabName; label: string; icon: React.ReactNode }[] = [
  {
    tab: 'home',
    label: 'Home',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
      </svg>
    ),
  },
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
    tab: 'supplies',
    label: 'Inventory',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M1 1.75A.75.75 0 011.75 1h1.628a1.75 1.75 0 011.734 1.51L5.18 3a65.25 65.25 0 0113.36 1.412.75.75 0 01.58.875 48.645 48.645 0 01-1.618 6.2.75.75 0 01-.712.513H6a2.503 2.503 0 00-2.292 1.5H16.25a.75.75 0 010 1.5H2.76a.75.75 0 01-.748-.807 4.002 4.002 0 012.716-3.486L3.626 2.716a.25.25 0 00-.248-.216H1.75A.75.75 0 011 1.75zM6 17.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
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
];

export function HamburgerMenu() {
  const { isOpen, close } = useMenu();
  const { state, dispatch } = useApp();
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  // Open by default — the active list is what the menu is usually for.
  const [activeOpen, setActiveOpen] = useState(true);

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
          contractedServices: [],
          cleanout: { enabled: false, type: '', startDate: '' },
          auction: { enabled: false },
          dateOverrides: [],
        },
        schedule: null,
      },
    });
    close();
  }

  // Rendered even while closed so it can animate both directions.
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
      {/*
        Click-catcher. It sits *below* the bottom bar so the hamburger stays
        visible and keeps working — a second tap on it closes the menu itself.
      */}
      {isOpen && (
        <div className="fixed inset-0 z-[45]" onClick={close} aria-hidden="true" />
      )}

      {/* Popover — rises out of the hamburger in the bottom-left corner */}
      <div
        aria-hidden={!isOpen}
        className="fixed z-[55] w-[264px] bg-white rounded-2xl shadow-xl border border-ios-gray-200 flex flex-col overflow-hidden"
        style={{
          left: '8px',
          maxWidth: 'calc(100vw - 16px)',
          bottom: 'calc(56px + env(safe-area-inset-bottom) + 8px)',
          maxHeight: 'calc(100vh - 56px - env(safe-area-inset-bottom) - 24px)',
          transformOrigin: 'bottom left',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.94)',
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 160ms ease-out, transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Projects — top of the menu, scrolls when the list is long */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {/* ── Active Projects ──────────────────────────────────── */}
          {activeProjects.length > 0 && (
            <div className="px-3 pt-2">
              <button
                onClick={() => setActiveOpen(o => !o)}
                aria-expanded={activeOpen}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:bg-ios-gray-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider">
                    Active · {activeProjects.length}
                  </span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={`w-4 h-4 text-ios-gray-400 transition-transform ${activeOpen ? 'rotate-180' : ''}`}
                >
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {activeOpen && (
                <div className="space-y-1 mt-1">
                  {activeProjects.map((p) => <ProjectRow key={p.id} project={p} />)}
                </div>
              )}
            </div>
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
        </div>

        {/* Destinations — pinned to the bottom, directly above the hamburger */}
        <div className="flex-shrink-0 border-t border-ios-gray-200 p-2 space-y-0.5">
          {NAV_DESTINATIONS.map(({ tab, label, icon }) => {
            const isCurrent = state.activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { dispatch({ type: 'SET_ACTIVE_TAB', tab }); close(); }}
                tabIndex={isOpen ? 0 : -1}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:bg-ios-gray-100 ${
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
      </div>
    </>
  );
}
