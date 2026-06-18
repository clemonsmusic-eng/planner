import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { StatusBadge, getScheduleStatusVariant } from '../components/StatusBadge';
import { HamburgerButton } from '../components/HamburgerMenu';
import { ShiftOverrideSheet } from '../components/ShiftOverrideSheet';
import { formatDateLabel } from '../lib/dateUtils';
import type { ScheduleResult, TeamHoursSummary, DateOverride } from '../types';

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-400 flex-shrink-0">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function LockButton({ isLocked, onToggle }: { isLocked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
        isLocked ? 'bg-teal-100 text-teal-700' : 'bg-ios-gray-100 text-ios-gray-500'
      }`}
      aria-label={isLocked ? 'Unlock project' : 'Lock project'}
    >
      {isLocked ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5a3 3 0 116 0v2.75a.75.75 0 001.5 0V5.5A4.5 4.5 0 0010 1z" />
        </svg>
      )}
    </button>
  );
}

// SettingsModal has moved to the dedicated Settings tab


export function PlanPage() {
  const { state, dispatch, activeProject, generateAndSaveSchedule, setShiftOverride } = useApp();
  const [datesExpanded, setDatesExpanded] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState<string | null>(null);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-teal-400">
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
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

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
        >
          <div className="flex items-center gap-2">
            <HamburgerButton />
            {/* Project picker */}
            <div className="flex-1 min-w-0 relative">
              <button
                onClick={() => setPickerOpen(o => !o)}
                className="flex items-center gap-1 min-w-0 max-w-full"
              >
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-teal-900 leading-tight truncate text-left">
                    {activeProject.inputs.clientName || 'Plan'}
                  </h1>
                  {activeProject.inputs.clientName && (
                    <p className="text-xs text-ios-gray-600 truncate text-left">{activeProject.inputs.community}</p>
                  )}
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
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!schedule ? (
            <NoScheduleState
              onGenerate={() => generateAndSaveSchedule(activeProject.id)}
              onEdit={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'inputs' })}
            />
          ) : (
            <>
              <JobSummaryCard schedule={schedule} budgetedHours={activeProject.inputs.budgetedManHours} />
              <SuggestedDatesCard
                schedule={schedule}
                expanded={datesExpanded}
                onToggle={() => setDatesExpanded(!datesExpanded)}
                overrides={activeProject.inputs.dateOverrides}
                onOverride={(date) => setOverrideDate(date)}
              />
              <MoveDaySnapshotCard schedule={schedule} teamMembers={state.teamMembers} moveDate={activeProject.inputs.targetMoveDate} />
              <TeamHoursCard teamHours={schedule.teamHours} />
            </>
          )}
        </div>
      </div>

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

function NoScheduleState({
  onGenerate,
  onEdit,
}: {
  onGenerate: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-12 gap-4">
      <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-teal-400">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-teal-900 mb-1">No Schedule Yet</h2>
        <p className="text-ios-gray-600 text-sm">Complete the project inputs to generate a move plan.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onEdit}
          className="px-4 py-2.5 border border-teal-600 text-teal-600 rounded-xl font-semibold text-sm min-h-[44px]"
        >
          Edit Inputs
        </button>
        <button
          onClick={onGenerate}
          className="px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm min-h-[44px]"
        >
          Generate Plan
        </button>
      </div>
    </div>
  );
}

function JobSummaryCard({
  schedule,
  budgetedHours,
}: {
  schedule: ScheduleResult;
  budgetedHours: number;
}) {
  const pct = Math.round(schedule.percentScheduled);
  const barColor =
    schedule.status === 'ON TRACK'
      ? 'bg-green-500'
      : schedule.status === 'OVER BUDGET'
      ? 'bg-red-500'
      : 'bg-yellow-500';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-teal-900">Job Summary</h2>
        <StatusBadge
          label={schedule.status}
          variant={getScheduleStatusVariant(schedule.status)}
          size="md"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-teal-900">{schedule.totalScheduledHours}</p>
          <p className="text-xs text-ios-gray-600">Scheduled</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-teal-900">{budgetedHours}</p>
          <p className="text-xs text-ios-gray-600">Budget</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${schedule.remainingHours < 0 ? 'text-red-600' : 'text-teal-900'}`}>
            {schedule.remainingHours < 0 ? '-' : '+'}{Math.abs(schedule.remainingHours)}
          </p>
          <p className="text-xs text-ios-gray-600">Remaining</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-ios-gray-600">
          <span>Scheduled</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-ios-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}

