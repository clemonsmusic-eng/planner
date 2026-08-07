import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { ShiftOverrideSheet } from '../components/ShiftOverrideSheet';
import { AddShiftSheet } from '../components/AddShiftSheet';
import { ConfirmSheet } from '../components/ConfirmSheet';
import { LockButton } from '../components/LockButton';
import { formatDateLabel } from '../lib/dateUtils';
import { useAddShift } from '../components/AddShiftContext';
import { FloatingSaveButton, FloatingSaveSpacer } from '../components/FloatingSaveButton';
import type { ScheduleEntry, ScheduleDay, TeamMember, ExperienceLevel, TeamMemberAvailability, PhaseId, RoleType } from '../types';

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

export function SchedulePage() {
  const { state, dispatch, activeProject, generateAndSaveSchedule, setShiftOverride, movePhaseDate } = useApp();
  const addShift = useAddShift();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);
  const [dateMovePicker, setDateMovePicker] = useState<{ phaseId: string; originalDate: string } | null>(null);
  const [memberPickerEntry, setMemberPickerEntry] = useState<ScheduleEntry | null>(null);
  const [removeShift, setRemoveShift] = useState<{ phaseId: string; phaseName: string; date: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const memberMap = new Map<string, TeamMember>(state.teamMembers.map((m) => [m.id, m]));

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
        <div
          className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
        >
          <div className="flex items-center gap-2 mb-2">
            {/* Project picker */}
            <div className="flex-1 min-w-0 relative">
              <button
                onClick={() => setPickerOpen(o => !o)}
                className="flex items-center gap-1 min-w-0 max-w-full"
              >
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-teal-900 leading-tight text-left">Schedule</h1>
                  <p className="text-xs text-ios-gray-600 truncate text-left">
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
            <LockButton
              isLocked={!!activeProject.inputs.isLocked}
              onToggle={() => dispatch({ type: 'TOGGLE_LOCK', id: activeProject.id })}
            />
            <button
              onClick={() => { generateAndSaveSchedule(activeProject.id); setIsDirty(false); }}
              className="flex-shrink-0 px-3 py-1.5 bg-teal-50 text-teal-600 rounded-xl text-sm font-semibold min-h-[36px] active:opacity-70"
            >
              Regenerate
            </button>
          </div>

          {/* Add a shift the generator didn't place */}
          <button
            onClick={addShift.openSheet}
            disabled={!schedule}
            className="w-full flex items-center justify-center gap-1.5 mb-2 py-2 rounded-xl border border-teal-600 text-teal-600 text-sm font-semibold min-h-[40px] active:bg-teal-50 disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Shift
          </button>

          {/* Filter bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ios-gray-100 rounded-full text-sm font-medium text-teal-700 min-h-[36px]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
              </svg>
              {filterLabel}
            </button>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-xs text-ios-gray-600 px-2 py-1"
              >
                Clear
              </button>
            )}
            {conflictCount > 0 && filter !== 'conflicts' && (
              <button
                onClick={() => setFilter('conflicts')}
                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-semibold"
              >
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                {conflictCount} issues
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!schedule ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
              <p className="text-ios-gray-600 text-sm">No schedule generated yet.</p>
              <button
                onClick={() => generateAndSaveSchedule(activeProject.id)}
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
                  onOverride={() => setOverrideDate(day.date)}
                  onDateChange={() => setDateMovePicker({ phaseId: day.entries[0]?.phaseId ?? '', originalDate: day.date })}
                  memberMap={memberMap}
                  onPickMember={setMemberPickerEntry}
                  onAddRole={(phaseId) => dispatch({ type: 'ADD_SCHEDULE_ROLE', projectId: activeProject.id, date: day.date, phaseId, role: 'Specialist' })}
                  onRemoveRole={(entryId) => dispatch({ type: 'REMOVE_SCHEDULE_ROLE', projectId: activeProject.id, entryId })}
                  onMoveShift={(phaseId) => setDateMovePicker({ phaseId, originalDate: day.date })}
                  onRemoveShift={(phaseId, phaseName) => setRemoveShift({ phaseId, phaseName, date: day.date })}
                />
              ))}
              {isDirty && <FloatingSaveSpacer />}
            </div>
          )}
        </div>
      </div>

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

      {/* Shift Override Sheet */}
      {overrideDate && (
        <ShiftOverrideSheet
          date={overrideDate}
          current={activeProject.inputs.dateOverrides.find((o) => o.date === overrideDate)?.shift ?? null}
          onSelect={(shift) => setShiftOverride(activeProject.id, overrideDate, shift)}
          onClose={() => setOverrideDate(null)}
        />
      )}

      {dateMovePicker && (
        <DateMoveSheet
          originalDate={dateMovePicker.originalDate}
          // Moves this phase only — a day may hold a second shift that stays put.
          onMove={(newDate) =>
            movePhaseDate(activeProject.id, dateMovePicker.phaseId, dateMovePicker.originalDate, newDate)
          }
          onClose={() => setDateMovePicker(null)}
        />
      )}

      {removeShift && (
        <ConfirmSheet
          title="Remove shift"
          message={`Remove ${removeShift.phaseName} on ${formatDateLabel(removeShift.date)}? Any other shift that day stays.`}
          confirmLabel="Remove Shift"
          onConfirm={() => {
            dispatch({
              type: 'REMOVE_SHIFT',
              projectId: activeProject.id,
              date: removeShift.date,
              phaseId: removeShift.phaseId,
            });
            setRemoveShift(null);
          }}
          onClose={() => setRemoveShift(null)}
        />
      )}

      {memberPickerEntry && (
        <MemberPickerSheet
          entry={memberPickerEntry}
          teamMembers={state.teamMembers}
          onSelect={(memberId, memberName) => {
            dispatch({
              type: 'UPDATE_SCHEDULE_ENTRY',
              projectId: activeProject.id,
              entryId: memberPickerEntry.id,
              memberId,
              memberName,
            });
            setIsDirty(true);
            setMemberPickerEntry(null);
          }}
          onClose={() => setMemberPickerEntry(null)}
        />
      )}

      {addShift.sheetOpen && (
        <AddShiftSheet
          phaseTemplates={state.phaseTemplates}
          defaultDate={schedule?.days[0]?.date ?? activeProject.inputs.targetMoveDate}
          onAdd={(shift) => dispatch({ type: 'ADD_SHIFT', projectId: activeProject.id, shift })}
          onClose={addShift.closeSheet}
        />
      )}

      {isDirty && <FloatingSaveButton onSave={() => setIsDirty(false)} />}
    </>
  );
}

