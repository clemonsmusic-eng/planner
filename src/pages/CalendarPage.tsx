import { useState, useMemo } from 'react';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  startOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  endOfWeek,
} from 'date-fns';
import { useApp } from '../store/AppContext';
import { HamburgerButton } from '../components/HamburgerMenu';
import type { Project } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarView = 'day' | 'week' | 'month';

interface CalendarEvent {
  date: string;
  projectId: string;
  projectName: string;
  phaseName: string;
  shift: 'AM' | 'PM' | 'Full Day';
  assignedMemberName: string | null;
  assignedMemberId: string | null;
  role: string;
  hours: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SHIFT_COLORS = {
  AM: { bg: 'bg-sky-100', text: 'text-sky-800', dot: 'bg-sky-400' },
  PM: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-400' },
  'Full Day': { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-400' },
};

function buildEvents(projects: Project[]): CalendarEvent[] {
  return projects
    .filter((p) => p.schedule !== null)
    .flatMap((p) =>
      p.schedule!.days.flatMap((day) =>
        day.entries.map((entry) => ({
          date: day.date,
          projectId: p.id,
          projectName: p.inputs.clientName || p.inputs.projectName || 'Untitled',
          phaseName: entry.phaseName,
          shift: entry.shift,
          assignedMemberName: entry.assignedMemberName,
          assignedMemberId: entry.assignedMember,
          role: entry.role,
          hours: entry.hours,
        }))
      )
    );
}

function eventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const iso = format(date, 'yyyy-MM-dd');
  return events.filter((e) => e.date === iso);
}

function applyFilters(
  events: CalendarEvent[],
  memberFilter: string | null,
  projectFilter: string | null,
  shiftFilter: string | null
): CalendarEvent[] {
  return events.filter((e) => {
    if (memberFilter && e.assignedMemberId !== memberFilter) return false;
    if (projectFilter && e.projectId !== projectFilter) return false;
    if (shiftFilter && e.shift !== shiftFilter) return false;
    return true;
  });
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: CalendarEvent }) {
  const colors = SHIFT_COLORS[event.shift];
  return (
    <div className={`rounded-xl px-3 py-2.5 ${colors.bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-bold truncate ${colors.text}`}>{event.phaseName}</p>
          <p className="text-xs text-gray-700 truncate mt-0.5">{event.projectName}</p>
          {event.assignedMemberName && (
            <p className="text-xs text-ios-gray-600 truncate">{event.assignedMemberName} · {event.role}</p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`text-[10px] font-semibold ${colors.text}`}>{event.shift}</span>
          <p className="text-[10px] text-ios-gray-500">{event.hours}h</p>
        </div>
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const dayEvents = eventsForDate(events, date);

  if (dayEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
        <div className="w-12 h-12 bg-ios-gray-100 rounded-full flex items-center justify-center mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-ios-gray-400">
            <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-ios-gray-600">No shifts scheduled</p>
        <p className="text-xs text-ios-gray-400">{format(date, 'EEEE, MMMM d')}</p>
      </div>
    );
  }

  const am = dayEvents.filter((e) => e.shift === 'AM');
  const pm = dayEvents.filter((e) => e.shift === 'PM');
  const full = dayEvents.filter((e) => e.shift === 'Full Day');

  return (
    <div className="px-4 py-4 space-y-4">
      {am.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">AM</p>
          <div className="space-y-2">
            {am.map((e, i) => <EventCard key={i} event={e} />)}
          </div>
        </div>
      )}
      {pm.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">PM</p>
          <div className="space-y-2">
            {pm.map((e, i) => <EventCard key={i} event={e} />)}
          </div>
        </div>
      )}
      {full.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">Full Day</p>
          <div className="space-y-2">
            {full.map((e, i) => <EventCard key={i} event={e} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  date,
  events,
  onSelectDay,
}: {
  date: Date;
  events: CalendarEvent[];
  onSelectDay: (d: Date) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const today = new Date();

  return (
    <div className="flex flex-col">
      {/* Day columns header */}
      <div className="grid grid-cols-7 border-b border-ios-gray-200">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className="flex flex-col items-center py-2 gap-0.5 active:bg-ios-gray-50"
            >
              <span className="text-[10px] font-semibold text-ios-gray-500 uppercase">
                {format(day, 'EEE')}
              </span>
              <span
                className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-indigo-600 text-white' : 'text-gray-900'
                }`}
              >
                {format(day, 'd')}
              </span>
              {/* Event dots */}
              <div className="flex gap-0.5 h-3 items-center">
                {(['AM', 'PM', 'Full Day'] as const).map((shift) => {
                  const count = eventsForDate(events, day).filter((e) => e.shift === shift).length;
                  return count > 0 ? (
                    <span
                      key={shift}
                      className={`w-1.5 h-1.5 rounded-full ${SHIFT_COLORS[shift].dot}`}
                    />
                  ) : null;
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Events per day */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-ios-gray-100">
        {days.map((day) => {
          const dayEvents = eventsForDate(events, day);
          return (
            <div key={day.toISOString()} className="min-h-[120px] p-1 space-y-1">
              {dayEvents.slice(0, 4).map((e, i) => {
                const colors = SHIFT_COLORS[e.shift];
                return (
                  <div
                    key={i}
                    className={`rounded px-1 py-0.5 ${colors.bg}`}
                  >
                    <p className={`text-[9px] font-semibold leading-tight truncate ${colors.text}`}>
                      {e.phaseName.replace('First Visit: ', '').replace('Second Visit: ', '').split(':')[0]}
                    </p>
                    {e.assignedMemberName && (
                      <p className="text-[8px] text-ios-gray-600 truncate leading-tight">{e.assignedMemberName}</p>
                    )}
                  </div>
                );
              })}
              {dayEvents.length > 4 && (
                <p className="text-[9px] text-ios-gray-400 px-1">+{dayEvents.length - 4}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  date,
  events,
  onSelectDay,
}: {
  date: Date;
  events: CalendarEvent[];
  onSelectDay: (d: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const today = new Date();

  const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="px-3 py-3">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-ios-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {calDays.map((day) => {
          const inMonth = isSameMonth(day, date);
          const isToday = isSameDay(day, today);
          const dayEvents = eventsForDate(events, day);
          const shifts = [...new Set(dayEvents.map((e) => e.shift))] as ('AM' | 'PM' | 'Full Day')[];

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-center py-1 rounded-xl ${
                inMonth ? 'active:bg-ios-gray-100' : ''
              }`}
              disabled={!inMonth}
            >
              <span
                className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full ${
                  isToday
                    ? 'bg-indigo-600 text-white'
                    : inMonth
                    ? 'text-gray-900'
                    : 'text-ios-gray-300'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="flex gap-0.5 h-2 items-center">
                {shifts.slice(0, 3).map((shift) => (
                  <span
                    key={shift}
                    className={`w-1.5 h-1.5 rounded-full ${SHIFT_COLORS[shift].dot}`}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Filter Sheet ─────────────────────────────────────────────────────────────

interface FilterSheetProps {
  show: boolean;
  onClose: () => void;
  projects: { id: string; name: string }[];
  members: { id: string; name: string }[];
  memberFilter: string | null;
  projectFilter: string | null;
  shiftFilter: string | null;
  setMemberFilter: (v: string | null) => void;
  setProjectFilter: (v: string | null) => void;
  setShiftFilter: (v: string | null) => void;
}

function FilterSheet({
  show,
  onClose,
  projects,
  members,
  memberFilter,
  projectFilter,
  shiftFilter,
  setMemberFilter,
  setProjectFilter,
  setShiftFilter,
}: FilterSheetProps) {
  if (!show) return null;

  function clearAll() {
    setMemberFilter(null);
    setProjectFilter(null);
    setShiftFilter(null);
  }

  const hasFilter = memberFilter || projectFilter || shiftFilter;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-ios-gray-200">
          <h3 className="font-bold text-gray-900">Filters</h3>
          <div className="flex items-center gap-3">
            {hasFilter && (
              <button onClick={clearAll} className="text-sm text-red-600 font-semibold">
                Clear All
              </button>
            )}
            <button onClick={onClose} className="text-sm text-indigo-600 font-semibold">
              Done
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Shift type filter */}
          <div>
            <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">Shift Type</p>
            <div className="flex gap-2">
              {(['AM', 'PM', 'Full Day'] as const).map((shift) => {
                const colors = SHIFT_COLORS[shift];
                const active = shiftFilter === shift;
                return (
                  <button
                    key={shift}
                    onClick={() => setShiftFilter(active ? null : shift)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold min-h-[36px] transition-colors ${
                      active ? `${colors.bg} ${colors.text}` : 'bg-ios-gray-100 text-ios-gray-600'
                    }`}
                  >
                    {shift}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Project filter */}
          {projects.length > 1 && (
            <div>
              <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">Project</p>
              <div className="space-y-1">
                {projects.map((p) => {
                  const active = projectFilter === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setProjectFilter(active ? null : p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                        active ? 'bg-indigo-50 text-indigo-700' : 'bg-ios-gray-50 text-gray-900'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-indigo-600' : 'bg-ios-gray-300'}`} />
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Member filter */}
          {members.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">Team Member</p>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = memberFilter === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setMemberFilter(active ? null : m.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-semibold min-h-[36px] transition-colors ${
                        active ? 'bg-indigo-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Calendar Page ─────────────────────────────────────────────────────────────

export function CalendarPage() {
  const { state } = useApp();
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const allEvents = useMemo(() => buildEvents(state.projects), [state.projects]);
  const filteredEvents = useMemo(
    () => applyFilters(allEvents, memberFilter, projectFilter, shiftFilter),
    [allEvents, memberFilter, projectFilter, shiftFilter]
  );

  const projectOptions = useMemo(
    () =>
      state.projects
        .filter((p) => p.schedule)
        .map((p) => ({ id: p.id, name: p.inputs.clientName || p.inputs.projectName || 'Untitled' })),
    [state.projects]
  );

  const memberOptions = useMemo(() => {
    const seen = new Map<string, string>();
    allEvents.forEach((e) => {
      if (e.assignedMemberId && e.assignedMemberName) {
        seen.set(e.assignedMemberId, e.assignedMemberName);
      }
    });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allEvents]);

  const activeFilterCount = [memberFilter, projectFilter, shiftFilter].filter(Boolean).length;

  function navigate(dir: 1 | -1) {
    if (view === 'day') setCurrentDate((d) => addDays(d, dir));
    else if (view === 'week') setCurrentDate((d) => addWeeks(d, dir));
    else setCurrentDate((d) => addMonths(d, dir));
  }

  function goToday() {
    setCurrentDate(new Date());
  }

  function handleSelectDay(day: Date) {
    setCurrentDate(day);
    setView('day');
  }

  function dateLabel() {
    if (view === 'day') return format(currentDate, 'EEE, MMM d');
    if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 6);
      if (format(weekStart, 'MMM') === format(weekEnd, 'MMM')) {
        return `${format(weekStart, 'MMM d')}–${format(weekEnd, 'd, yyyy')}`;
      }
      return `${format(weekStart, 'MMM d')}–${format(weekEnd, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center justify-between">
          <HamburgerButton />
          <h1 className="text-lg font-bold text-gray-900">Calendar</h1>
          <button
            onClick={() => setShowFilters(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl text-ios-gray-600 active:bg-ios-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mt-3 bg-ios-gray-100 rounded-xl p-1">
          {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
                view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-ios-gray-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navigation row */}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-600 active:bg-ios-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <button onClick={goToday} className="flex-1 text-center">
            <span className="text-sm font-semibold text-gray-900">{dateLabel()}</span>
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-600 active:bg-ios-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {view === 'day' && <DayView date={currentDate} events={filteredEvents} />}
        {view === 'week' && (
          <WeekView date={currentDate} events={filteredEvents} onSelectDay={handleSelectDay} />
        )}
        {view === 'month' && (
          <MonthView date={currentDate} events={filteredEvents} onSelectDay={handleSelectDay} />
        )}
      </div>

      {/* Filter sheet */}
      <FilterSheet
        show={showFilters}
        onClose={() => setShowFilters(false)}
        projects={projectOptions}
        members={memberOptions}
        memberFilter={memberFilter}
        projectFilter={projectFilter}
        shiftFilter={shiftFilter}
        setMemberFilter={setMemberFilter}
        setProjectFilter={setProjectFilter}
        setShiftFilter={setShiftFilter}
      />
    </div>
  );
}
