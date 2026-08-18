import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { ExportPlanButton } from '../components/ExportPlanButton';
import { can } from '../lib/access';
import { StatusBadge, getScheduleStatusVariant } from '../components/StatusBadge';
import { formatDateLabel } from '../lib/dateUtils';
import { BUDGET_POOLS, poolBudget, poolScheduled, totalBudgetedHours } from '../lib/budgets';
import { contactSummary, resolveContact } from '../lib/contacts';
import type { ScheduleResult, TeamHoursSummary, DateOverride, PhaseBudgetHours, ShiftNote, RoleType, ServiceCategory, CrmContact, ProjectContact } from '../types';

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-400 flex-shrink-0">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}


// SettingsModal has moved to the dedicated Settings tab


export function PlanPage() {
  const { state, dispatch, activeProject, generateAndSaveSchedule } = useApp();
  const [pickerOpen, setPickerOpen] = useState(false);

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
            {schedule && can(state.access.level, 'exportFiles') && (
              <ExportPlanButton project={activeProject} schedule={schedule} />
            )}
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
              {/*
                Two independent stacks on a wide screen, not a two-column grid.
                A grid ties each pair into a row, so folding one card away opens
                a gap beside it and leaves its neighbour stranded; two columns
                let each side close up on its own. The full-width cards below
                are the two nobody reads side by side.
              */}
              <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:items-start">
                <div className="space-y-4">
                  {/* Who to ring on the day, above the crew who will be ringing. */}
                  <ProjectContactsCard contacts={activeProject.inputs.contacts ?? []} crm={state.crmContacts} />
                  <MoveDaySnapshotCard
                    schedule={schedule}
                    teamMembers={state.teamMembers}
                    moveDate={schedule.suggestedDates.moveDay || activeProject.inputs.targetMoveDate}
                  />
                </div>
                <div className="space-y-4">
                  <SuggestedDatesCard
                    schedule={schedule}
                    overrides={activeProject.inputs.dateOverrides}
                    shiftNotes={activeProject.inputs.shiftNotes ?? []}
                  />
                  <ServicesContractedCard services={activeProject.inputs.contractedServices ?? []} catalog={state.services} />
                </div>
              </div>
              {/*
                Budget sits with the hours it is measured against — and both
                are kept off a Team Member's plan: what a job costs and what
                everyone else is working are not a crew member's business.
              */}
              {can(state.access.level, 'viewCosts') && (
                <>
                  <JobSummaryCard schedule={schedule} budgets={activeProject.inputs.phaseBudgets} />
                  <TeamHoursCard teamHours={schedule.teamHours} />
                </>
              )}
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

/**
 * Every section on this tab is a card that can be folded away, so a long plan
 * can be narrowed to whichever part is being worked on. Open state lives here
 * per card rather than on the page.
 */
function CollapsibleCard({
  title,
  trailing,
  defaultOpen = true,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full px-4 py-3 flex items-center gap-2 min-h-[48px] text-left"
      >
        <h2 className="font-bold text-teal-900 flex-1 min-w-0 truncate">{title}</h2>
        {trailing}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 text-ios-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </Card>
  );
}

function JobSummaryCard({
  schedule,
  budgets,
}: {
  schedule: ScheduleResult;
  budgets: PhaseBudgetHours;
}) {
  const budgetedHours = totalBudgetedHours(budgets);
  const pct = Math.round(schedule.percentScheduled);
  const barColor =
    schedule.status === 'ON TRACK'
      ? 'bg-green-500'
      : schedule.status === 'OVER BUDGET'
      ? 'bg-red-500'
      : 'bg-yellow-500';

  return (
    <CollapsibleCard
      title="Project Hourly Budget"
      trailing={
        <StatusBadge
          label={schedule.status}
          variant={getScheduleStatusVariant(schedule.status)}
          size="md"
        />
      }
    >
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

      {/*
        Each group of phases spends its own allowance, so one total can't say
        which one ran out — and running out is exactly why a sort day or the PM
        final pack goes missing from the plan.
      */}
      <div className="mt-4 pt-3 border-t border-ios-gray-100 space-y-2">
        {BUDGET_POOLS.map(({ pool, label }) => {
          const budget = poolBudget(budgets, pool);
          const used = poolScheduled(schedule, pool);
          const over = budget > 0 && used > budget;
          const share = budget > 0 ? Math.min((used / budget) * 100, 100) : 0;
          return (
            <div key={pool}>
              <div className="flex justify-between items-baseline gap-2 text-xs">
                <span className="text-ios-gray-600 truncate">{label}</span>
                <span className={`tabular-nums flex-shrink-0 ${over ? 'text-red-600 font-semibold' : 'text-teal-900'}`}>
                  {used} / {budget || '—'}
                </span>
              </div>
              <div className="h-1.5 bg-ios-gray-100 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-teal-500'}`}
                  style={{ width: `${over ? 100 : share}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </CollapsibleCard>
  );
}

/**
 * Dates as generated. Read-only by design: the Plan tab is the summary a PM
 * shows a client, and every date on it is produced by the schedule, so editing
 * one here and the shift itself on the Schedule tab were two ways to change the
 * same thing that could disagree.
 */
function SuggestedDatesCard({
  schedule,
  overrides,
  shiftNotes,
}: {
  schedule: ScheduleResult;
  overrides: DateOverride[];
  shiftNotes: ShiftNote[];
}) {
  const { suggestedDates } = schedule;

  /**
   * Notes written against the shifts on a date, joined for display.
   *
   * A date can carry more than one shift and each keeps its own note, so this
   * gathers whatever was written for that day rather than picking one. Notes are
   * keyed by phase and date, so it matches on the phases actually scheduled
   * then — a note left on a shift that has since moved doesn't follow the date.
   */
  function notesFor(date: string): string[] {
    const phaseIds = new Set((schedule.days.find((d) => d.date === date)?.entries ?? []).map((e) => e.phaseId));
    return shiftNotes
      .filter((n) => n.date === date && phaseIds.has(n.phaseId))
      .map((n) => n.note.trim())
      .filter(Boolean);
  }

  /**
   * Shift worked on a date, read off the schedule so it tracks any hand edit or
   * shift override rather than the phase template's original intent.
   */
  function shiftFor(date: string): string | null {
    const entries = schedule.days.find((d) => d.date === date)?.entries ?? [];
    if (entries.length === 0) return null;
    const shifts = new Set(entries.map((e) => e.shift));
    if (shifts.has('Full Day')) return 'Full Day';
    if (shifts.has('AM') && shifts.has('PM')) return 'AM/PM';
    return shifts.has('AM') ? 'AM' : shifts.has('PM') ? 'PM' : null;
  }

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
      label: suggestedDates.cleanoutDays.length > 1 ? `Cleanout Day ${i + 1}` : 'Cleanout Day',
      date: d,
    })),
    ...(suggestedDates.lotPrepDays ?? []).map((d, i) => ({
      label: (suggestedDates.lotPrepDays ?? []).length > 1 ? `Lot Prep Day ${i + 1}` : 'Lot Prep Day',
      date: d,
    })),
    ...(suggestedDates.auctionStart
      ? [{ label: 'Auction Start', date: suggestedDates.auctionStart }]
      : []),
    ...(suggestedDates.auctionPickupPrep
      ? [{ label: 'Pickup Prep Day', date: suggestedDates.auctionPickupPrep }]
      : []),
    ...(suggestedDates.auctionPickup
      ? [{ label: 'Pickup Day', date: suggestedDates.auctionPickup }]
      : []),
  ].filter((item) => item.date);

  return (
    <CollapsibleCard title="Dates">
      <div className="space-y-0">
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`text-sm font-medium truncate ${item.accent ? 'text-teal-700' : 'text-teal-900'}`}>
                      {item.label}
                    </p>
                    {shiftFor(item.date) && (
                      <span className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700">
                        {shiftFor(item.date)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ios-gray-500">{formatDateLabel(item.date)}</p>
                  {notesFor(item.date).map((note, n) => (
                    <p key={n} className="text-xs text-ios-gray-600 mt-1 flex items-start gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                        className="w-3 h-3 text-ios-gray-400 flex-shrink-0 mt-0.5" aria-hidden="true">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                      <span className="min-w-0">{note}</span>
                    </p>
                  ))}
                </div>
                {override && (
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 flex-shrink-0">
                    {override.shift}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </CollapsibleCard>
  );
}

/**
 * Read-only mirror of the Input tab's Services Contracted, grouped by the same
 * categories and listing only what was actually ticked.
 */
function ServicesContractedCard({ services, catalog }: { services: string[]; catalog: ServiceCategory[] }) {
  const selected = new Set(services);
  const groups = catalog
    .map(({ category, services: all }) => ({ category, chosen: all.filter((s) => selected.has(s)) }))
    .filter((g) => g.chosen.length > 0);

  return (
    <CollapsibleCard
      title="Services Contracted"
      trailing={
        services.length > 0 ? (
          <span className="text-xs text-ios-gray-500 flex-shrink-0">
            {services.length} service{services.length === 1 ? '' : 's'}
          </span>
        ) : undefined
      }
    >
      {groups.length === 0 ? (
        <p className="text-sm text-ios-gray-500">
          No services selected yet — pick them on the Input tab.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map(({ category, chosen }) => (
            <div key={category}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ios-gray-500 mb-1.5">
                {category}
              </p>
              <ul className="space-y-1">
                {chosen.map((service) => (
                  <li key={service} className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-teal-900 leading-snug">{service}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}

/**
 * The people outside the team this job goes through, read off the CRM the
 * project links to. Read-only like the rest of the Plan tab: contacts are
 * added on the Input tab, and the book itself is edited in the CRM.
 */
function ProjectContactsCard({ contacts, crm }: { contacts: ProjectContact[]; crm: CrmContact[] }) {
  const rows = contacts.map((row) => ({ row, ...resolveContact(row, crm) }));

  return (
    <CollapsibleCard
      title="Project Contacts"
      trailing={
        contacts.length > 0 ? (
          <span className="text-xs text-ios-gray-500 flex-shrink-0">
            {contacts.length} contact{contacts.length === 1 ? '' : 's'}
          </span>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-ios-gray-500">
          Nobody added yet — add them on the Input tab.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map(({ row, details, missing }) => (
            <div key={row.id} className="pb-3 border-b border-ios-gray-100 last:border-0 last:pb-0">
              {missing ? (
                <p className="text-sm text-ios-gray-500">Contact removed from the CRM</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2 min-w-0">
                    <p className="text-sm font-semibold text-teal-900 truncate">{contactSummary(details)}</p>
                    {details.contactType && (
                      <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700">
                        {details.contactType}
                      </span>
                    )}
                  </div>
                  {details.serviceDescription && (
                    <p className="text-xs text-ios-gray-600 mt-0.5">{details.serviceDescription}</p>
                  )}
                  {/* Tappable, because this card is read on a phone at a job. */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {details.workPhone && (
                      <a href={`tel:${details.workPhone}`} className="text-xs text-teal-700">
                        Work {details.workPhone}
                      </a>
                    )}
                    {details.cellPhone && (
                      <a href={`tel:${details.cellPhone}`} className="text-xs text-teal-700">
                        Cell {details.cellPhone}
                      </a>
                    )}
                    {details.email && (
                      <a href={`mailto:${details.email}`} className="text-xs text-teal-700 truncate">
                        {details.email}
                      </a>
                    )}
                  </div>
                  {details.notes && (
                    <p className="text-xs text-ios-gray-600 mt-1 whitespace-pre-line">{details.notes}</p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
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
  const moveDayEntries = schedule.days.find((d) => d.date === moveDate)?.entries ?? [];

  /*
   * Read the crew off move day itself rather than from lockedPM/lockedAssistPM.
   * Those are recorded when the plan is generated and never revisited, so
   * reassigning a role on the Schedule tab left this card naming whoever the
   * generator had picked — the same staleness that made the card empty when the
   * move moved, since it was looking at the target date rather than the day the
   * plan actually puts move day on.
   */
  const nameFor = (role: RoleType): string => {
    const onDay = moveDayEntries.find((e) => e.role === role && e.assignedMemberName)?.assignedMemberName;
    if (onDay) return onDay;
    const locked = role === 'PM' ? schedule.lockedPM : role === 'Assist PM' ? schedule.lockedAssistPM : null;
    return locked ? teamMembers.find((m) => m.id === locked)?.name ?? 'TBD' : 'TBD';
  };
  const pm = nameFor('PM');
  const assistPm = nameFor('Assist PM');
  const specialists = moveDayEntries
    .filter((e) => e.role === 'Specialist' && e.assignedMemberName)
    .map((e) => e.assignedMemberName!)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const totalTeamSize = moveDayEntries.length;

  return (
    <CollapsibleCard
      title="Move Day Snapshot"
      trailing={
        <span className="text-sm text-ios-gray-600 flex-shrink-0">
          {moveDate ? formatDateLabel(moveDate) : '—'}
        </span>
      }
    >
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
    </CollapsibleCard>
  );
}

// TypeScript helper type for team members
type AppContextTeamMembers = ReturnType<typeof useApp>['state']['teamMembers'];

function TeamHoursCard({ teamHours }: { teamHours: TeamHoursSummary[] }) {
  if (teamHours.length === 0) return null;

  const maxHours = Math.max(...teamHours.map((t) => t.scheduledHours), 1);

  return (
    <CollapsibleCard title="Team Hours">
      <div className="space-y-3">
        {teamHours
          .sort((a, b) => b.scheduledHours - a.scheduledHours)
          .map((member) => (
            <div key={member.memberId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-teal-900">{member.memberName}</span>
                {/*
                  These are hours on this project, not hours in a week, so the
                  weekly cap has nothing to say about them and isn't shown.
                */}
                <span className="text-sm text-ios-gray-600">{member.scheduledHours}h</span>
              </div>
              <div className="h-2 bg-ios-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-500"
                  style={{ width: `${(member.scheduledHours / maxHours) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </CollapsibleCard>
  );
}
