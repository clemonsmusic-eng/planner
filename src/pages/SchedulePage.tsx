import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { HamburgerButton } from '../components/HamburgerMenu';
import { ShiftOverrideSheet } from '../components/ShiftOverrideSheet';
import type { ScheduleEntry, ScheduleDay } from '../types';

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-400 flex-shrink-0">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

type FilterMode = 'all' | 'conflicts' | string; // string = memberId

const ROLE_COLORS: Record<string, string> = {
  PM: 'bg-indigo-100 text-indigo-800',
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
  const { state, dispatch, activeProject, generateAndSaveSchedule, setShiftOverride } = useApp();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-400">
            <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">No Project Selected</h2>
          <p className="text-ios-gray-600 text-sm">Select a project from the Projects tab first.</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'projects' })}
          className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
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
            <HamburgerButton />
            {/* Project picker */}
            <div className="flex-1 min-w-0 relative">
              <button
                onClick={() => setPickerOpen(o => !o)}
                className="flex items-center gap-1 min-w-0 max-w-full"
              >
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight text-left">Schedule</h1>
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
                        className={`w-full flex items-center gap-2 px-4 py-3 text-left border-b border-ios-gray-100 last:border-0 ${p.id === activeProject?.id ? 'bg-indigo-50' : 'active:bg-ios-gray-50'}`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.id === activeProject?.id ? 'bg-indigo-600' : 'bg-ios-gray-300'}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${p.id === activeProject?.id ? 'text-indigo-700' : 'text-gray-900'}`}>
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
            <button
              onClick={() => generateAndSaveSchedule(activeProject.id)}
              className="flex-shrink-0 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-semibold min-h-[36px] active:opacity-70"
            >
              Regenerate
            </button>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilterSheet(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ios-gray-100 rounded-full text-sm font-medium text-gray-700 min-h-[36px]"
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
                className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
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
                />
              ))}
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
    </>
  );
}

function DaySection({
  day,
  collapsed,
  onToggle,
  hasOverride,
  onOverride,
}: {
  day: ScheduleDay;
  collapsed: boolean;
  onToggle: () => void;
  hasOverride: boolean;
  onOverride: () => void;
}) {
  const hasConflict = day.entries.some(
    (e) => e.status === 'needs-assignment' || e.status === 'conflict' || e.status === 'over-max'
  );

  return (
    <div>
      {/* Sticky section header */}
      <div
        className="sticky top-0 z-10 w-full flex items-center px-4 py-2.5 bg-ios-gray-100 border-b border-ios-gray-200"
        style={{ top: '0' }}
      >
        <button onClick={onToggle} className="flex items-center justify-between flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-sm font-bold text-gray-800 truncate">{day.label}</h3>
            {hasConflict && (
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
            )}
            {hasOverride && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 flex-shrink-0">
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
      </div>

      {!collapsed && (
        <div className="px-4 py-2 space-y-2">
          {groupEntriesByPhase(day.entries).map(({ phaseName, entries: phaseEntries }) => (
            <Card key={phaseName} className="overflow-hidden">
              <div className="px-3 py-2 bg-ios-gray-100 border-b border-ios-gray-200">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{phaseName}</p>
              </div>
              <div className="divide-y divide-ios-gray-100">
                {phaseEntries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
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

function EntryRow({ entry }: { entry: ScheduleEntry }) {
  const isConflict = entry.status === 'needs-assignment' || entry.status === 'conflict';
  const isOverMax = entry.status === 'over-max';

  return (
    <div className={`px-3 py-2.5 flex items-start gap-2 ${isConflict ? 'bg-red-50' : isOverMax ? 'bg-yellow-50' : ''}`}>
      <span
        className={`flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
          ROLE_COLORS[entry.role] ?? 'bg-gray-100 text-gray-700'
        }`}
      >
        {entry.role}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {entry.status === 'needs-assignment' ? (
            <span className="text-sm font-semibold text-red-600">NEEDS ASSIGNMENT</span>
          ) : (
            <span className="text-sm font-medium text-gray-900 truncate">
              {entry.assignedMemberName}
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
    </div>
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
      className="fixed inset-0 z-50 flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto bg-white rounded-t-3xl max-h-[60vh] flex flex-col">
        <div className="px-4 py-4 border-b border-ios-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-bold">Filter Schedule</h2>
          <button onClick={onClose} className="text-indigo-600 font-semibold">Done</button>
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
          variant === 'warning' ? 'text-red-600 font-medium' : active ? 'text-indigo-600 font-semibold' : 'text-gray-900'
        }`}
      >
        {label}
      </span>
      {active && (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-600">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}
