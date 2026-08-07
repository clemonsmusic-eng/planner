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
import type { Project, TeamMember, ExperienceLevel } from '../types';

const PACK_SORT_PHASES_CAL = new Set(['phase-3', 'phase-4-1', 'phase-4-2']);
const CLEANOUT_PHASES_CAL  = new Set(['phase-6']);

// ─── Types ────────────────────────────────────────────────────────────────────

type CalendarView = 'day' | 'week' | 'month';

/** One block = one phase/shift on one day for one project, listing all assigned members. */
interface CalendarJob {
  date: string;
  projectId: string;
  projectName: string;
  phaseId: string;
  phaseName: string;
  shift: 'AM' | 'PM' | 'Full Day';
  memberIds: string[];
  memberNames: string[];
  memberExperiences: Array<ExperienceLevel | null>;
  experienceCategory: 'packAndSort' | 'cleanout' | null;
  hours: number;
  isArchived: boolean;
}

// ─── Project Color Palette ────────────────────────────────────────────────────

const PROJECT_COLORS = [
  { bg: 'bg-teal-100',  text: 'text-teal-800',  border: 'border-teal-200',  dot: 'bg-teal-500'  },
  { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-200',    dot: 'bg-rose-500'    },
  { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  { bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-200',  dot: 'bg-violet-500'  },
  { bg: 'bg-cyan-100',    text: 'text-cyan-800',    border: 'border-cyan-200',    dot: 'bg-cyan-500'    },
  { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-200',  dot: 'bg-orange-500'  },
  { bg: 'bg-teal-100',    text: 'text-teal-800',    border: 'border-teal-200',    dot: 'bg-teal-500'    },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Stable color index for a project — based on creation order. */
function buildColorMap(projects: Project[]): Map<string, number> {
  const sorted = [...projects].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const map = new Map<string, number>();
  sorted.forEach((p, i) => map.set(p.id, i % PROJECT_COLORS.length));
  return map;
}

/** Aggregate schedule entries into one job per (project, phase, shift, date). */
function buildJobs(projects: Project[], teamMemberMap: Map<string, TeamMember>): CalendarJob[] {
  const jobs: CalendarJob[] = [];

  for (const project of projects) {
    if (!project.schedule) continue;
    const isArchived = project.inputs.status === 'archived';

    for (const day of project.schedule.days) {
      const groups = new Map<string, CalendarJob>();

      for (const entry of day.entries) {
        const key = `${entry.phaseId}:${entry.shift}`;
        const expCat: CalendarJob['experienceCategory'] = PACK_SORT_PHASES_CAL.has(entry.phaseId)
          ? 'packAndSort'
          : CLEANOUT_PHASES_CAL.has(entry.phaseId)
          ? 'cleanout'
          : null;
        if (!groups.has(key)) {
          groups.set(key, {
            date: day.date,
            projectId: project.id,
            projectName: project.inputs.clientName || project.inputs.projectName || 'Untitled',
            phaseId: entry.phaseId,
            phaseName: entry.phaseName,
            shift: entry.shift,
            memberIds: [],
            memberNames: [],
            memberExperiences: [],
            experienceCategory: expCat,
            hours: entry.hours,
            isArchived,
          });
        }
        const job = groups.get(key)!;
        if (entry.assignedMember && !job.memberIds.includes(entry.assignedMember)) {
          job.memberIds.push(entry.assignedMember);
          if (entry.assignedMemberName) job.memberNames.push(entry.assignedMemberName);
          const member = teamMemberMap.get(entry.assignedMember);
          const expLevel = expCat && member?.experience ? member.experience[expCat] : null;
          job.memberExperiences.push(expLevel);
        }
      }

      jobs.push(...groups.values());
    }
  }

  return jobs;
}

function jobsForDate(jobs: CalendarJob[], date: Date): CalendarJob[] {
  const iso = format(date, 'yyyy-MM-dd');
  return jobs.filter((j) => j.date === iso);
}

function applyFilters(
  jobs: CalendarJob[],
  memberFilter: string | null,
  projectFilter: string | null,
  shiftFilter: string | null
): CalendarJob[] {
  return jobs.filter((j) => {
    if (memberFilter && !j.memberIds.includes(memberFilter)) return false;
    if (projectFilter && j.projectId !== projectFilter) return false;
    if (shiftFilter && j.shift !== shiftFilter) return false;
    return true;
  });
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({
  job,
  colorIdx,
  onDoubleClick,
  onDragStart,
  isDragging,
}: {
  job: CalendarJob;
  colorIdx: number;
  onDoubleClick?: () => void;
  onDragStart?: () => void;
  isDragging?: boolean;
}) {
  const c = job.isArchived
    ? { bg: 'bg-gray-100', text: 'text-gray-400', border: 'border-gray-200' }
    : PROJECT_COLORS[colorIdx % PROJECT_COLORS.length];
  const shiftLabel = job.shift === 'Full Day' ? 'Full' : job.shift;

  return (
    <div
      draggable={!job.isArchived}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.();
      }}
      onDoubleClick={onDoubleClick}
      className={`rounded-xl px-3 py-2.5 border cursor-grab active:cursor-grabbing select-none transition-opacity ${c.bg} ${c.border} ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold truncate ${c.text}`}>{job.phaseName}</p>
          <p className={`text-xs truncate mt-0.5 ${job.isArchived ? 'text-gray-400' : 'text-teal-700'}`}>{job.projectName}</p>
          {job.memberNames.length > 0 && (
            <div className="mt-0.5 space-y-0.5">
              {job.memberNames.map((name, idx) => {
                const expLevel = job.memberExperiences[idx];
                const hasExp = expLevel && expLevel !== 'Average';
                return (
                  <div key={idx} className="flex items-center gap-1">
                    <span className={`text-[11px] truncate ${job.isArchived ? 'text-gray-400' : 'text-ios-gray-600'}`}>{name}</span>
                    {hasExp && !job.isArchived && (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 leading-none ${
                        expLevel === 'High' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {expLevel === 'High' ? '0.85×' : '1.15×'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span className={`text-[10px] font-semibold ${c.text}`}>{shiftLabel}</span>
          <p className="text-[10px] text-ios-gray-500">{job.hours}h/ea</p>
        </div>
      </div>
    </div>
  );
}

// ─── Conflict Dialog ──────────────────────────────────────────────────────────

function ConflictDialog({
  issues,
  onKeep,
  onRevert,
}: {
  issues: string[];
  onKeep: () => void;
  onRevert: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </span>
          <h3 className="font-bold text-teal-900">Schedule Conflict Detected</h3>
        </div>
        <p className="text-sm text-ios-gray-600 mb-3">Moving this shift created the following issues:</p>
        <ul className="space-y-1 mb-5">
          {issues.slice(0, 5).map((issue, i) => (
            <li key={i} className="text-xs text-red-600 flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1 flex-shrink-0" />
              {issue}
            </li>
          ))}
        </ul>
        <div className="flex gap-3">
          <button onClick={onRevert} className="flex-1 py-3 rounded-xl border border-ios-gray-300 text-teal-900 font-semibold text-sm">
            Revert
          </button>
          <button onClick={onKeep} className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm">
            Keep Change
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({
  date,
  jobs,
  colorMap,
  dragJob,
  dragOverDate,
  onJobDoubleClick,
  onJobDragStart,
  onDayDragOver,
  onDayDrop,
}: {
  date: Date;
  jobs: CalendarJob[];
  colorMap: Map<string, number>;
  dragJob: CalendarJob | null;
  dragOverDate: string | null;
  onJobDoubleClick: (job: CalendarJob) => void;
  onJobDragStart: (job: CalendarJob) => void;
  onDayDragOver: (dateStr: string) => void;
  onDayDrop: (dateStr: string) => void;
}) {
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayJobs = jobsForDate(jobs, date);
  const isDropTarget = dragOverDate === dateStr && dragJob?.date !== dateStr;

  if (dayJobs.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-16 gap-2 text-center px-6 transition-colors ${isDropTarget ? 'bg-teal-50' : ''}`}
        onDragOver={(e) => { e.preventDefault(); onDayDragOver(dateStr); }}
        onDrop={() => onDayDrop(dateStr)}
        onDragLeave={() => onDayDragOver('')}
      >
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

  const am   = dayJobs.filter((j) => j.shift === 'AM');
  const pm   = dayJobs.filter((j) => j.shift === 'PM');
  const full = dayJobs.filter((j) => j.shift === 'Full Day');

  const section = (label: string, list: CalendarJob[]) =>
    list.length > 0 ? (
      <div>
        <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">{label}</p>
        <div className="space-y-2">
          {list.map((j, i) => (
            <JobCard
              key={i}
              job={j}
              colorIdx={colorMap.get(j.projectId) ?? 0}
              onDoubleClick={() => onJobDoubleClick(j)}
              onDragStart={() => onJobDragStart(j)}
              isDragging={dragJob?.projectId === j.projectId && dragJob?.phaseId === j.phaseId && dragJob?.date === j.date && dragJob?.shift === j.shift}
            />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div
      className={`px-4 py-4 space-y-4 transition-colors ${isDropTarget ? 'bg-teal-50' : ''}`}
      onDragOver={(e) => { e.preventDefault(); onDayDragOver(dateStr); }}
      onDrop={() => onDayDrop(dateStr)}
      onDragLeave={() => onDayDragOver('')}
    >
      {section('AM', am)}
      {section('PM', pm)}
      {section('Full Day', full)}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  date,
  jobs,
  colorMap,
  onSelectDay,
  dragJob,
  dragOverDate,
  onJobDoubleClick,
  onJobDragStart,
  onDayDragOver,
  onDayDrop,
}: {
  date: Date;
  jobs: CalendarJob[];
  colorMap: Map<string, number>;
  onSelectDay: (d: Date) => void;
  dragJob: CalendarJob | null;
  dragOverDate: string | null;
  onJobDoubleClick: (job: CalendarJob) => void;
  onJobDragStart: (job: CalendarJob) => void;
  onDayDragOver: (dateStr: string) => void;
  onDayDrop: (dateStr: string) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  const today = new Date();

  return (
    <div className="flex flex-col">
      {/* Day column headers */}
      <div className="grid grid-cols-7 border-b border-ios-gray-200">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const dayJobs = jobsForDate(jobs, day);
          const projectIds = [...new Set(dayJobs.map((j) => j.projectId))];
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
                  isToday ? 'bg-teal-600 text-white' : 'text-teal-900'
                }`}
              >
                {format(day, 'd')}
              </span>
              {/* Project-colored dots */}
              <div className="flex gap-0.5 h-3 items-center">
                {projectIds.slice(0, 4).map((pid) => {
                  const archived = dayJobs.some(j => j.projectId === pid && j.isArchived);
                  const dotClass = archived ? 'bg-gray-400' : PROJECT_COLORS[(colorMap.get(pid) ?? 0) % PROJECT_COLORS.length].dot;
                  return <span key={pid} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />;
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Events per day */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-ios-gray-100">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayJobs = jobsForDate(jobs, day);
          const isDropTarget = dragOverDate === dateStr && dragJob?.date !== dateStr;
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] p-1 space-y-1 transition-colors ${isDropTarget ? 'bg-teal-50' : ''}`}
              onDragOver={(e) => { e.preventDefault(); onDayDragOver(dateStr); }}
              onDrop={() => onDayDrop(dateStr)}
              onDragLeave={() => onDayDragOver('')}
            >
              {dayJobs.slice(0, 4).map((j, i) => {
                const c = j.isArchived
                  ? { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-400' }
                  : PROJECT_COLORS[(colorMap.get(j.projectId) ?? 0) % PROJECT_COLORS.length];
                const isDragging = dragJob?.projectId === j.projectId && dragJob?.phaseId === j.phaseId && dragJob?.date === j.date && dragJob?.shift === j.shift;
                return (
                  <div
                    key={i}
                    draggable={!j.isArchived}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onJobDragStart(j); }}
                    onDoubleClick={() => onJobDoubleClick(j)}
                    className={`rounded px-1 py-0.5 border cursor-grab active:cursor-grabbing select-none transition-opacity ${c.bg} ${c.border} ${isDragging ? 'opacity-40' : ''}`}
                  >
                    <p className={`text-[9px] font-semibold leading-tight truncate ${c.text}`}>
                      {j.phaseName.replace('First Visit: ', '').replace('Second Visit: ', '').split(':')[0]}
                    </p>
                    {j.memberNames.length > 0 && (
                      <p className="text-[8px] text-ios-gray-600 truncate leading-tight">
                        {j.memberNames.slice(0, 2).join(', ')}{j.memberNames.length > 2 ? ` +${j.memberNames.length - 2}` : ''}
                      </p>
                    )}
                  </div>
                );
              })}
              {dayJobs.length > 4 && (
                <p className="text-[9px] text-ios-gray-400 px-1">+{dayJobs.length - 4}</p>
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
  jobs,
  colorMap,
  onSelectDay,
}: {
  date: Date;
  jobs: CalendarJob[];
  colorMap: Map<string, number>;
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
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-ios-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {calDays.map((day) => {
          const inMonth = isSameMonth(day, date);
          const isToday = isSameDay(day, today);
          const dayJobs = jobsForDate(jobs, day);
          const projectIds = [...new Set(dayJobs.map((j) => j.projectId))];

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-center py-1 rounded-xl ${inMonth ? 'active:bg-ios-gray-100' : ''}`}
              disabled={!inMonth}
            >
              <span
                className={`text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-teal-600 text-white' : inMonth ? 'text-teal-900' : 'text-ios-gray-300'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="flex gap-0.5 h-2 items-center">
                {projectIds.slice(0, 3).map((pid) => {
                  const archived = dayJobs.some(j => j.projectId === pid && j.isArchived);
                  const dotClass = archived ? 'bg-gray-400' : PROJECT_COLORS[(colorMap.get(pid) ?? 0) % PROJECT_COLORS.length].dot;
                  return <span key={pid} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />;
                })}
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
  projects: { id: string; name: string; colorIdx: number; isArchived: boolean }[];
  members: { id: string; name: string }[];
  memberFilter: string | null;
  projectFilter: string | null;
  shiftFilter: string | null;
  setMemberFilter: (v: string | null) => void;
  setProjectFilter: (v: string | null) => void;
  setShiftFilter: (v: string | null) => void;
}

function FilterSheet({
  show, onClose, projects, members,
  memberFilter, projectFilter, shiftFilter,
  setMemberFilter, setProjectFilter, setShiftFilter,
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
          <h3 className="font-bold text-teal-900">Filters</h3>
          <div className="flex items-center gap-3">
            {hasFilter && (
              <button onClick={clearAll} className="text-sm text-red-600 font-semibold">Clear All</button>
            )}
            <button onClick={onClose} className="text-sm text-teal-600 font-semibold">Done</button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Shift filter */}
          <div>
            <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">Shift</p>
            <div className="flex gap-2">
              {(['AM', 'PM', 'Full Day'] as const).map((shift) => (
                <button
                  key={shift}
                  onClick={() => setShiftFilter(shiftFilter === shift ? null : shift)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold min-h-[36px] transition-colors ${
                    shiftFilter === shift ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>

          {/* Project filter */}
          {projects.length > 1 && (
            <div>
              <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-2">Project</p>
              <div className="space-y-1">
                {projects.map((p) => {
                  const c = p.isArchived
                    ? { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' }
                    : PROJECT_COLORS[p.colorIdx % PROJECT_COLORS.length];
                  const active = projectFilter === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setProjectFilter(active ? null : p.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-colors ${
                        active ? `${c.bg} ${c.text}` : 'bg-ios-gray-50 text-teal-900'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
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
                {members.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMemberFilter(memberFilter === m.id ? null : m.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold min-h-[36px] transition-colors ${
                      memberFilter === m.id ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
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
  const { state, dispatch, movePhaseDate } = useApp();
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dragJob, setDragJob] = useState<CalendarJob | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{ job: CalendarJob; newDate: string; issues: string[] } | null>(null);

  const colorMap = useMemo(() => buildColorMap(state.projects), [state.projects]);
  const teamMemberMap = useMemo(() => new Map(state.teamMembers.map((m) => [m.id, m])), [state.teamMembers]);
  const allJobs   = useMemo(() => buildJobs(state.projects, teamMemberMap), [state.projects, teamMemberMap]);
  const filteredJobs = useMemo(
    () => applyFilters(allJobs, memberFilter, projectFilter, shiftFilter),
    [allJobs, memberFilter, projectFilter, shiftFilter]
  );

  const projectOptions = useMemo(
    () =>
      state.projects
        .filter((p) => p.schedule)
        .map((p) => ({
          id: p.id,
          name: p.inputs.clientName || p.inputs.projectName || 'Untitled',
          colorIdx: colorMap.get(p.id) ?? 0,
          isArchived: p.inputs.status === 'archived',
        })),
    [state.projects, colorMap]
  );

  const memberOptions = useMemo(() => {
    const seen = new Map<string, string>();
    allJobs.forEach((j) =>
      j.memberIds.forEach((id, idx) => {
        if (!seen.has(id)) seen.set(id, j.memberNames[idx] ?? id);
      })
    );
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allJobs]);

  const activeFilterCount = [memberFilter, projectFilter, shiftFilter].filter(Boolean).length;

  function navigate(dir: 1 | -1) {
    if (view === 'day')   setCurrentDate((d) => addDays(d, dir));
    else if (view === 'week') setCurrentDate((d) => addWeeks(d, dir));
    else                  setCurrentDate((d) => addMonths(d, dir));
  }

  function goToday() { setCurrentDate(new Date()); }

  function handleSelectDay(day: Date) {
    setCurrentDate(day);
    setView('day');
  }

  function handleJobDoubleClick(job: CalendarJob) {
    dispatch({ type: 'SET_ACTIVE_PROJECT', id: job.projectId });
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'inputs' });
  }

  function handleDayDrop(dateStr: string) {
    if (!dragJob || dragJob.date === dateStr || dragJob.isArchived) {
      setDragJob(null);
      setDragOverDate(null);
      return;
    }
    const newSchedule = movePhaseDate(dragJob.projectId, dragJob.phaseId, dragJob.date, dateStr);
    const newDay = newSchedule.days.find((d) => d.date === dateStr);
    const issues = (newDay?.entries ?? [])
      .filter((e) => e.phaseId === dragJob.phaseId && (e.status === 'conflict' || e.status === 'needs-assignment' || e.status === 'over-max'))
      .flatMap((e) => e.warnings.length > 0 ? e.warnings : [`${e.assignedMemberName ?? 'Unassigned'}: ${e.status}`]);
    if (issues.length > 0) setConflictInfo({ job: dragJob, newDate: dateStr, issues });
    setDragJob(null);
    setDragOverDate(null);
  }

  function dateLabel() {
    if (view === 'day') return format(currentDate, 'EEE, MMM d');
    if (view === 'week') {
      const s = startOfWeek(currentDate, { weekStartsOn: 1 });
      const e = addDays(s, 6);
      return format(s, 'MMM') === format(e, 'MMM')
        ? `${format(s, 'MMM d')}–${format(e, 'd, yyyy')}`
        : `${format(s, 'MMM d')}–${format(e, 'MMM d, yyyy')}`;
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
          <h1 className="text-lg font-bold text-teal-900">Calendar</h1>
          <button
            onClick={() => setShowFilters(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl text-ios-gray-600 active:bg-ios-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z" clipRule="evenodd" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-teal-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
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
                view === v ? 'bg-white text-teal-900 shadow-sm' : 'text-ios-gray-600'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navigation */}
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
            <span className="text-sm font-semibold text-teal-900">{dateLabel()}</span>
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

        {/* Project color legend */}
        {projectOptions.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {projectOptions.map((p) => {
              const dotClass = p.isArchived ? 'bg-gray-400' : PROJECT_COLORS[p.colorIdx % PROJECT_COLORS.length].dot;
              return (
                <span key={p.id} className={`flex items-center gap-1 text-[10px] ${p.isArchived ? 'text-gray-400' : 'text-ios-gray-600'}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
                  {p.name}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {view === 'day' && (
          <DayView
            date={currentDate}
            jobs={filteredJobs}
            colorMap={colorMap}
            dragJob={dragJob}
            dragOverDate={dragOverDate}
            onJobDoubleClick={handleJobDoubleClick}
            onJobDragStart={(j) => setDragJob(j)}
            onDayDragOver={(d) => setDragOverDate(d || null)}
            onDayDrop={handleDayDrop}
          />
        )}
        {view === 'week' && (
          <WeekView
            date={currentDate}
            jobs={filteredJobs}
            colorMap={colorMap}
            onSelectDay={handleSelectDay}
            dragJob={dragJob}
            dragOverDate={dragOverDate}
            onJobDoubleClick={handleJobDoubleClick}
            onJobDragStart={(j) => setDragJob(j)}
            onDayDragOver={(d) => setDragOverDate(d || null)}
            onDayDrop={handleDayDrop}
          />
        )}
        {view === 'month' && (
          <MonthView date={currentDate} jobs={filteredJobs} colorMap={colorMap} onSelectDay={handleSelectDay} />
        )}
      </div>

      {conflictInfo && (
        <ConflictDialog
          issues={conflictInfo.issues}
          onKeep={() => setConflictInfo(null)}
          onRevert={() => {
            movePhaseDate(conflictInfo.job.projectId, conflictInfo.job.phaseId, conflictInfo.newDate, conflictInfo.job.date);
            setConflictInfo(null);
          }}
        />
      )}

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
