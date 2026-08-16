import { useEffect, useRef, useState } from 'react';
import { canOpenTab } from '../lib/access';
import { useApp } from '../store/AppContext';
import { useMenu } from './MenuContext';
import { useAddShift } from './AddShiftContext';
import { useProjectDocs } from './ProjectDocsContext';
import { PROJECT_TABS, DOC_DESTINATIONS, DOC_TABS } from './navDestinations';
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

const IconDocs = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.5 21a3 3 0 003-3V9a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15z" />
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
  const level = state.access.level;
  const { isOpen: menuOpen, toggle: toggleMenu } = useMenu();
  const addShift = useAddShift();
  const docs = useProjectDocs();
  const [tabsOpen, setTabsOpen] = useState(false);
  const scheduleTabRef = useRef<HTMLButtonElement>(null);
  const folderRef = useRef<HTMLButtonElement>(null);
  // Left edge of the folder, so the docs menu rises out of it.
  const [docsAnchorX, setDocsAnchorX] = useState(8);
  // Horizontal centre of the Schedule tab, so the popover rises out of it.
  const [addShiftAnchorX, setAddShiftAnchorX] = useState(0);

  const activeProject = state.activeProjectId
    ? state.projects.find(p => p.id === state.activeProjectId)
    : null;
  const hasProject = !!activeProject;
  // Blank rather than a stand-in name: a project that hasn't been filled in
  // yet has no name to show, and inventing one makes it look like it does.
  const projectName = activeProject
    ? (activeProject.inputs.projectName || activeProject.inputs.clientName || '')
    : '';

  // With no project open there are no tabs to show, so the drawer can't stay out
  // and the documents menu has nothing to point at.
  useEffect(() => {
    if (!hasProject) {
      setTabsOpen(false);
      docs.close();
    }
  }, [hasProject]);

  useEffect(() => {
    const el = folderRef.current;
    if (!docs.isOpen || !el) return;
    const rect = el.getBoundingClientRect();
    // Anchored to the folder, nudged inward so it never runs off either edge.
    setDocsAnchorX(Math.min(Math.max(rect.left - 8, 8), window.innerWidth - 272));
  }, [docs.isOpen]);

  // The Add Shift popover belongs to the Schedule tab; leaving it takes it away.
  useEffect(() => {
    if (state.activeTab !== 'schedule') addShift.closeMenu();
  }, [state.activeTab]);

  useEffect(() => {
    const el = scheduleTabRef.current;
    if (!addShift.menuOpen || !el) return;
    const rect = el.getBoundingClientRect();
    // Keep it on screen when the tab sits near either edge.
    setAddShiftAnchorX(Math.min(Math.max(rect.left + rect.width / 2, 84), window.innerWidth - 84));
  }, [addShift.menuOpen]);

  function setTab(tab: TabName) {
    dispatch({ type: 'SET_ACTIVE_TAB', tab });
  }

  /**
   * Schedule is the one tab that does something when you're already on it:
   * tapping it raises the Add Shift popover, and tapping again puts it away.
   */
  function onTabClick(tab: TabName) {
    if (tab === 'schedule') {
      if (state.activeTab === 'schedule') {
        addShift.toggleMenu();
        return;
      }
      addShift.closeMenu();
    } else {
      addShift.closeMenu();
    }
    docs.close();
    setTab(tab);
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
    // Tapping the folder again folds the documents menu back into it.
    if (docs.isOpen) {
      docs.close();
      setTabsOpen(false);
      return;
    }
    setTabsOpen(o => !o);
  }

  const t = state.activeTab;

  return (
    <>
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-ios-gray-200"
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
          ref={folderRef}
          onClick={onFolderClick}
          aria-expanded={hasProject ? tabsOpen : undefined}
          aria-label={hasProject ? `${projectName || 'Project'} tabs` : 'Projects'}
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
            {PROJECT_TABS.filter((d) => canOpenTab(level, d.tab)).map(({ tab, label, icon }) => (
              <button
                key={tab}
                ref={tab === 'schedule' ? scheduleTabRef : undefined}
                onClick={() => onTabClick(tab)}
                aria-expanded={tab === 'schedule' ? addShift.menuOpen : undefined}
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
            {DOC_DESTINATIONS.some((d) => canOpenTab(level, d.tab)) && <button
              onClick={() => { addShift.closeMenu(); docs.toggle(); }}
              aria-expanded={docs.isOpen}
              tabIndex={tabsOpen ? 0 : -1}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                docs.isOpen || DOC_TABS.has(t) ? 'text-teal-600' : 'text-ios-gray-500'
              }`}
            >
              <IconDocs />
              <span className="text-[9px] font-medium leading-none truncate w-full text-center px-0.5">
                Files
              </span>
            </button>}
          </div>
        </div>

        {/* Spacer — fills the bar while the drawer is collapsed, and gives way
            as it opens. */}
        <div className="flex-1 min-w-0" />

      </div>
    </nav>

      {/*
        Add Shift popover — a sibling of the bar, not a child, so it can sit
        above it while its click-catcher sits below and leaves the Schedule tab
        live for the second tap that closes it.
      */}
      {addShift.menuOpen && (
        <div className="lg:hidden fixed inset-0 z-[45]" onClick={addShift.closeMenu} aria-hidden="true" />
      )}
      <div
        aria-hidden={!addShift.menuOpen}
        className="lg:hidden fixed z-[55]"
        style={{
          left: `${addShiftAnchorX}px`,
          bottom: 'calc(56px + env(safe-area-inset-bottom) + 8px)',
          transformOrigin: 'bottom center',
          opacity: addShift.menuOpen ? 1 : 0,
          transform: addShift.menuOpen
            ? 'translateX(-50%) translateY(0) scale(1)'
            : 'translateX(-50%) translateY(10px) scale(0.94)',
          pointerEvents: addShift.menuOpen ? 'auto' : 'none',
          transition: 'opacity 160ms ease-out, transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <button
          onClick={addShift.openSheet}
          tabIndex={addShift.menuOpen ? 0 : -1}
          className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl shadow-xl border border-ios-gray-200 text-teal-600 active:bg-teal-50 lg:hover:bg-teal-50 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          <span className="text-sm font-semibold">Add Shift</span>
        </button>
      </div>

      {/* Project documents menu — rises out of the project folder. */}
      {docs.isOpen && (
        <div className="lg:hidden fixed inset-0 z-[45]" onClick={docs.close} aria-hidden="true" />
      )}
      <div
        aria-hidden={!docs.isOpen}
        className="lg:hidden fixed z-[55] w-64 bg-white rounded-2xl shadow-xl border border-ios-gray-200 overflow-hidden"
        style={{
          left: `${docsAnchorX}px`,
          maxWidth: 'calc(100vw - 16px)',
          bottom: 'calc(56px + env(safe-area-inset-bottom) + 8px)',
          transformOrigin: 'bottom left',
          opacity: docs.isOpen ? 1 : 0,
          transform: docs.isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.94)',
          pointerEvents: docs.isOpen ? 'auto' : 'none',
          transition: 'opacity 160ms ease-out, transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="px-4 pt-3 pb-1">
          <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider truncate">
            {projectName || 'Project'}
          </p>
        </div>
        <div className="p-2 pt-1 space-y-0.5">
          {DOC_DESTINATIONS.filter((d) => canOpenTab(level, d.tab)).map(({ tab, label, hint, icon }) => {
            const isCurrent = t === tab;
            return (
              <button
                key={tab}
                onClick={() => { docs.close(); setTab(tab); }}
                tabIndex={docs.isOpen ? 0 : -1}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:bg-ios-gray-100 lg:hover:bg-ios-gray-100 ${
                  isCurrent ? 'bg-teal-50' : ''
                }`}
              >
                <span className={`w-5 h-5 flex-shrink-0 ${isCurrent ? 'text-teal-600' : 'text-ios-gray-500'}`}>
                  {icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold truncate ${isCurrent ? 'text-teal-700' : 'text-teal-900'}`}>
                    {label}
                  </span>
                  <span className="block text-[11px] text-ios-gray-500 truncate">{hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
