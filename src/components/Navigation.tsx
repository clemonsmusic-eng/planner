import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useMenu } from './MenuContext';
import { useAddShift } from './AddShiftContext';
import { useProjectDocs } from './ProjectDocsContext';
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
  { tab: 'schedule',  label: 'Schedule',  icon: <IconPlan /> },
  { tab: 'plan',      label: 'Plan',      icon: <IconSchedule /> },
  { tab: 'checklist', label: 'Checklist', icon: <IconChecklist /> },
];

const DOC_TABS = new Set<TabName>(['furniture', 'floorplans', 'photos']);

const IconDocs = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M19.5 21a3 3 0 003-3V9a3 3 0 00-3-3h-5.379a.75.75 0 01-.53-.22L11.47 3.66A2.25 2.25 0 009.879 3H4.5a3 3 0 00-3 3v12a3 3 0 003 3h15z" />
  </svg>
);

/** The documents menu entries, in the order they're used on a job. */
const DOC_DESTINATIONS: { tab: TabName; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    tab: 'furniture',
    label: 'Furniture Inventory',
    hint: 'Measurements, rooms, wishlist',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zM5 6.75A.75.75 0 015.75 6h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 015 6.75zm0 3.5a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75zm0 3.5a.75.75 0 01.75-.75h5.5a.75.75 0 010 1.5h-5.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    tab: 'floorplans',
    label: 'Floor Plans',
    hint: 'Destination layout PDFs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M2.5 3.75A1.25 1.25 0 013.75 2.5h12.5a1.25 1.25 0 011.25 1.25v12.5a1.25 1.25 0 01-1.25 1.25H3.75a1.25 1.25 0 01-1.25-1.25V3.75zM4 4v5h4V4H4zm5.5 0v5H16V4H9.5zM4 10.5V16h6.5v-5.5H4zm8 0V16h4v-5.5h-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    tab: 'photos',
    label: 'Photos',
    hint: 'Before, after, inventory, lots',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h13.5A2.25 2.25 0 0019 13.75v-7.5A2.25 2.25 0 0016.75 4H3.25zm10 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM3 13.5l3.75-3.75 2.5 2.5 3-3L17 13.5v.25a.75.75 0 01-.75.75H3.75A.75.75 0 013 13.75v-.25z" />
      </svg>
    ),
  },
];

export function Navigation() {
  const { state, dispatch } = useApp();
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
  const projectName = activeProject
    ? (activeProject.inputs.projectName || activeProject.inputs.clientName || 'Project')
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
          ref={folderRef}
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
            <button
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
            </button>
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
        <div className="fixed inset-0 z-[45]" onClick={addShift.closeMenu} aria-hidden="true" />
      )}
      <div
        aria-hidden={!addShift.menuOpen}
        className="fixed z-[55]"
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
          className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl shadow-xl border border-ios-gray-200 text-teal-600 active:bg-teal-50 whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          <span className="text-sm font-semibold">Add Shift</span>
        </button>
      </div>

      {/* Project documents menu — rises out of the project folder. */}
      {docs.isOpen && (
        <div className="fixed inset-0 z-[45]" onClick={docs.close} aria-hidden="true" />
      )}
      <div
        aria-hidden={!docs.isOpen}
        className="fixed z-[55] w-64 bg-white rounded-2xl shadow-xl border border-ios-gray-200 overflow-hidden"
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
          {DOC_DESTINATIONS.map(({ tab, label, hint, icon }) => {
            const isCurrent = t === tab;
            return (
              <button
                key={tab}
                onClick={() => { docs.close(); setTab(tab); }}
                tabIndex={docs.isOpen ? 0 : -1}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left active:bg-ios-gray-100 ${
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
