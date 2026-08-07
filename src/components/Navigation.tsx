import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useMenu } from './MenuContext';
import type { TabName } from '../types';

// Width of the fixed left cluster (menu button + separator + folder button).
// The tab drawer expands to fill everything to the right of it.
const LEFT_CLUSTER_PX = 121;
const DRAWER_WIDTH = `calc(100vw - ${LEFT_CLUSTER_PX}px)`;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

// Icons
const IconMenu = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
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

const IconChecklist = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0A.75.75 0 018.25 6h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75zM2.625 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 12a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12A.75.75 0 017.5 12zm-4.875 5.25a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75z" clipRule="evenodd" />
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

/** Tabs that live inside the project drawer. */
const PROJECT_TABS: { tab: TabName; label: string; icon: React.ReactNode }[] = [
  { tab: 'inputs',    label: 'Input',     icon: <IconInput /> },
  { tab: 'plan',      label: 'Plan',      icon: <IconPlan /> },
  { tab: 'schedule',  label: 'Schedule',  icon: <IconSchedule /> },
  { tab: 'checklist', label: 'Checklist', icon: <IconChecklist /> },
];

export function Navigation() {
  const { state, dispatch } = useApp();
  const { isOpen: menuOpen, toggle: toggleMenu } = useMenu();
  const [tabsOpen, setTabsOpen] = useState(false);

  const activeProject = state.activeProjectId
    ? state.projects.find(p => p.id === state.activeProjectId)
    : null;
  const hasProject = !!activeProject;
  const projectName = activeProject
    ? (activeProject.inputs.projectName || activeProject.inputs.clientName || 'Project')
    : '';

  // With no project open there are no tabs to show, so the drawer can't stay out.
  useEffect(() => {
    if (!hasProject) setTabsOpen(false);
  }, [hasProject]);

  function setTab(tab: TabName) {
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
  }

  /**
   * The folder is the drawer's handle when a project is open. With no project
   * there are no tabs, so it becomes a plain link to the Projects page.
   */
  function onFolderClick() {
    if (!hasProject) {
      dispatch({ type: 'SET_PROJECT_LIST_FILTER', filter: 'all' });
      setTab('projects');
      return;
    }
    setTabsOpen(o => !o);
  }

  const t = state.activeTab;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-ios-gray-200"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/*
        Single row, clipped. Everything except the spacer refuses to shrink, so
        when the drawer expands the overflow pushes Calendar and Settings off
        the right edge rather than squeezing them.
      */}
      <div className="flex items-stretch min-h-[56px] overflow-hidden">

        {/* ── Menu (always left) — Calendar, Settings and Home live in here ── */}
        <NavBtn
          onClick={toggleMenu}
          active={menuOpen}
          icon={<IconMenu />}
          label="Menu"
          className="w-14"
        />

        <VSEP />

        {/* ── Project folder — the drawer handle ── */}
        <button
          onClick={onFolderClick}
          aria-expanded={hasProject ? tabsOpen : undefined}
          aria-label={hasProject ? `${projectName} tabs` : 'Projects'}
          className={`w-16 flex-shrink-0 flex flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors ${
            tabsOpen || t === 'projects' ? 'text-teal-600' : 'text-ios-gray-500'
          }`}
        >
          <IconFolder />
          <span className="text-[9px] font-semibold leading-none truncate w-full text-center mt-0.5">
            {hasProject ? projectName : 'Projects'}
          </span>
        </button>

        {/* ── Project tabs drawer — slides out of the folder ── */}
        <div
          className="flex-shrink-0 overflow-hidden flex items-stretch"
          style={{
            width: tabsOpen ? DRAWER_WIDTH : '0px',
            transition: `width 320ms ${EASE}`,
          }}
          aria-hidden={!tabsOpen}
        >
          {/*
            Fixed width so the tabs keep their final positions while the drawer
            opens; the translate makes them read as sliding out of the folder
            rather than simply being uncovered.
          */}
          <div
            className="flex items-stretch"
            style={{
              width: DRAWER_WIDTH,
              transform: tabsOpen ? 'translateX(0)' : 'translateX(-28px)',
              opacity: tabsOpen ? 1 : 0,
              transition: `transform 320ms ${EASE}, opacity 200ms ease-out`,
            }}
          >
            <VSEP />
            {PROJECT_TABS.map(({ tab, label, icon }) => (
              <button
                key={tab}
                onClick={() => setTab(tab)}
                tabIndex={tabsOpen ? 0 : -1}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                  t === tab ? 'text-teal-600' : 'text-ios-gray-500'
                }`}
              >
                {icon}
                <span className="text-[9px] font-medium leading-none truncate w-full text-center px-0.5">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Spacer — fills the bar while the drawer is collapsed, and gives way
            as it opens. */}
        <div className="flex-1 min-w-0" />

      </div>
    </nav>
  );
}
