import { useApp } from '../store/AppContext';

/** Shared sticky header for the project document pages. */
export function ProjectDocHeader({
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  /** When set, a back chevron appears instead of the project name. */
  onBack?: () => void;
  backLabel?: string;
}) {
  const { activeProject } = useApp();
  const context = activeProject
    ? activeProject.inputs.clientName || activeProject.inputs.projectName || 'Project'
    : '';

  return (
    <div
      className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
    >
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 -ml-1 mb-1 text-teal-600 text-sm font-semibold active:opacity-70 lg:hover:opacity-80"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
          {backLabel ?? 'Back'}
        </button>
      )}
      <h1 className="text-xl font-bold text-teal-900 leading-tight truncate">{title}</h1>
      <p className="text-xs text-ios-gray-600 truncate">
        {[context, subtitle].filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

export function NoProjectState({ title, message }: { title: string; message: string }) {
  const { dispatch } = useApp();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <div>
        <h2 className="text-xl font-bold text-teal-900 mb-1">{title}</h2>
        <p className="text-ios-gray-600 text-sm">{message}</p>
      </div>
      <button
        onClick={() => {
          dispatch({ type: 'SET_PROJECT_LIST_FILTER', filter: 'all' });
          dispatch({ type: 'SET_ACTIVE_TAB', tab: 'projects' });
        }}
        className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
      >
        Go to Projects
      </button>
    </div>
  );
}
