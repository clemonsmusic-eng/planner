import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { ShiftEditSheet, type ShiftEditValues } from '../components/ShiftEditSheet';
import { AddShiftSheet } from '../components/AddShiftSheet';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { LockButton } from '../components/LockButton';
import { formatDateLabel, shiftTimeRange } from '../lib/dateUtils';
import { startTimeLookup } from '../lib/shiftStartTimes';
import { useAddShift } from '../components/AddShiftContext';
import { FloatingSaveButton, FloatingSaveSpacer } from '../components/FloatingSaveButton';
import { applyScheduleEdit, type ScheduleEdit } from '../lib/scheduleEdits';
import { applyShiftEdit } from '../lib/applyShiftEdit';
import { totalBudgetedHours } from '../lib/budgets';
import { DragGhost, ScheduleCalendar, useShiftDrag, type DragPayload } from '../components/ScheduleCalendar';
import { useIsWideLayout } from '../lib/useMediaQuery';
import { can } from '../lib/access';
import { ExportScheduleButton } from '../components/ExportPlanButton';
import type { ScheduleEntry, ScheduleDay, TeamMember, ExperienceLevel, TeamMemberAvailability, PhaseId, RoleType } from '../types';

const RAIL_WIDTH_KEY = 'st-planner-schedule-rail-width';
const RAIL_MIN = 260;
const RAIL_MAX = 620;

const PACK_SORT_PHASES = new Set(['phase-3', 'phase-4-1', 'phase-4-2']);
const CLEANOUT_PHASES  = new Set(['phase-6', 'phase-lot-prep', 'phase-pickup-prep', 'phase-7']);

const DAY_NAMES: (keyof TeamMemberAvailability)[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isMemberAvailableForShift(member: TeamMember, dateStr: string, shift: 'AM' | 'PM' | 'Full Day'): boolean {
  if ((member.timeOff ?? []).some((t) => dateStr >= t.startDate && dateStr <= t.endDate)) return false;
  const d = new Date(dateStr + 'T12:00:00');
  const slot = member.availability[DAY_NAMES[d.getDay()]];
  if (slot === 'Unavailable') return false;
  if (slot === 'Full Day') return true;
  return slot === shift;
}

function isMemberApprovedForRole(member: TeamMember, phaseId: string, role: RoleType): boolean {
  const pr = member.phaseRoles[phaseId as PhaseId];
  if (!pr || pr === 'N/A') return false;
  return pr.includes(role);
}

function experienceMultiplier(level: ExperienceLevel): string {
  return level === 'High' ? '0.85×' : level === 'Low' ? '1.15×' : '1.00×';
}

function experienceBadgeClass(level: ExperienceLevel): string {
  return level === 'High'
    ? 'bg-green-100 text-green-800'
    : level === 'Low'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-ios-gray-100 text-ios-gray-600';
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-400 flex-shrink-0">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}


function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
    </svg>
  );
}

type FilterMode = 'all' | 'conflicts' | string; // string = memberId

const ROLE_COLORS: Record<string, string> = {
  PM: 'bg-teal-100 text-teal-800',
  'Assist PM': 'bg-purple-100 text-purple-800',
  Lead: 'bg-blue-100 text-blue-800',
  Specialist: 'bg-green-100 text-green-800',
  Mover: 'bg-orange-100 text-orange-800',
};

const SHIFT_LABELS: Record<string, string> = {
  AM: 'AM',
  PM: 'PM',
  'Full Day': 'Full Day',
};

/** The distinct shifts on a day, in the order they appear on it. */
function phasesOn(day: ScheduleDay): { id: string; name: string }[] {
  return [...new Map(day.entries.map((e) => [e.phaseId, { id: e.phaseId, name: e.phaseName }])).values()];
}

/** What the edit window was opened on: one shift, or every shift on a day. */
interface ShiftEditorTarget {
  date: string;
  /** Absent for a whole day, in which case every shift on it is edited. */
  phaseId?: string;
  title: string;
  subtitle: string;
  initial: ShiftEditValues;
}

