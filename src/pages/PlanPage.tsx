import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { StatusBadge, getScheduleStatusVariant } from '../components/StatusBadge';
import { HamburgerButton } from '../components/HamburgerMenu';
import { formatDateLabel } from '../lib/dateUtils';
import type { ScheduleResult, TeamHoursSummary } from '../types';

// SettingsModal has moved to the dedicated Settings tab


export function PlanPage() {
  const { state, dispatch, activeProject, generateAndSaveSchedule } = useApp();
  const [datesExpanded, setDatesExpanded] = useState(true);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-400">
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
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
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">
                {activeProject.inputs.clientName || 'Plan'}
              </h1>
              <p className="text-xs text-ios-gray-600 truncate">{activeProject.inputs.community}</p>
            </div>
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
              <SuggestedDatesCard schedule={schedule} expanded={datesExpanded} onToggle={() => setDatesExpanded(!datesExpanded)} />
              <MoveDaySnapshotCard schedule={schedule} teamMembers={state.teamMembers} moveDate={activeProject.inputs.targetMoveDate} />
              <TeamHoursCard teamHours={schedule.teamHours} />
            </>
          )}
        </div>
      </div>

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
      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-400">
          <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm.53 5.47a.75.75 0 00-1.06 0l-3 3a.75.75 0 101.06 1.06l1.72-1.72v5.69a.75.75 0 001.5 0v-5.69l1.72 1.72a.75.75 0 101.06-1.06l-3-3z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">No Schedule Yet</h2>
        <p className="text-ios-gray-600 text-sm">Complete the project inputs to generate a move plan.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onEdit}
          className="px-4 py-2.5 border border-indigo-600 text-indigo-600 rounded-xl font-semibold text-sm min-h-[44px]"
        >
          Edit Inputs
        </button>
        <button
          onClick={onGenerate}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px]"
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
        <h2 className="font-bold text-gray-900">Job Summary</h2>
        <StatusBadge
          label={schedule.status}
          variant={getScheduleStatusVariant(schedule.status)}
          size="md"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{schedule.totalScheduledHours}</p>
          <p className="text-xs text-ios-gray-600">Scheduled</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{budgetedHours}</p>
          <p className="text-xs text-ios-gray-600">Budget</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${schedule.remainingHours < 0 ? 'text-red-600' : 'text-gray-900'}`}>
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
}: {
  schedule: ScheduleResult;
  expanded: boolean;
  onToggle: () => void;
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
    { label: 'Final Settle', date: suggestedDates.finalSettle },
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
        <h2 className="font-bold text-gray-900">Suggested Dates</h2>
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
          {items.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className={`flex items-center gap-3 py-2.5 ${i < items.length - 1 ? 'border-b border-ios-gray-100' : ''}`}
            >
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  item.accent ? 'bg-indigo-600' : 'bg-ios-gray-300'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.accent ? 'text-indigo-700' : 'text-gray-900'}`}>
                  {item.label}
                </p>
              </div>
              <p className="text-sm text-ios-gray-600 flex-shrink-0">
                {formatDateLabel(item.date)}
              </p>
            </div>
          ))}
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
        <h2 className="font-bold text-gray-900">Move Day Snapshot</h2>
        <span className="text-sm text-ios-gray-600">{moveDate ? formatDateLabel(moveDate) : '—'}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 py-1">
          <span className="text-xs font-semibold text-indigo-600 w-16 flex-shrink-0">PM</span>
          <span className="text-sm font-medium text-gray-900">{pm}</span>
        </div>
        <div className="flex items-center gap-2 py-1 border-t border-ios-gray-100">
          <span className="text-xs font-semibold text-purple-600 w-16 flex-shrink-0">Assist PM</span>
          <span className="text-sm font-medium text-gray-900">{assistPm}</span>
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
            Total team: <span className="font-bold text-gray-900">{totalTeamSize}</span> members
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
      <h2 className="font-bold text-gray-900 mb-3">Team Hours</h2>
      <div className="space-y-3">
        {teamHours
          .sort((a, b) => b.scheduledHours - a.scheduledHours)
          .map((member) => (
            <div key={member.memberId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">{member.memberName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ios-gray-600">
                    {member.scheduledHours}h
                    {member.maxHours > 0 && ` / ${member.maxHours}h`}
                  </span>
                  {member.isOverMax && (
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Over</span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-ios-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${member.isOverMax ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${(member.scheduledHours / maxHours) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </Card>
  );
}
