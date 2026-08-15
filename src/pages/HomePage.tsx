import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import type { Project, ProjectStatus } from '../types';
import { formatDateLabel } from '../lib/dateUtils';

export function HomePage() {
  const { state, dispatch } = useApp();

  const activeProjects = state.projects.filter((p) => (p.inputs.status ?? 'active') === 'active');

  const recentActive = [...activeProjects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  function goToProjects(filter: ProjectStatus | 'all') {
    dispatch({ type: 'SET_PROJECT_LIST_FILTER', filter });
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'projects' });
  }

  function openProject(project: Project) {
    dispatch({ type: 'SET_ACTIVE_PROJECT', id: project.id });
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'inputs' });
  }

  return (
    <div className="flex flex-col h-full">
      {/*
        Header — the brand's teal gradient and tracked eyebrow, carried over
        from the site masthead. Only Home wears it; the working pages keep
        white headers so the app doesn't turn into a wall of teal.
      */}
      <div
        className="lg:hidden sticky top-0 z-10 bg-gradient-to-br from-brand-mint to-teal-700 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 14px)', paddingBottom: '16px' }}
      >
        <p className="text-[11px] font-semibold text-white/80 uppercase tracking-[0.2em]">
          Smooth Transitions
        </p>
        <h1 className="text-2xl font-medium text-white mt-0.5">Move Planner</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:pt-6 space-y-6">
        {/* Recent Active Projects */}
        <div>
          <h2 className="text-sm font-bold text-ios-gray-500 uppercase tracking-wider mb-2">
            Recent Active Projects
          </h2>
          {recentActive.length === 0 ? (
            <Card className="p-4 text-center text-sm text-ios-gray-500">
              No active projects yet.
            </Card>
          ) : (
            <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
              {recentActive.map((project) => (
                <Card key={project.id} onClick={() => openProject(project)} className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-teal-900 text-sm truncate">
                        {project.inputs.clientName || 'Untitled Project'}
                      </p>
                      <p className="text-xs text-ios-gray-500 truncate">
                        {project.inputs.community || 'No community'}
                        {project.inputs.targetMoveDate && ` · Move: ${formatDateLabel(project.inputs.targetMoveDate)}`}
                      </p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 text-ios-gray-400">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Big nav buttons */}
        <div>
          <h2 className="text-sm font-bold text-ios-gray-500 uppercase tracking-wider mb-2">
            Browse
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/*
              One door to the project list. Active, draft and archived are
              collapsible categories on that page, so three buttons here were
              three routes to the same screen.
            */}
            <HomeButton
              label="Projects"
              count={state.projects.length}
              colorClass="bg-teal-600 text-white"
              onClick={() => goToProjects('all')}
              icon={
                <path d="M19.5 21a3 3 0 003-3V9a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15z" />
              }
            />
            <HomeButton
              label="Calendar"
              colorClass="bg-teal-100 text-teal-700"
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'calendar' })}
              icon={
                <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm-1.5 8.25v6.75a.75.75 0 00.75.75h10.5a.75.75 0 00.75-.75V10.5H5.25z" clipRule="evenodd" />
              }
            />
            <HomeButton
              label="Supply Inventory"
              colorClass="bg-teal-50 text-teal-600"
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'supplies' })}
              icon={
                <path fillRule="evenodd" d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
              }
            />
            <HomeButton
              label="Settings"
              colorClass="bg-ios-gray-100 text-ios-gray-600"
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'settings' })}
              icon={
                <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
              }
            />
          </div>
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

function HomeButton({
  label,
  count,
  icon,
  colorClass,
  onClick,
  full,
}: {
  label: string;
  count?: number;
  icon: React.ReactNode;
  colorClass: string;
  onClick: () => void;
  full?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-2 p-4 rounded-2xl shadow-sm bg-white border border-ios-gray-200 active:opacity-70 lg:hover:opacity-80 transition-opacity ${full ? 'col-span-2' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          {icon}
        </svg>
      </div>
      <div>
        <p className="font-semibold text-teal-900 text-sm">{label}</p>
        {typeof count === 'number' && (
          <p className="text-xs text-ios-gray-500">{count} project{count !== 1 ? 's' : ''}</p>
        )}
      </div>
    </button>
  );
}