export function SchedulePage() {
  const { state, dispatch, activeProject: storedProject, generateAndSaveSchedule } = useApp();

  /*
   * The Schedule tab works on a draft and commits on Save.
   *
   * Everything here used to write straight through, so a mis-tap was already
   * saved by the time it was noticed. The draft lives on app state rather than
   * in this component so switching tabs mid-edit doesn't silently discard it,
   * and it is deliberately not persisted — work in progress is not a plan.
   */
  const draft = state.scheduleDraft?.id === storedProject?.id ? state.scheduleDraft : null;
  const activeProject = draft ?? storedProject;
  const isDirty = !!draft;
  /*
   * A Team Member sees the schedule but does not change it, which is exactly
   * what the schedule lock already means — so read-only access rides on the
   * same flag rather than growing a second disabled path beside it.
   */
  const readOnly = !can(state.access.level, 'editSchedule');
  const scheduleLocked = readOnly || !!activeProject?.inputs.scheduleLocked;

  /** Route an edit into the draft, starting one from the stored project. */
  function edit(e: ScheduleEdit) {
    if (!activeProject || scheduleLocked) return;
    dispatch({ type: 'SET_SCHEDULE_DRAFT', project: applyScheduleEdit(activeProject, e, state.teamMembers) });
  }

  /** A shift's start, where one was set on it rather than left to Settings. */
  const startTimeOf = startTimeLookup(activeProject?.inputs);

  /**
   * Open the edit window on a day, or on one shift within it.
   *
   * A day carrying two shifts has to answer with one of them, so the first is
   * what the window opens on — the same shift the day header already reports.
   */
  function openEditor(day: ScheduleDay, phaseId?: string) {
    const entries = phaseId ? day.entries.filter((e) => e.phaseId === phaseId) : day.entries;
    const first = entries[0];
    if (!first) return;
    setShiftEditor({
      date: day.date,
      phaseId,
      title: phaseId ? `Edit ${first.phaseName}` : 'Edit Shift',
      subtitle: phaseId ? day.label : `${day.label} · ${new Set(day.entries.map((e) => e.phaseId)).size} shift(s)`,
      initial: {
        shift: first.shift,
        date: day.date,
        startTime: startTimeOf(first.phaseId, day.date) ?? null,
      },
    });
  }

  /** Route the edit window's answers into the draft. */
  function applyShiftEditor(target: ShiftEditorTarget, values: ShiftEditValues) {
    if (!activeProject || scheduleLocked) return;
    const next = applyShiftEdit(activeProject, target, values, state.teamMembers);
    if (next !== activeProject) dispatch({ type: 'SET_SCHEDULE_DRAFT', project: next });
  }

  /**
   * Drop every shift on a day.
   *
   * The date line acts on the day, so a day carrying two shifts loses both —
   * composed into one dispatch rather than a call per phase, since each edit
   * reads the project it was handed and they would otherwise overwrite one
   * another.
   */
  function removeWholeDay(day: ScheduleDay) {
    if (!activeProject || scheduleLocked) return;
    const next = phasesOn(day).reduce(
      (project, phase) =>
        applyScheduleEdit(project, { kind: 'removeShift', date: day.date, phaseId: phase.id }, state.teamMembers),
      activeProject
    );
    if (next !== activeProject) dispatch({ type: 'SET_SCHEDULE_DRAFT', project: next });
  }

  const addShift = useAddShift();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // No phaseId means the whole day is being edited; the header button acts on
  // every shift that day, the one on a shift card acts on that shift alone.
  const [shiftEditor, setShiftEditor] = useState<ShiftEditorTarget | null>(null);
  const [memberPickerEntry, setMemberPickerEntry] = useState<ScheduleEntry | null>(null);
  const [removeDay, setRemoveDay] = useState<ScheduleDay | null>(null);
  const [copyPicker, setCopyPicker] = useState<{ phaseId?: string; fromDate: string; label: string } | null>(null);
  const memberMap = new Map<string, TeamMember>(state.teamMembers.map((m) => [m.id, m]));

  /*
   * The wide layout puts a month calendar beside the list and lets a shift be
   * dragged onto a day. A drop re-dates the shift and touches nothing else —
   * the crew, hours, roles and note all come across untouched.
   */
  const isWide = useIsWideLayout();
  const { drag, dragHandle } = useShiftDrag(isWide && !scheduleLocked, (payload, toDate) =>
    edit({ kind: 'moveShift', fromDate: payload.date, toDate, phaseId: payload.phaseId })
  );
  const [focusDate, setFocusDate] = useState<string | null>(null);

  /*
   * How wide the calendar rail is, kept on the device so it survives a reload.
   * Clamped so neither side can be dragged away to nothing.
   */
  const [railWidth, setRailWidth] = useState(() => {
    const stored = Number(localStorage.getItem(RAIL_WIDTH_KEY));
    return Number.isFinite(stored) && stored >= RAIL_MIN && stored <= RAIL_MAX ? stored : 360;
  });

  function startRailDrag(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = railWidth;
    // Window listeners, not pointer capture: the divider re-renders on every
    // move, which would take a capture on it with each new node.
    const move = (ev: PointerEvent) => {
      const next = Math.min(RAIL_MAX, Math.max(RAIL_MIN, startWidth + ev.clientX - startX));
      setRailWidth(next);
    };
    const up = (ev: PointerEvent) => {
      move(ev);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      try {
        localStorage.setItem(RAIL_WIDTH_KEY, String(Math.min(RAIL_MAX, Math.max(RAIL_MIN, startWidth + ev.clientX - startX))));
      } catch {
        /* storage blocked; the width simply won't persist */
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  /** Clicking a day in the calendar opens it in the list and scrolls it in. */
  function revealDay(date: string) {
    setFocusDate(date);
    setCollapsedDays((prev) => {
      if (!prev.has(date)) return prev;
      const next = new Set(prev);
      next.delete(date);
      return next;
    });
    requestAnimationFrame(() =>
      document.getElementById(`sched-day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-teal-400">
            <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-teal-900 mb-1">No Project Selected</h2>
          <p className="text-ios-gray-600 text-sm">Select a project from the Projects tab first.</p>
        </div>
        <button
          onClick={() => { dispatch({ type: 'SET_PROJECT_LIST_FILTER', filter: 'all' }); dispatch({ type: 'SET_ACTIVE_TAB', tab: 'projects' }); }}
          className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  const schedule = activeProject.schedule;
  const budgetHours = totalBudgetedHours(activeProject.inputs.phaseBudgets);
  const budgetPct = budgetHours > 0 ? Math.round(((schedule?.totalScheduledHours ?? 0) / budgetHours) * 100) : 0;

  /*
   * A plan opens folded.
   *
   * Sixteen days of shifts with every crew member listed is several screens
   * before you reach the second week, and the question the page is usually
   * asked is "what days is this job on" rather than "who is on the fourth
   * one". The date lines carry the shift, its window and its crew count
   * already, so the folded list is a plan you can take in at once and open
   * where you need to.
   *
   * Applied once per project rather than on every render, so opening a day and
   * then editing it does not fold it up again underneath you.
   */
  const folded = useRef<string | null>(null);
  useEffect(() => {
    const id = activeProject?.id;
    if (!id || !schedule || folded.current === id) return;
    folded.current = id;
    setCollapsedDays(new Set(schedule.days.map((d) => d.date)));
  }, [activeProject?.id, schedule]);

  const allFolded = (schedule?.days.length ?? 0) > 0
    && collapsedDays.size >= (schedule?.days.length ?? 0);

  /** Fold or unfold every day at once, from the header. */
  function toggleAllDays() {
    const days = schedule?.days.map((d) => d.date) ?? [];
    setCollapsedDays((prev) => (prev.size >= days.length ? new Set() : new Set(days)));
  }

  function toggleDay(date: string) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  function getFilteredDays(): ScheduleDay[] {
    if (!schedule) return [];
    if (filter === 'all') return schedule.days;
    if (filter === 'conflicts') {
      return schedule.days
        .map((day) => ({
          ...day,
          entries: day.entries.filter(
            (e) => e.status === 'needs-assignment' || e.status === 'conflict' || e.status === 'over-max'
          ),
        }))
        .filter((day) => day.entries.length > 0);
    }
    // Filter by member
    return schedule.days
      .map((day) => ({
        ...day,
        entries: day.entries.filter((e) => e.assignedMember === filter),
      }))
      .filter((day) => day.entries.length > 0);
  }

  const filteredDays = getFilteredDays();

  const conflictCount =
    schedule?.days.reduce(
      (sum, d) =>
        sum +
        d.entries.filter(
          (e) => e.status === 'needs-assignment' || e.status === 'conflict' || e.status === 'over-max'
        ).length,
      0
    ) ?? 0;

  const assignedMembers = schedule
    ? Array.from(
        new Set(
          schedule.days
            .flatMap((d) => d.entries)
            .filter((e) => e.assignedMember)
            .map((e) => ({ id: e.assignedMember!, name: e.assignedMemberName! }))
            .map((m) => JSON.stringify(m))
        )
      )
        .map((s) => JSON.parse(s) as { id: string; name: string })
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const filterLabel =
    filter === 'all'
      ? 'All'
      : filter === 'conflicts'
      ? `Conflicts (${conflictCount})`
      : assignedMembers.find((m) => m.id === filter)?.name ?? 'Filtered';

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        {/*
          Above the day headers below, which are sticky at z-10 and come later
          in the DOM — without this the project picker and the export menu both
          open behind the list they sit over.
        */}
        <div
          className="sticky top-0 z-20 bg-white border-b border-ios-gray-200 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
        >
          <div className="flex items-center gap-2 mb-2">
            {/* Project picker */}
            <div className="flex-1 min-w-0 relative">
              <button
                onClick={() => setPickerOpen(o => !o)}
                className="flex items-center gap-1 min-w-0 max-w-full"
              >
                {/*
                  On a wide screen the project rides beside the title rather
                  than under it — that row has the width to spare, and it buys
                  the list back a line of height.
                */}
                <div className="min-w-0 lg:flex lg:items-baseline lg:gap-2">
                  <h1 className="text-xl font-bold text-teal-900 leading-tight text-left lg:flex-shrink-0">Schedule</h1>
                  <p className="text-xs lg:text-sm text-ios-gray-600 truncate text-left lg:min-w-0">
                    {activeProject.inputs.clientName || 'No project'} · {schedule?.days.length ?? 0} days
                  </p>
                </div>
                <ChevronDownIcon />
              </button>
              {pickerOpen && (
                <div className="absolute top-full left-0 z-30 mt-1 bg-white rounded-xl shadow-lg border border-ios-gray-200 w-[260px] max-h-[280px] overflow-y-auto">
                  {state.projects
                    .filter(p => (p.inputs.status ?? 'active') !== 'archived')
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          dispatch({ type: 'SET_ACTIVE_PROJECT', id: p.id });
                          setPickerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-4 py-3 text-left border-b border-ios-gray-100 last:border-0 ${p.id === activeProject?.id ? 'bg-teal-50' : 'active:bg-ios-gray-50'}`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.id === activeProject?.id ? 'bg-teal-600' : 'bg-ios-gray-300'}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${p.id === activeProject?.id ? 'text-teal-700' : 'text-teal-900'}`}>
                            {p.inputs.clientName || 'Untitled'}
                          </p>
                          <p className="text-xs text-ios-gray-500 truncate">{p.inputs.community}</p>
                        </div>
                        <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          (p.inputs.status ?? 'active') === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {(p.inputs.status ?? 'active')}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
            {schedule && can(state.access.level, 'exportFiles') && (
              <ExportScheduleButton project={activeProject} schedule={schedule} />
            )}
            {!readOnly && <LockButton
              isLocked={scheduleLocked}
              onToggle={() =>
                dispatch({ type: 'SET_LOCK', projectId: activeProject.id, which: 'schedule', locked: !scheduleLocked })
              }
            />}
            {!readOnly && <button
              onClick={() => {
                dispatch({ type: 'SET_SCHEDULE_DRAFT', project: null });
                generateAndSaveSchedule(activeProject.id);
              }}
              disabled={scheduleLocked}
              className="flex-shrink-0 px-3 py-1.5 bg-teal-50 text-teal-600 rounded-xl text-sm font-semibold min-h-[36px] active:opacity-70 lg:hover:opacity-80 disabled:opacity-40"
            >
              Regenerate
            </button>}
          </div>

          {/*
            How much of the budget the plan spends. It sits at the top because
            it is the number every edit below moves — adding crew or hours here
            is what pushes a job over what was sold.
          */}
          {schedule && budgetHours > 0 && (
            <div className="mb-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-ios-gray-600">
                  {formatHours(schedule.totalScheduledHours)} of {formatHours(budgetHours)} budgeted hours
                </span>
                <span className={`text-sm font-bold tabular-nums ${budgetPct > 100 ? 'text-red-600' : 'text-teal-700'}`}>
                  {budgetPct}%
                </span>
              </div>
              <div className="h-1.5 bg-ios-gray-100 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all ${budgetPct > 100 ? 'bg-red-500' : 'bg-teal-500'}`}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/*
            Filter and Add Shift share a row. One narrows the list and the
            other adds to it, and between them they were costing two lines of
            a header that has to leave the list some screen.
          */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ios-gray-100 rounded-full text-sm font-medium text-teal-700 min-h-[36px] flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
              </svg>
              {filterLabel}
            </button>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-xs text-ios-gray-600 px-2 py-1 flex-shrink-0"
              >
                Clear
              </button>
            )}
            {/*
              The way back out of a folded plan. Reads as what it will do
              rather than what the list currently is, since that is the thing
              being decided.
            */}
            {schedule && schedule.days.length > 0 && (
              <button
                onClick={toggleAllDays}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-teal-700 bg-ios-gray-100 min-h-[36px] flex-shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                  className={`w-3.5 h-3.5 transition-transform ${allFolded ? '' : 'rotate-180'}`}>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
                {allFolded ? 'Expand all' : 'Collapse all'}
              </button>
            )}
            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {conflictCount > 0 && filter !== 'conflicts' && (
                <button
                  onClick={() => setFilter('conflicts')}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold"
                >
                  <span className="w-2 h-2 bg-red-500 rounded-full" />
                  {conflictCount} issues
                </button>
              )}
              {/* Add a shift the generator didn't place */}
              {!readOnly && (
                <button
                  onClick={addShift.openSheet}
                  disabled={!schedule}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-600 text-teal-600 text-sm font-semibold min-h-[36px] active:bg-teal-50 lg:hover:bg-teal-50 disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  Add Shift
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {/*
          A disabled fieldset turns off every control it contains, which is what
          the schedule lock has to mean. It is the scroll container itself
          because Chromium stops propagating disabled through display:contents.
        */}
        <fieldset
          disabled={scheduleLocked}
          className={`flex-1 min-w-0 flex flex-col lg:flex-row overflow-hidden ${scheduleLocked ? 'opacity-60' : ''}`}
        >
          {/* Calendar rail — wide layout only; the phone keeps the plain list. */}
          {schedule && (
            <div
              className="hidden lg:block flex-shrink-0 overflow-y-auto border-r border-ios-gray-200 bg-ios-gray-50"
              style={{ width: railWidth }}
            >
              <ScheduleCalendar
                days={schedule.days}
                activeDate={focusDate}
                onPickDate={revealDay}
                dropDate={drag?.over ?? null}
                dragging={!!drag}
                disabled={scheduleLocked}
              />
            </div>
          )}

          {/*
            The split between the calendar and the list. Dragged rather than
            fixed because which side matters changes with the job — a long plan
            wants a wide calendar, a heavily crewed one wants the list.
          */}
          {schedule && (
            <div
              onPointerDown={startRailDrag}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize the calendar"
              className="hidden lg:flex w-1.5 flex-shrink-0 cursor-col-resize items-center justify-center bg-ios-gray-100 hover:bg-teal-200 active:bg-teal-300 transition-colors"
              style={{ touchAction: 'none' }}
            >
              <span className="w-0.5 h-8 rounded-full bg-ios-gray-400" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-w-0">
          {!schedule ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
              <p className="text-ios-gray-600 text-sm">No schedule generated yet.</p>
              <button
                onClick={() => {
                dispatch({ type: 'SET_SCHEDULE_DRAFT', project: null });
                generateAndSaveSchedule(activeProject.id);
              }}
                className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
              >
                Generate Schedule
              </button>
            </div>
          ) : filteredDays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-ios-gray-300">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
              </svg>
              <p className="text-ios-gray-600 text-sm">No issues found!</p>
            </div>
          ) : (
            <div className="pb-6">
              {filteredDays.map((day) => (
                <DaySection
                  key={day.date}
                  day={day}
                  collapsed={collapsedDays.has(day.date)}
                  onToggle={() => toggleDay(day.date)}
                  hasOverride={activeProject.inputs.dateOverrides.some((o) => o.date === day.date)}
                  onEditDay={() => openEditor(day)}
                  onCopyDay={() => setCopyPicker({ fromDate: day.date, label: day.label })}
                  onRemoveDay={() => setRemoveDay(day)}
                  dragHandle={dragHandle}
                  memberMap={memberMap}
                  onPickMember={setMemberPickerEntry}
                  onAddRole={(phaseId) => edit({ kind: 'addRole', date: day.date, phaseId, role: 'Specialist' })}
                  onRemoveRole={(entryId) => edit({ kind: 'removeRole', entryId })}
                  timeFor={(phaseId, shift, hrs) =>
                    shiftTimeRange(shift, hrs, state.shiftTimes, startTimeOf(phaseId, day.date))
                  }
                  hasSetTime={(phaseId) => startTimeOf(phaseId, day.date) !== undefined}
                  highlighted={focusDate === day.date}
                  noteFor={(phaseId) =>
                    (activeProject.inputs.shiftNotes ?? []).find((n) => n.phaseId === phaseId && n.date === day.date)?.note ?? ''
                  }
                  onSetNote={(phaseId, note) => edit({ kind: 'setNote', phaseId, date: day.date, note })}
                  onSetHours={(phaseId, hours) =>
                    edit({ kind: 'setHours', date: day.date, phaseId, hours })
                  }
                />
              ))}
              {isDirty && <FloatingSaveSpacer />}
            </div>
          )}
          </div>
        </fieldset>
      </div>

      <DragGhost drag={drag} />

      {/* Filter Sheet */}
      {showFilterSheet && (
        <FilterSheet
          currentFilter={filter}
          conflictCount={conflictCount}
          assignedMembers={assignedMembers}
          onSelect={(f) => {
            setFilter(f);
            setShowFilterSheet(false);
          }}
          onClose={() => setShowFilterSheet(false)}
        />
      )}

      {/*
        Shift type, date and start time in one window. The date change re-dates
        the entries as they stand rather than regenerating, so a move keeps the
        crew and hours already set on the shift.
      */}
      {shiftEditor && (
        <ShiftEditSheet
          title={shiftEditor.title}
          subtitle={shiftEditor.subtitle}
          initial={shiftEditor.initial}
          shiftTimes={state.shiftTimes}
          onApply={(values) => applyShiftEditor(shiftEditor, values)}
          onClose={() => setShiftEditor(null)}
        />
      )}

      {copyPicker && (
        <DateMoveSheet
          title={`Copy ${copyPicker.label}`}
          confirmLabel="Copy"
          originalDate={copyPicker.fromDate}
          onMove={(newDate) =>
            edit({
              kind: 'duplicateShift',
              fromDate: copyPicker.fromDate,
              toDate: newDate,
              phaseId: copyPicker.phaseId,
            })
          }
          onClose={() => setCopyPicker(null)}
        />
      )}

      {removeDay && (
        <ConfirmSheet
          title="Remove shift"
          message={`Remove ${phasesOn(removeDay).map((p) => p.name).join(' and ')} on ${formatDateLabel(
            removeDay.date
          )}? A regenerate will not bring it back.`}
          confirmLabel="Remove Shift"
          onConfirm={() => {
            removeWholeDay(removeDay);
            setRemoveDay(null);
          }}
          onClose={() => setRemoveDay(null)}
        />
      )}

      {memberPickerEntry && (
        <MemberPickerSheet
          entry={memberPickerEntry}
          teamMembers={state.teamMembers}
          onSelect={(memberId, memberName) => {
            edit({ kind: 'assignMember', entryId: memberPickerEntry.id, memberId, memberName });
            setMemberPickerEntry(null);
          }}
          onClose={() => setMemberPickerEntry(null)}
        />
      )}

      {addShift.sheetOpen && (
        <AddShiftSheet
          phaseTemplates={state.phaseTemplates}
          defaultDate={schedule?.days[0]?.date ?? activeProject.inputs.targetMoveDate}
          teamMembers={state.teamMembers}
          projects={state.projects}
          onAdd={(shift) => edit({ kind: 'addShift', shift })}
          onClose={addShift.closeSheet}
        />
      )}

      {isDirty && <FloatingSaveButton onSave={() => dispatch({ type: 'COMMIT_SCHEDULE_DRAFT' })} />}
    </>
  );
}

function DaySection({
  day,
  collapsed,
  onToggle,
  hasOverride,
  onEditDay,
  memberMap,
  onPickMember,
  onAddRole,
  onRemoveRole,
  onRemoveDay,
  onCopyDay,
  dragHandle,
  highlighted,
  noteFor,
  timeFor,
  hasSetTime,
  onSetNote,
  onSetHours,
}: {
  day: ScheduleDay;
  collapsed: boolean;
  onToggle: () => void;
  hasOverride: boolean;
  onEditDay: () => void;
  memberMap: Map<string, TeamMember>;
  onPickMember: (entry: ScheduleEntry) => void;
  onAddRole: (phaseId: string) => void;
  onRemoveRole: (entryId: string) => void;
  onRemoveDay: () => void;
  onCopyDay: () => void;
  dragHandle: (payload: DragPayload) => Record<string, unknown>;
  highlighted: boolean;
  noteFor: (phaseId: string) => string;
  timeFor: (phaseId: string, shift: 'AM' | 'PM' | 'Full Day', hours: number) => string;
  hasSetTime: (phaseId: string) => boolean;
  onSetNote: (phaseId: string, note: string) => void;
  onSetHours: (phaseId: string, hours: number) => void;
}) {
  const hasConflict = day.entries.some(
    (e) => e.status === 'needs-assignment' || e.status === 'conflict' || e.status === 'over-max'
  );

  const visitTypes = [...new Map(day.entries.map((e) => [e.phaseId, e.phaseName])).values()];

  /*
   * The clock windows for the day, on the date line where the date is.
   * One per distinct window rather than one per shift: two phases running the
   * same hours have one answer between them, and a day with an AM and a PM
   * crew has two worth stating.
   */
  const windows = [
    ...new Set(
      [...new Map(day.entries.map((e) => [e.phaseId, e])).values()]
        .map((e) => timeFor(e.phaseId, e.shift, e.hours))
        .filter(Boolean)
    ),
  ];

  return (
    <div id={`sched-day-${day.date}`} className={highlighted ? 'ring-2 ring-inset ring-teal-400 rounded-lg' : ''}>
      {/* Sticky section header */}
      <div
        className="sticky top-0 z-10 w-full flex items-center px-4 py-2.5 bg-ios-gray-100 border-b border-ios-gray-200"
        {...dragHandle({ date: day.date, label: day.label })}
      >
        <button onClick={onToggle} className="flex items-center justify-between flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-bold text-teal-800 flex-shrink-0">{day.label}</h3>
            {windows.length > 0 && (
              <span className="text-xs font-semibold text-teal-700 whitespace-nowrap flex-shrink-0">
                {windows.join(', ')}
              </span>
            )}
            {visitTypes.length > 0 && (
              <span className="text-xs text-ios-gray-500 truncate">· {visitTypes.join(' · ')}</span>
            )}
            {hasConflict && (
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
            )}
            {hasOverride && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 flex-shrink-0">
                Override
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span className="text-xs text-ios-gray-600">{day.entries.length} roles</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 text-ios-gray-500 transition-transform ${collapsed ? '-rotate-90' : ''}`}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </div>
        </button>
        {/*
          One button for when the shift happens — its slot, its date and its
          start time — rather than a clock for the first and a calendar for the
          second, which asked people to know which icon held which answer.
        */}
        <button
          onClick={onEditDay}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-200 lg:hover:bg-ios-gray-200 flex-shrink-0"
          aria-label={`Edit ${day.label}`}
        >
          <PencilIcon />
        </button>
        {/*
          Copy sits on the date line because that is what a copy changes: the
          same shifts, run again on another day.
        */}
        <button
          onClick={onCopyDay}
          className="ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-200 lg:hover:bg-ios-gray-200 flex-shrink-0"
          aria-label={`Copy ${day.label} to another date`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.62V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
            <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
          </svg>
        </button>
        <button
          onClick={onRemoveDay}
          className="ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-red-100 active:text-red-600 lg:hover:text-red-600 flex-shrink-0"
          aria-label={`Remove ${day.label}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-2 space-y-2">
          {groupEntriesByPhase(day.entries).map(({ phaseName, entries: phaseEntries }) => (
            <Card key={phaseName} className="overflow-hidden">
              {/* The phase bar doubles as the grab handle for this one shift. */}
              <div
                className="px-3 py-2 bg-ios-gray-100 border-b border-ios-gray-200 flex items-center justify-between gap-2"
                {...dragHandle({ date: day.date, phaseId: phaseEntries[0].phaseId, label: `${phaseName} · ${day.label}` })}
              >
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide min-w-0 truncate">{phaseName}</p>
                {/*
                  The clock window, so a start time set on this shift is visible
                  where it was set rather than only in the plan and the exports.
                */}
                <span
                  className={`text-[11px] whitespace-nowrap flex-shrink-0 ${
                    hasSetTime(phaseEntries[0].phaseId) ? 'font-semibold text-teal-700' : 'text-ios-gray-500'
                  }`}
                >
                  {phaseEntries[0].shift} ·{' '}
                  {timeFor(phaseEntries[0].phaseId, phaseEntries[0].shift, phaseEntries[0].hours)}
                </span>
              </div>
              <div className="divide-y divide-ios-gray-100">
                {phaseEntries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} memberMap={memberMap} onPickMember={onPickMember} />
                ))}
              </div>
              {/*
                What is left on the shift is its crew and its hours. Editing,
                copying and removing all live on the date line above, so the
                three of them are in one place rather than repeated per card.
              */}
              <div className="flex items-center gap-1 px-3 py-2 bg-ios-gray-50 border-t border-ios-gray-100">
                <div className="flex-1 flex items-center justify-end gap-1.5 pr-1 min-w-0">
                  {/* Hidden in the narrow band of the split layout, where the
                      calendar rail leaves this row no room for it. */}
                  <span className="text-xs text-ios-gray-500 whitespace-nowrap lg:hidden xl:inline">
                    {phaseEntries.length} {phaseEntries.length === 1 ? 'role' : 'roles'}
                  </span>
                  {/*
                    Hours per person, not the shift total: it's what the
                    generator assigns to each role, and the total below follows
                    from it and the crew size.
                  */}
                  <ShiftHoursInput
                    hours={phaseEntries[0].hours}
                    label={phaseName}
                    onChange={(h) => onSetHours(phaseEntries[0].phaseId, h)}
                  />
                  <span className="text-xs text-ios-gray-500 whitespace-nowrap">
                    ea ·{' '}
                    <span className="font-semibold text-teal-700">
                      {formatHours(phaseEntries.reduce((sum, e) => sum + e.hours, 0))} hrs
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => onRemoveRole(phaseEntries[phaseEntries.length - 1].id)}
                  disabled={phaseEntries.length <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-200 lg:hover:bg-ios-gray-200 disabled:opacity-30"
                  aria-label={`Remove a role from ${phaseName}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => onAddRole(phaseEntries[0].phaseId)}
                  className="h-8 px-2.5 flex items-center gap-1 rounded-lg text-teal-600 active:bg-teal-50 lg:hover:bg-teal-50 text-xs font-semibold"
                  aria-label={`Add a crew member to ${phaseName}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  Crew
                </button>
              </div>
              <ShiftNoteField
                phaseName={phaseName}
                note={noteFor(phaseEntries[0].phaseId)}
                onSave={(note) => onSetNote(phaseEntries[0].phaseId, note)}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hours per person on one shift.
 *
 * Committed on blur rather than per keystroke: every change recomputes the
 * plan's totals and rewrites the project, which is not something to do while
 * someone is still typing the number.
 */
function ShiftHoursInput({
  hours,
  label,
  onChange,
}: {
  hours: number;
  label: string;
  onChange: (hours: number) => void;
}) {
  const [draft, setDraft] = useState(String(hours));
  useEffect(() => { setDraft(String(hours)); }, [hours]);

  function commit() {
    const parsed = parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed <= 0) { setDraft(String(hours)); return; }
    const rounded = Math.max(0.5, Math.round(parsed * 2) / 2);
    if (rounded !== hours) onChange(rounded);
    setDraft(String(rounded));
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      min={0.5}
      step={0.5}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      aria-label={`Hours per person for ${label}`}
      className="w-12 text-center text-xs font-semibold text-teal-700 rounded-lg border border-ios-gray-300 py-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
    />
  );
}

/**
 * Note against one shift — what the crew needs to know before they arrive.
 * Collapsed to a single line when empty so it costs nothing on a day with
 * several shifts, and committed on blur rather than per keystroke so typing
 * doesn't rewrite the project on every character.
 */
function ShiftNoteField({
  phaseName,
  note,
  onSave,
}: {
  phaseName: string;
  note: string;
  onSave: (note: string) => void;
}) {
  const [open, setOpen] = useState(note.length > 0);
  const [draft, setDraft] = useState(note);

  // A regenerate or a note set elsewhere has to show up here.
  useEffect(() => {
    setDraft(note);
    if (note.length > 0) setOpen(true);
  }, [note]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-1.5 px-3 py-2 border-t border-ios-gray-100 text-xs font-semibold text-ios-gray-500 active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
      >
        {/* A plus, like every other "add" in the app — the pencil read as
            editing a note that isn't there yet. */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        Add a note
      </button>
    );
  }

  return (
    <div className="px-3 py-2 border-t border-ios-gray-100">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft.trim() !== note) onSave(draft);
          if (draft.trim() === '') setOpen(false);
        }}
        rows={2}
        placeholder="Gate code, parking, what to bring…"
        aria-label={`Note for the ${phaseName} shift`}
        className="w-full rounded-lg border border-ios-gray-200 px-2.5 py-2 text-sm text-teal-900 resize-y focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );
}

/** Man-hours read better as "6" than "6.0", but half-hours have to survive. */
function formatHours(hours: number): string {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

function groupEntriesByPhase(entries: ScheduleEntry[]) {
  const map = new Map<string, ScheduleEntry[]>();
  for (const entry of entries) {
    if (!map.has(entry.phaseName)) map.set(entry.phaseName, []);
    map.get(entry.phaseName)!.push(entry);
  }
  return Array.from(map.entries()).map(([phaseName, entryList]) => ({
    phaseName,
    entries: entryList,
  }));
}

function EntryRow({
  entry,
  memberMap,
  onPickMember,
}: {
  entry: ScheduleEntry;
  memberMap: Map<string, TeamMember>;
  onPickMember: (entry: ScheduleEntry) => void;
}) {
  const isConflict = entry.status === 'needs-assignment' || entry.status === 'conflict';
  const isOverMax = entry.status === 'over-max';

  const member = entry.assignedMember ? memberMap.get(entry.assignedMember) : undefined;
  const expCategory = PACK_SORT_PHASES.has(entry.phaseId)
    ? 'packAndSort'
    : CLEANOUT_PHASES.has(entry.phaseId)
    ? 'cleanout'
    : null;
  const expLevel: ExperienceLevel | null = expCategory && member?.experience
    ? member.experience[expCategory]
    : null;

  return (
    <button
      onClick={() => onPickMember(entry)}
      className={`w-full px-3 py-2.5 flex items-start gap-2 text-left active:bg-ios-gray-50 transition-colors ${isConflict ? 'bg-red-50' : isOverMax ? 'bg-yellow-50' : ''}`}
    >
      <span
        className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
          ROLE_COLORS[entry.role] ?? 'bg-ios-gray-100 text-teal-700'
        }`}
      >
        {entry.role}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {entry.status === 'needs-assignment' ? (
            <span className="text-sm font-semibold text-red-600">NEEDS ASSIGNMENT</span>
          ) : (
            <span className="text-sm font-medium text-teal-900 truncate">
              {entry.assignedMemberName}
            </span>
          )}
          {expLevel && expLevel !== 'Average' && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${experienceBadgeClass(expLevel)}`}>
              {expLevel} · {experienceMultiplier(expLevel)}
            </span>
          )}
          {(isConflict || isOverMax) && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
              className={`w-4 h-4 flex-shrink-0 ${isConflict ? 'text-red-500' : 'text-yellow-500'}`}>
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-ios-gray-600">
            {SHIFT_LABELS[entry.shift]} · {entry.hours}h
          </span>
          {entry.warnings.length > 0 && (
            <span className="text-xs text-yellow-700 truncate">
              {entry.warnings[0]}
            </span>
          )}
        </div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-300 flex-shrink-0 mt-0.5">
        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
      </svg>
    </button>
  );
}

function MemberPickerSheet({
  entry,
  teamMembers,
  onSelect,
  onClose,
}: {
  entry: ScheduleEntry;
  teamMembers: TeamMember[];
  onSelect: (memberId: string | null, memberName: string | null) => void;
  onClose: () => void;
}) {
  const approved = teamMembers.filter((m) => isMemberApprovedForRole(m, entry.phaseId, entry.role));
  const notApproved = teamMembers.filter((m) => !isMemberApprovedForRole(m, entry.phaseId, entry.role));

  function MemberRow({ member }: { member: TeamMember }) {
    const available = isMemberAvailableForShift(member, entry.date, entry.shift);
    const isSelected = entry.assignedMember === member.id;
    return (
      <button
        onClick={() => onSelect(member.id, member.name)}
        className={`w-full flex items-center gap-3 px-4 py-3 min-h-[50px] text-left active:bg-ios-gray-50 border-b border-ios-gray-100 last:border-0`}
      >
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${available ? 'bg-green-500' : 'bg-red-400'}`} />
        <span className={`flex-1 text-sm font-medium ${available ? 'text-teal-900' : 'text-ios-gray-500'}`}>
          {member.name}
        </span>
        {!available && (
          <span className="text-[10px] text-red-500 font-semibold flex-shrink-0">Unavailable</span>
        )}
        {isSelected && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-teal-600 flex-shrink-0">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-lg z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl flex flex-col"
        style={{ maxHeight: '75vh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-ios-gray-200">
          <div>
            <p className="font-bold text-teal-900 text-base">{entry.role}</p>
            <p className="text-xs text-ios-gray-500">{entry.phaseName} · {SHIFT_LABELS[entry.shift]}</p>
          </div>
          <button onClick={onClose} className="text-sm font-semibold text-teal-600 min-h-[36px] px-2">Done</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Unassign option */}
          {entry.assignedMember && (
            <>
              <button
                onClick={() => onSelect(null, null)}
                className="w-full flex items-center gap-3 px-4 py-3 min-h-[50px] text-left text-red-600 border-b border-ios-gray-200 active:bg-red-50"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-ios-gray-300" />
                <span className="text-sm font-medium">Unassign</span>
              </button>
            </>
          )}

          {/* Approved members */}
          {approved.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-ios-gray-50 border-b border-ios-gray-100">
                <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wide">Approved for Role</p>
              </div>
              {approved.map((m) => <MemberRow key={m.id} member={m} />)}
            </>
          )}

          {/* Divider */}
          {approved.length > 0 && notApproved.length > 0 && (
            <div className="px-4 py-1.5 bg-ios-gray-50 border-t border-b border-ios-gray-200 mt-1">
              <p className="text-[11px] font-bold text-ios-gray-400 uppercase tracking-wide">Not Approved for Role</p>
            </div>
          )}

          {/* Not-approved members */}
          {notApproved.map((m) => <MemberRow key={m.id} member={m} />)}
        </div>
      </div>
    </>
  );
}

function FilterSheet({
  currentFilter,
  conflictCount,
  assignedMembers,
  onSelect,
  onClose,
}: {
  currentFilter: FilterMode;
  conflictCount: number;
  assignedMembers: { id: string; name: string }[];
  onSelect: (f: FilterMode) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto lg:m-auto lg:max-w-lg lg:w-full bg-white rounded-t-3xl lg:rounded-3xl max-h-[60vh] flex flex-col">
        <div className="px-4 py-4 border-b border-ios-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold">Filter Schedule</h2>
          <button onClick={onClose} className="text-teal-600 font-semibold">Done</button>
        </div>
        <div className="overflow-y-auto divide-y divide-ios-gray-100">
          <FilterOption
            label="All Entries"
            active={currentFilter === 'all'}
            onClick={() => onSelect('all')}
          />
          <FilterOption
            label={`Conflicts Only (${conflictCount})`}
            active={currentFilter === 'conflicts'}
            onClick={() => onSelect('conflicts')}
            variant={conflictCount > 0 ? 'warning' : undefined}
          />
          <div className="px-4 py-2 bg-ios-gray-50">
            <p className="text-xs font-bold text-ios-gray-600 uppercase tracking-wide">By Team Member</p>
          </div>
          {assignedMembers.map((member) => (
            <FilterOption
              key={member.id}
              label={member.name}
              active={currentFilter === member.id}
              onClick={() => onSelect(member.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function FilterOption({
  label,
  active,
  onClick,
  variant,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'warning';
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 min-h-[50px] active:bg-ios-gray-50"
    >
      <span
        className={`text-base ${
          variant === 'warning' ? 'text-red-600 font-medium' : active ? 'text-teal-600 font-semibold' : 'text-teal-900'
        }`}
      >
        {label}
      </span>
      {active && (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-teal-600">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

function DateMoveSheet({
  originalDate,
  title,
  confirmLabel,
  onMove,
  onClose,
}: {
  originalDate: string;
  title: string;
  confirmLabel: string;
  onMove: (newDate: string) => void;
  onClose: () => void;
}) {
  const [newDate, setNewDate] = useState(originalDate);
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-lg z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl px-4 py-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <h3 className="font-bold text-teal-900 mb-4">{title}</h3>
        <input
          type="date"
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
          className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-ios-gray-300 text-ios-gray-600 font-semibold">Cancel</button>
          <button
            onClick={() => { if (newDate && newDate !== originalDate) onMove(newDate); onClose(); }}
            className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
