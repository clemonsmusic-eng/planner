import { useState } from 'react';
import { ACCESS_LABELS, can, canOpenTab } from '../lib/access';
import { AccessSheet } from './AccessSheet';
import { useMenu } from './MenuContext';
import { useApp } from '../store/AppContext';
import { emptyPhaseBudgets } from '../lib/budgets';
import { NAV_DESTINATIONS } from './navDestinations';

/**
 * The phone menu: project switcher plus the destinations that don't fit in the
 * bottom bar. Hidden above lg, where the sidebar shows all of it at once.
 */
export function HamburgerMenu() {
  const { isOpen, close } = useMenu();
  const { state, dispatch } = useApp();
  const level = state.access.level;
  const [accessOpen, setAccessOpen] = useState(false);
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
          phaseBudgets: emptyPhaseBudgets(),
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
          isSelected ? 'bg-teal-50' : 'active:bg-ios-gray-100 lg:hover:bg-ios-gray-100'
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
        <div className="lg:hidden fixed inset-0 z-[45]" onClick={close} aria-hidden="true" />
      )}

      {/* Popover — rises out of the hamburger in the bottom-left corner */}
      <div
        aria-hidden={!isOpen}
        className="lg:hidden fixed z-[55] w-[264px] bg-white rounded-2xl shadow-xl border border-ios-gray-200 flex flex-col overflow-hidden"
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
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
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
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
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
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
                            isSelected ? 'bg-teal-50' : 'active:bg-ios-gray-100 lg:hover:bg-ios-gray-100'
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
            {can(level, 'editProjects') && <button
              onClick={createProject}
              className="w-full flex items-center gap-3 px-3 py-3 mt-1 rounded-xl text-left text-teal-600 active:bg-teal-50 lg:hover:bg-teal-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span className="text-sm font-semibold">New Project</span>
            </button>}
          </div>
        </div>

        {/* Destinations — pinned to the bottom, directly above the hamburger */}
        <div className="flex-shrink-0 border-t border-ios-gray-200 p-2 space-y-0.5">
          {NAV_DESTINATIONS.filter((d) => canOpenTab(level, d.tab)).map(({ tab, label, icon }) => {
            const isCurrent = state.activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => { dispatch({ type: 'SET_ACTIVE_TAB', tab }); close(); }}
                tabIndex={isOpen ? 0 : -1}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:bg-ios-gray-100 lg:hover:bg-ios-gray-100 ${
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
          <button
            onClick={() => setAccessOpen(true)}
            tabIndex={isOpen ? 0 : -1}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-teal-900 active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
          >
            <span className="w-5 h-5 flex-shrink-0 text-ios-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
              </svg>
            </span>
            <span className="text-sm font-semibold flex-1 min-w-0">Access</span>
            <span className="text-xs text-ios-gray-500 flex-shrink-0">{ACCESS_LABELS[level]}</span>
          </button>
        </div>
      </div>
      {accessOpen && <AccessSheet onClose={() => setAccessOpen(false)} />}
    </>
  );
}