function SuggestedDatesCard({
  schedule,
  expanded,
  onToggle,
  overrides,
  onOverride,
}: {
  schedule: ScheduleResult;
  expanded: boolean;
  onToggle: () => void;
  overrides: DateOverride[];
  onOverride: (date: string) => void;
}) {
  const { suggestedDates } = schedule;

  type DateItem = { label: string; date: string; accent?: boolean };

  const items: DateItem[] = [
    { label: 'First Visit', date: suggestedDates.firstVisit },
    { label: 'Second Visit', date: suggestedDates.secondVisit },
    ...suggestedDates.sortDays.map((d, i) => ({
      label: `Sort & Pack Day ${i + 1}`,
      date: d,
    })),
    { label: 'Final Pack Day', date: suggestedDates.finalPackDay },
    { label: 'Move Day', date: suggestedDates.moveDay, accent: true },
    ...suggestedDates.cleanoutDays.map((d, i) => ({
      label: `Cleanout Day ${i + 1}`,
      date: d,
    })),
    ...(suggestedDates.auctionLotOrg
      ? [{ label: 'Auction: Lot Organization', date: suggestedDates.auctionLotOrg }]
      : []),
    ...(suggestedDates.auctionStart
      ? [{ label: 'Auction Start', date: suggestedDates.auctionStart }]
      : []),
    ...(suggestedDates.auctionPickup
      ? [{ label: 'Pickup Day', date: suggestedDates.auctionPickup }]
      : []),
  ].filter((item) => item.date);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between min-h-[48px]"
      >
        <h2 className="font-bold text-teal-900">Suggested Dates</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 text-ios-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-0">
          {items.map((item, i) => {
            const override = overrides.find((o) => o.date === item.date);
            return (
              <div
                key={`${item.label}-${i}`}
                className={`flex items-center gap-3 py-2.5 ${i < items.length - 1 ? 'border-b border-ios-gray-100' : ''}`}
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.accent ? 'bg-teal-600' : 'bg-ios-gray-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.accent ? 'text-teal-700' : 'text-teal-900'}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-ios-gray-500">{formatDateLabel(item.date)}</p>
                </div>
                {override && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 flex-shrink-0">
                    {override.shift}
                  </span>
                )}
                <button
                  onClick={() => onOverride(item.date)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-400 active:bg-ios-gray-100 flex-shrink-0"
                  aria-label="Override shift"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function MoveDaySnapshotCard({
  schedule,
  teamMembers,
  moveDate,
}: {
  schedule: ScheduleResult;
  teamMembers: AppContextTeamMembers;
  moveDate: string;
}) {
  const pm = schedule.lockedPM
    ? teamMembers.find((m) => m.id === schedule.lockedPM)?.name ?? 'TBD'
    : 'TBD';
  const assistPm = schedule.lockedAssistPM
    ? teamMembers.find((m) => m.id === schedule.lockedAssistPM)?.name ?? 'TBD'
    : 'TBD';

  const moveDayEntries = schedule.days.find((d) => d.date === moveDate)?.entries ?? [];
  const specialists = moveDayEntries
    .filter((e) => e.role === 'Specialist' && e.assignedMemberName)
    .map((e) => e.assignedMemberName!)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const totalTeamSize = moveDayEntries.length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-teal-900">Move Day Snapshot</h2>
        <span className="text-sm text-ios-gray-600">{moveDate ? formatDateLabel(moveDate) : '—'}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 py-1">
          <span className="text-xs font-semibold text-teal-600 w-16 flex-shrink-0">PM</span>
          <span className="text-sm font-medium text-teal-900">{pm}</span>
        </div>
        <div className="flex items-center gap-2 py-1 border-t border-ios-gray-100">
          <span className="text-xs font-semibold text-purple-600 w-16 flex-shrink-0">Assist PM</span>
          <span className="text-sm font-medium text-teal-900">{assistPm}</span>
        </div>
        {specialists.length > 0 && (
          <div className="flex items-start gap-2 py-1 border-t border-ios-gray-100">
            <span className="text-xs font-semibold text-green-700 w-16 flex-shrink-0 pt-0.5">Specialist</span>
            <div className="flex flex-wrap gap-1">
              {specialists.map((s) => (
                <span key={s} className="text-xs bg-green-50 text-green-800 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="pt-2 border-t border-ios-gray-100">
          <p className="text-sm text-ios-gray-600">
            Total team: <span className="font-bold text-teal-900">{totalTeamSize}</span> members
          </p>
        </div>
      </div>
    </Card>
  );
}

// TypeScript helper type for team members
type AppContextTeamMembers = ReturnType<typeof useApp>['state']['teamMembers'];

function TeamHoursCard({ teamHours }: { teamHours: TeamHoursSummary[] }) {
  if (teamHours.length === 0) return null;

  const maxHours = Math.max(...teamHours.map((t) => t.scheduledHours), 1);

  return (
    <Card className="p-4">
      <h2 className="font-bold text-teal-900 mb-3">Team Hours</h2>
      <div className="space-y-3">
        {teamHours
          .sort((a, b) => b.scheduledHours - a.scheduledHours)
          .map((member) => (
            <div key={member.memberId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-teal-900">{member.memberName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ios-gray-600">
                    {member.scheduledHours}h
                    {member.maxHours > 0 && (
                      <span className="text-ios-gray-400"> · {member.maxHours}h/wk cap</span>
                    )}
                  </span>
                  {member.isOverMax && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Week over</span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-ios-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${member.isOverMax ? 'bg-red-500' : 'bg-teal-500'}`}
                  style={{ width: `${(member.scheduledHours / maxHours) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </Card>
  );
}
