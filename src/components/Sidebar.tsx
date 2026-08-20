import { useEffect, useState } from 'react';
import { ACCESS_LABELS, canOpenTab } from '../lib/access';
import { AccessSheet } from './AccessSheet';
import { SyncBadge } from './SyncBadge';
import { useApp } from '../store/AppContext';
import { useAddShift } from './AddShiftContext';
import {
  NAV_DESTINATIONS,
  PROJECT_TABS,
  DOC_DESTINATIONS,
  type Destination,
} from './navDestinations';
import type { TabName } from '../types';

/** Matches the lg:pl-64 the page area reserves in App.tsx. */
export const SIDEBAR_WIDTH_CLASS = 'w-64';

const SECTIONS_KEY = 'st-planner-sidebar-sections';

/**
 * Desktop navigation.
 *
 * On a phone the destinations are rationed — a bottom bar with a drawer that
 * slides out of the project folder, and menus that pop up out of it — because
 * there are only ever five slots. A desktop window has room to show the lot at
 * once, so the sidebar lays every destination out flat: no drawer, no popovers,
 * and the current page is always visible in context.
 *
 * Hidden below lg, where Navigation and HamburgerMenu take over.
 */
export function Sidebar() {
  const { state, dispatch } = useApp();
  const level = state.access.level;
  const [accessOpen, setAccessOpen] = useState(false);
  const addShift = useAddShift();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  /*
   * Whether the open project's own sections are showing.
   *
   * Kept on the device rather than in app state: which parts of a rail someone
   * wants out of the way is a preference about this screen, not something to
   * push at the rest of the team. Both start open — the tabs are the whole
   * point of having a project open — and a collapse sticks until it is undone.
   */
  const [openSections, setOpenSections] = useState<{ tabs: boolean; files: boolean }>(() => {
    try {
      const raw = localStorage.getItem(SECTIONS_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<{ tabs: boolean; files: boolean }>) : {};
      return { tabs: parsed.tabs !== false, files: parsed.files !== false };
    } catch {
      return { tabs: true, files: true };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(openSections));
    } catch {
      /* storage blocked; the choice simply won't outlive the tab */
    }
  }, [openSections]);

  const toggleSection = (which: 'tabs' | 'files') =>
    setOpenSections((v) => ({ ...v, [which]: !v[which] }));

  const activeProject = state.activeProjectId
    ? state.projects.find((p) => p.id === state.activeProjectId)
    : null;
  const projectName = activeProject
    ? activeProject.inputs.projectName || activeProject.inputs.clientName || 'Untitled project'
    : '';

  const activeProjects = state.projects.filter((p) => (p.inputs.status ?? 'active') === 'active');

  function go(tab: TabName) {
    // The Add Shift popover belongs to the phone bar; leaving Schedule on
    // desktop should not strand it open behind the sidebar.
    addShift.closeMenu();
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
  }

  function openProject(id: string) {
    dispatch({ type: 'SET_ACTIVE_PROJECT', id });
    // Opening a project shows the plan, which is what it is for; the Input
    // tab is where a project is set up, not where it is looked at.
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'plan' });
    setSwitcherOpen(false);
  }

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 ${SIDEBAR_WIDTH_CLASS} bg-white border-r border-ios-gray-200 z-40`}
    >
      {/* Brand — the site masthead, scaled to a rail. */}
      <div className="px-4 py-4 bg-gradient-to-br from-brand-mint to-teal-700 flex-shrink-0">
        <p className="text-[10px] font-semibold text-white/80 uppercase tracking-[0.2em]">
          Smooth Transitions
        </p>
        <h1 className="text-lg font-medium text-white mt-0.5">Move Planner</h1>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        {/* Global destinations */}
        <nav className="px-2 space-y-0.5" aria-label="Main">
          {NAV_DESTINATIONS.filter((d) => canOpenTab(level, d.tab)).map((d) => (
            <SidebarLink
              key={d.tab}
              dest={d}
              current={state.activeTab === d.tab}
              onClick={() => {
                // The projects list keeps whatever filter it was left on
                // otherwise, which makes the link land somewhere unexpected.
                if (d.tab === 'projects') dispatch({ type: 'SET_PROJECT_LIST_FILTER', filter: 'all' });
                go(d.tab);
              }}
            />
          ))}
        </nav>

        {/* Open project — its working tabs and its documents, all visible */}
        {activeProject && (
          <>
            <SectionHeading
              label={projectName}
              open={openSections.tabs}
              onToggle={() => toggleSection('tabs')}
              className="mt-5"
            />
            {openSections.tabs && (
              <nav className="px-2 space-y-0.5" aria-label="Project">
                {PROJECT_TABS.filter((d) => canOpenTab(level, d.tab)).map((d) => (
                  <SidebarLink key={d.tab} dest={d} current={state.activeTab === d.tab} onClick={() => go(d.tab)} />
                ))}
              </nav>
            )}

            {DOC_DESTINATIONS.some((d) => canOpenTab(level, d.tab)) && (
              <>
                <SectionHeading
                  label="Files"
                  open={openSections.files}
                  onToggle={() => toggleSection('files')}
                  className="mt-4"
                />
                {openSections.files && (
                  <nav className="px-2 space-y-0.5" aria-label="Project files">
                    {DOC_DESTINATIONS.filter((d) => canOpenTab(level, d.tab)).map((d) => (
                      <SidebarLink key={d.tab} dest={d} current={state.activeTab === d.tab} onClick={() => go(d.tab)} />
                    ))}
                  </nav>
                )}
              </>
            )}
          </>
        )}

        {/* Quick switch between the jobs in flight */}
        {activeProjects.length > 0 && (
          <>
            <button
              onClick={() => setSwitcherOpen((v) => !v)}
              aria-expanded={switcherOpen}
              className="mt-5 w-full px-4 pb-1 flex items-center gap-1.5 text-left"
            >
              <span className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider flex-1 min-w-0 truncate">
                Active · {activeProjects.length}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                className={`w-4 h-4 text-ios-gray-400 flex-shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`}>
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {switcherOpen && (
              <div className="px-2 space-y-0.5">
                {activeProjects.map((p) => {
                  const isCurrent = p.id === state.activeProjectId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => openProject(p.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors ${
                        isCurrent ? 'bg-teal-50' : 'hover:bg-ios-gray-100'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isCurrent ? 'bg-teal-600' : 'bg-ios-gray-300'}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-semibold truncate ${isCurrent ? 'text-teal-700' : 'text-teal-900'}`}>
                          {p.inputs.clientName || p.inputs.projectName || 'Untitled project'}
                        </span>
                        <span className="block text-[11px] text-ios-gray-500 truncate">
                          {p.inputs.community || 'No community'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* The level this device works at, always reachable from the rail. */}
      <button
        onClick={() => setAccessOpen(true)}
        className="flex-shrink-0 border-t border-ios-gray-200 px-4 py-3 text-left hover:bg-ios-gray-50"
      >
        <span className="block text-[10px] font-bold uppercase tracking-wider text-ios-gray-500">
          Signed in as
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-teal-800">
          {ACCESS_LABELS[level]}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-ios-gray-400">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
        <SyncBadge />
      </button>
      {accessOpen && <AccessSheet onClose={() => setAccessOpen(false)} />}
    </aside>
  );
}

/**
 * A heading that folds its section away.
 *
 * The same disclosure the active-projects switcher already uses, so the rail
 * reads as one thing rather than a mixture of headings that do something and
 * headings that do not.
 */
function SectionHeading({
  label,
  open,
  onToggle,
  className = '',
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      className={`w-full px-4 pb-1 flex items-center gap-1.5 text-left hover:text-teal-700 ${className}`}
    >
      <span className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider flex-1 min-w-0 truncate">
        {label}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`w-4 h-4 text-ios-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      >
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

function SidebarLink({
  dest,
  current,
  onClick,
}: {
  dest: Destination;
  current: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      title={dest.hint}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${
        current ? 'bg-teal-50 text-teal-700' : 'text-teal-900 hover:bg-ios-gray-100'
      }`}
    >
      <span className={`w-5 h-5 flex-shrink-0 ${current ? 'text-teal-600' : 'text-ios-gray-500'}`}>
        {dest.icon}
      </span>
      <span className="text-sm font-semibold truncate">{dest.label}</span>
    </button>
  );
}
