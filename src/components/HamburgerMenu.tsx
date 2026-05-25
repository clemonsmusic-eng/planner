import { useMenu } from './MenuContext';
import { useApp } from '../store/AppContext';

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

  function goToSettings() {
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'settings' });
    close();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 z-50 w-[280px] bg-white flex flex-col shadow-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-ios-gray-200">
          <div>
            <p className="text-[11px] font-semibold text-ios-gray-500 uppercase tracking-wider">Smooth Transitions</p>
            <h2 className="text-lg font-bold text-gray-900">Move Planner</h2>
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

        {/* Projects section */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-1">
            <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider">Projects</p>
          </div>

          <div className="px-3 space-y-1 pb-2">
            {state.projects.map((project) => {
              const isActive = project.id === state.activeProjectId;
              return (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                    isActive ? 'bg-indigo-50' : 'hover:bg-ios-gray-50 active:bg-ios-gray-100'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isActive ? 'bg-indigo-600' : 'bg-ios-gray-300'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {project.inputs.clientName || 'Untitled Project'}
                    </p>
                    {project.inputs.community && (
                      <p className="text-xs text-ios-gray-500 truncate">{project.inputs.community}</p>
                    )}
                  </div>
                  {isActive && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-600 flex-shrink-0">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}

            {/* New project button */}
            <button
              onClick={createProject}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-indigo-600 active:bg-indigo-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              <span className="text-sm font-semibold">New Project</span>
            </button>
          </div>

          {/* Divider */}
          <div className="mx-4 my-2 border-t border-ios-gray-200" />

          {/* Settings */}
          <div className="px-3 pb-4">
            <button
              onClick={goToSettings}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left text-gray-900 active:bg-ios-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-ios-gray-500 flex-shrink-0">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.992 6.992 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold">Settings</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