function DaySection({
  day,
  collapsed,
  onToggle,
  hasOverride,
  onOverride,
  onDateChange,
  memberMap,
  onPickMember,
  onAddRole,
  onRemoveRole,
  onMoveShift,
  onRemoveShift,
}: {
  day: ScheduleDay;
  collapsed: boolean;
  onToggle: () => void;
  hasOverride: boolean;
  onOverride: () => void;
  onDateChange: () => void;
  memberMap: Map<string, TeamMember>;
  onPickMember: (entry: ScheduleEntry) => void;
  onAddRole: (phaseId: string) => void;
  onRemoveRole: (entryId: string) => void;
  onMoveShift: (phaseId: string) => void;
  onRemoveShift: (phaseId: string, phaseName: string) => void;
}) {
  const hasConflict = day.entries.some(
    (e) => e.status === 'needs-assignment' || e.status === 'conflict' || e.status === 'over-max'
  );

  const visitTypes = [...new Map(day.entries.map((e) => [e.phaseId, e.phaseName])).values()];

  return (
    <div>
      {/* Sticky section header */}
      <div
        className="sticky top-0 z-10 w-full flex items-center px-4 py-2.5 bg-ios-gray-100 border-b border-ios-gray-200"
        style={{ top: '0' }}
      >
        <button onClick={onToggle} className="flex items-center justify-between flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-bold text-teal-800 flex-shrink-0">{day.label}</h3>
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
        <button
          onClick={onOverride}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-200 flex-shrink-0"
          aria-label="Override shift"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={onDateChange}
          className="ml-1 w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-200 flex-shrink-0"
          aria-label="Move to different date"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-2 space-y-2">
          {groupEntriesByPhase(day.entries).map(({ phaseName, entries: phaseEntries }) => (
            <Card key={phaseName} className="overflow-hidden">
              <div className="px-3 py-2 bg-ios-gray-100 border-b border-ios-gray-200">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">{phaseName}</p>
              </div>
              <div className="divide-y divide-ios-gray-100">
                {phaseEntries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} memberMap={memberMap} onPickMember={onPickMember} />
                ))}
              </div>
              {/*
                Per-shift controls. A day can hold more than one shift, so
                moving or deleting has to act on this phase alone rather than
                on everything scheduled that day.
              */}
              <div className="flex items-center gap-1 px-3 py-2 bg-ios-gray-50 border-t border-ios-gray-100">
                <button
                  onClick={() => onMoveShift(phaseEntries[0].phaseId)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-200 flex-shrink-0"
                  aria-label={`Move ${phaseName} to a different date`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => onRemoveShift(phaseEntries[0].phaseId, phaseName)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-red-100 active:text-red-600 flex-shrink-0"
                  aria-label={`Remove the ${phaseName} shift`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z" clipRule="evenodd" />
                  </svg>
                </button>
                <span className="text-xs text-ios-gray-500 flex-1 text-right pr-1">
                  {phaseEntries.length} {phaseEntries.length === 1 ? 'role' : 'roles'}
                  {' · '}
                  <span className="font-semibold text-teal-700">
                    {formatHours(phaseEntries.reduce((sum, e) => sum + e.hours, 0))} hrs
                  </span>
                </span>
                <button
                  onClick={() => onRemoveRole(phaseEntries[phaseEntries.length - 1].id)}
                  disabled={phaseEntries.length <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-500 active:bg-ios-gray-200 disabled:opacity-30"
                  aria-label={`Remove a role from ${phaseName}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => onAddRole(phaseEntries[0].phaseId)}
                  className="h-8 px-2.5 flex items-center gap-1 rounded-lg text-teal-600 active:bg-teal-50 text-xs font-semibold"
                  aria-label={`Add a crew member to ${phaseName}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  Crew
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
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
          ROLE_COLORS[entry.role] ?? 'bg-gray-100 text-teal-700'
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
        className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-2xl shadow-xl flex flex-col"
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
      <div className="relative mt-auto bg-white rounded-t-3xl max-h-[60vh] flex flex-col">
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
  onMove,
  onClose,
}: {
  originalDate: string;
  onMove: (newDate: string) => void;
  onClose: () => void;
}) {
  const [newDate, setNewDate] = useState(originalDate);
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-2xl shadow-xl px-4 py-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
      >
        <h3 className="font-bold text-teal-900 mb-4">Move to Different Date</h3>
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
            Move
          </button>
        </div>
      </div>
    </>
  );
}
