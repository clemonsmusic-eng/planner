import { useEffect, useState, useMemo } from 'react';
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
import { shiftTimeRange } from '../lib/dateUtils';
import { startTimeLookup } from '../lib/shiftStartTimes';
import type { Project, TeamMember, ExperienceLevel, ShiftTimeSettings } from '../types';

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
  /** The PM who owns the job, not whoever the scheduler put on this shift. */
  projectManagerName: string | null;
  originAddress: string;
  destinationAddress: string;
  /** Whether this shift ends at the destination rather than the origin. */
  isMoveDay: boolean;
  note: string;
  /** A start set on this shift, which beats the Settings time for its slot. */
  startTime?: string;
}

/**
 * The phases that end somewhere other than where they started. Everything else
 * — sorting, packing, cleanout — happens at the origin, so showing a
 * destination against them would be telling the crew to drive to the wrong
 * address.
 */
const MOVE_DAY_PHASES = new Set(['phase-5-1', 'phase-5-2']);

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
    const pmName = project.inputs.projectManagerId
      ? teamMemberMap.get(project.inputs.projectManagerId)?.name ?? null
      : null;

    const startOf = startTimeLookup(project.inputs);

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
            projectManagerName: pmName,
            originAddress: project.inputs.originAddress ?? '',
            destinationAddress: project.inputs.destinationAddress ?? '',
            isMoveDay: MOVE_DAY_PHASES.has(entry.phaseId),
            note:
              (project.inputs.shiftNotes ?? []).find(
                (n) => n.phaseId === entry.phaseId && n.date === day.date
              )?.note ?? '',
            startTime: startOf(entry.phaseId, day.date),
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
    ? { bg: 'bg-ios-gray-100', text: 'text-ios-gray-400', border: 'border-gray-200' }
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
          <p className={`text-xs truncate mt-0.5 ${job.isArchived ? 'text-ios-gray-400' : 'text-teal-700'}`}>{job.projectName}</p>
          {job.memberNames.length > 0 && (
            <div className="mt-0.5 space-y-0.5">
              {job.memberNames.map((name, idx) => {
                const expLevel = job.memberExperiences[idx];
                const hasExp = expLevel && expLevel !== 'Average';
                return (
                  <div key={idx} className="flex items-center gap-1">
                    <span className={`text-[11px] truncate ${job.isArchived ? 'text-ios-gray-400' : 'text-ios-gray-600'}`}>{name}</span>
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
      <div className="fixed inset-0 z-[60] bg-black/50" />
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

/** Saturday and Sunday, which the business doesn't normally work. */
const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/**
 * The days a grid actually draws.
 *
 * Saturday and Sunday are dropped outright — not greyed, not left blank —
 * so an ordinary week is five columns of the days the business works and the
 * weekdays get the width back. A weekend that does carry a shift is kept,
 * because a hidden column would be hidden work; the decision is taken across
 * the whole grid so it stays rectangular.
 */
function weekdaysOnly(all: Date[], worked: (d: Date) => boolean): Date[] {
  return all.some((d) => isWeekend(d) && worked(d)) ? all : all.filter((d) => !isWeekend(d));
}

/** The hours an hourly week grid draws, and how tall each one is. */
const HOUR_START = 6;
const HOUR_END = 20;
const HOUR_PX = 56;

/** "4 AM" / "12 PM", the way a wall clock reads. */
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

/**
 * The week as an hourly grid.
 *
 * The block view answers "what is on this week"; this one answers "when does
 * it actually start and how long does it run", which is the question you have
 * when two shifts are on the same day. Shifts are positioned and sized from
 * their real start time and hours, so an AM and a PM job on one day sit apart
 * on the column the way they sit apart in the day.
 */
function WeekHourView({
  date,
  jobs,
  colorMap,
  shiftTimes,
  onSelectDay,
  onJobDoubleClick,
}: {
  date: Date;
  jobs: CalendarJob[];
  colorMap: Map<string, number>;
  shiftTimes: ShiftTimeSettings;
  onSelectDay: (d: Date) => void;
  onJobDoubleClick: (job: CalendarJob) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const days = weekdaysOnly(
    eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }),
    (d) => jobsForDate(jobs, d).length > 0
  );
  const today = new Date();
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const columns = `3.5rem repeat(${days.length}, 1fr)`;

  /** Where a shift starts, in minutes past midnight. */
  const startMinutes = (shift: string, override?: string) => {
    const [h, m] = (override || (shift === 'PM' ? shiftTimes.pm : shiftTimes.am)).split(':').map(Number);
    return (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[46rem]">
        {/* Day headings, held above the grid so they stay while it scrolls. */}
        <div className="grid sticky top-0 z-10 bg-white border-b border-ios-gray-200" style={{ gridTemplateColumns: columns }}>
          <div />
          {days.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-center py-2 gap-0.5 active:bg-ios-gray-50 ${
                isWeekend(day) ? 'bg-ios-gray-50' : ''
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${isWeekend(day) ? 'text-ios-gray-400' : 'text-ios-gray-500'}`}>
                {format(day, 'EEE')}
              </span>
              <span
                className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                  isSameDay(day, today) ? 'bg-teal-600 text-white' : 'text-teal-900'
                }`}
              >
                {format(day, 'd')}
              </span>
            </button>
          ))}
        </div>

        {/* The half-line of padding keeps the first hour label off the top edge. */}
        <div className="grid relative pt-2" style={{ gridTemplateColumns: columns }}>
          {/* Hour rail */}
          <div className="border-r border-ios-gray-200">
            {hours.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_PX }}>
                <span className="absolute top-0 -translate-y-1/2 right-1.5 text-[10px] font-medium text-ios-gray-500 tabular-nums">
                  {hourLabel(h)}
                </span>
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayJobs = jobsForDate(jobs, day);
            return (
              <div
                key={day.toISOString()}
                className={`relative border-r border-ios-gray-100 ${isWeekend(day) ? 'bg-ios-gray-50' : 'bg-white'}`}
                style={{ height: hours.length * HOUR_PX }}
              >
                {hours.map((h) => (
                  <div key={h} className="border-b border-ios-gray-100" style={{ height: HOUR_PX }} />
                ))}

                {dayJobs.map((j, i) => {
                  const start = startMinutes(j.shift, j.startTime);
                  const top = ((start - HOUR_START * 60) / 60) * HOUR_PX;
                  const height = Math.max((j.hours || 1) * HOUR_PX, 28);
                  const c = j.isArchived
                    ? { bg: 'bg-ios-gray-100', border: 'border-gray-200', text: 'text-ios-gray-400' }
                    : PROJECT_COLORS[(colorMap.get(j.projectId) ?? 0) % PROJECT_COLORS.length];
                  return (
                    <div
                      key={`${dateStr}-${i}`}
                      onDoubleClick={() => onJobDoubleClick(j)}
                      title={`${j.projectName} — ${j.phaseName}`}
                      className={`absolute left-0.5 right-0.5 rounded border overflow-hidden px-1 py-0.5 ${c.bg} ${c.border}`}
                      style={{ top: Math.max(top, 0), height }}
                    >
                      <p className={`text-[10px] font-bold leading-tight truncate ${c.text}`}>{j.projectName}</p>
                      <p className={`text-[9px] font-semibold leading-tight truncate ${c.text}`}>
                        {j.phaseName.split(':').pop()!.trim()}
                      </p>
                      <p className="text-[9px] text-ios-gray-600 leading-tight truncate">
                        {shiftTimeRange(j.shift, j.hours, shiftTimes, j.startTime)}
                      </p>
                      {j.memberNames.length > 0 && height > 70 && (
                        <p className="text-[9px] text-ios-gray-600 leading-tight truncate">
                          {j.memberNames.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeekView({
  date,
  jobs,
  colorMap,
  shiftTimes,
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
  shiftTimes: ShiftTimeSettings;
  onSelectDay: (d: Date) => void;
  dragJob: CalendarJob | null;
  dragOverDate: string | null;
  onJobDoubleClick: (job: CalendarJob) => void;
  onJobDragStart: (job: CalendarJob) => void;
  onDayDragOver: (dateStr: string) => void;
  onDayDrop: (dateStr: string) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const days = weekdaysOnly(
    eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }),
    (d) => jobsForDate(jobs, d).length > 0
  );
  const today = new Date();
  const cols = days.length === 7 ? 'grid-cols-7' : 'grid-cols-5';

  return (
    <div className="flex flex-col">
      {/* Day column headers */}
      <div className={`grid ${cols} border-b border-ios-gray-200`}>
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const dayJobs = jobsForDate(jobs, day);
          const projectIds = [...new Set(dayJobs.map((j) => j.projectId))];
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col items-center py-2 gap-0.5 active:bg-ios-gray-50 ${
                isWeekend(day) ? 'bg-ios-gray-50' : ''
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase ${
                  isWeekend(day) ? 'text-ios-gray-400' : 'text-ios-gray-500'
                }`}
              >
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
                  const dotClass = archived ? 'bg-ios-gray-400' : PROJECT_COLORS[(colorMap.get(pid) ?? 0) % PROJECT_COLORS.length].dot;
                  return <span key={pid} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />;
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Events per day */}
      <div className={`grid ${cols} flex-1 divide-x divide-ios-gray-100`}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayJobs = jobsForDate(jobs, day);
          const isDropTarget = dragOverDate === dateStr && dragJob?.date !== dateStr;
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] lg:min-h-[420px] p-1 space-y-1 transition-colors ${
                isDropTarget ? 'bg-teal-50' : isWeekend(day) ? 'bg-ios-gray-50' : ''
              }`}
              onDragOver={(e) => { e.preventDefault(); onDayDragOver(dateStr); }}
              onDrop={() => onDayDrop(dateStr)}
              onDragLeave={() => onDayDragOver('')}
            >
              {dayJobs.slice(0, 4).map((j, i) => {
                const c = j.isArchived
                  ? { bg: 'bg-ios-gray-100', border: 'border-gray-200', text: 'text-ios-gray-400' }
                  : PROJECT_COLORS[(colorMap.get(j.projectId) ?? 0) % PROJECT_COLORS.length];
                const isDragging = dragJob?.projectId === j.projectId && dragJob?.phaseId === j.phaseId && dragJob?.date === j.date && dragJob?.shift === j.shift;
                return (
                  <div
                    key={i}
                    draggable={!j.isArchived}
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onJobDragStart(j); }}
                    onDoubleClick={() => onJobDoubleClick(j)}
                    className={`rounded px-1 py-0.5 lg:px-1.5 lg:py-1 border cursor-grab active:cursor-grabbing select-none transition-opacity ${c.bg} ${c.border} ${isDragging ? 'opacity-40' : ''}`}
                  >
                    {/*
                      A phone column is ~50px wide, so it gets the phase and a
                      couple of names. A desktop or landscape-iPad column has
                      room for the job itself: whose it is, who is running it,
                      when the shift runs and how long.
                    */}
                    <p className={`hidden lg:block text-[11px] font-bold leading-tight truncate ${c.text}`}>
                      {j.projectName}
                    </p>
                    <p className={`text-[9px] lg:text-[10px] font-semibold leading-tight truncate ${c.text}`}>
                      {j.phaseName.replace('First Visit: ', '').replace('Second Visit: ', '').split(':')[0]}
                    </p>
                    <p className="hidden lg:block text-[10px] text-ios-gray-600 leading-tight truncate">
                      {j.shift} · {shiftTimeRange(j.shift, j.hours, shiftTimes, j.startTime)}
                    </p>
                    <p className="hidden lg:block text-[10px] text-ios-gray-600 leading-tight truncate">
                      PM: {j.projectManagerName ?? 'Unassigned'}
                    </p>
                    {j.memberNames.length > 0 && (
                      <p className="text-[8px] lg:text-[10px] text-ios-gray-600 truncate leading-tight">
                        <span className="hidden lg:inline">Crew: </span>
                        {j.memberNames.slice(0, 2).join(', ')}{j.memberNames.length > 2 ? ` +${j.memberNames.length - 2}` : ''}
                      </p>
                    )}
                    {j.note && (
                      <p className="hidden lg:block text-[10px] text-ios-gray-500 italic leading-tight truncate" title={j.note}>
                        {j.note}
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

/**
 * The month grid.
 *
 * On a phone a cell is ~50px wide and can only carry dots. Above lg there is
 * room for the shifts themselves, so each cell lists them — project, PM and
 * shift type — and pointing at one opens the rest: crew, addresses, times and
 * the shift note.
 *
 * Hover opens it and click pins it, because the same layout runs on an iPad in
 * landscape where there is no hover at all.
 */
function MonthView({
  date,
  jobs,
  colorMap,
  shiftTimes,
  onSelectDay,
}: {
  date: Date;
  jobs: CalendarJob[];
  colorMap: Map<string, number>;
  shiftTimes: ShiftTimeSettings;
  onSelectDay: (d: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const allCalDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const calDays = weekdaysOnly(allCalDays, (d) => jobsForDate(jobs, d).length > 0);
  const today = new Date();
  // Dropping the weekends leaves whole Monday-to-Friday rows, so the grid stays
  // rectangular either way — five columns or seven.
  const showWeekend = calDays.length === allCalDays.length;
  const monthCols = showWeekend ? 'grid-cols-7' : 'grid-cols-5';

  // Which chip's details are showing, and whether a click pinned them there.
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; below: boolean } | null>(null);
  const openKey = pinned ?? hovered;

  useEffect(() => {
    if (!pinned) return;
    // Clearing only the pin would fall straight back to the hover that opened
    // it, and the card would sit there looking like Escape did nothing.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPinned(null); setHovered(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinned]);

  const dayLabels = showWeekend
    ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
    : ['Mo', 'Tu', 'We', 'Th', 'Fr'];
  const jobKey = (j: CalendarJob) => `${j.projectId}:${j.date}:${j.phaseId}:${j.shift}`;
  const openJob = openKey ? jobs.find((j) => jobKey(j) === openKey) ?? null : null;

  /** Place the card against the chip, flipping above it near the window's foot. */
  function show(key: string, el: HTMLElement, pin: boolean) {
    const r = el.getBoundingClientRect();
    const below = r.bottom + 260 < window.innerHeight;
    setAnchor({
      x: Math.min(Math.max(r.left, 12), window.innerWidth - 300),
      y: below ? r.bottom + 6 : r.top - 6,
      below,
    });
    if (pin) setPinned((k) => (k === key ? null : key));
    else setHovered(key);
  }

  return (
    <div className="px-3 py-3" onMouseLeave={() => setHovered(null)}>
      <div className={`grid ${monthCols} mb-1`}>
        {dayLabels.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-semibold py-1 ${
              showWeekend && (i === 0 || i === 6) ? 'text-ios-gray-400' : 'text-ios-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className={`grid ${monthCols} gap-y-1 lg:gap-1`}>
        {calDays.map((day) => {
          const inMonth = isSameMonth(day, date);
          const isToday = isSameDay(day, today);
          const dayJobs = jobsForDate(jobs, day);
          const projectIds = [...new Set(dayJobs.map((j) => j.projectId))];

          return (
            <div
              key={day.toISOString()}
              className={`flex flex-col rounded-xl lg:min-h-[112px] lg:p-1 lg:border ${
                inMonth
                  ? `lg:border-ios-gray-200 ${isWeekend(day) ? 'lg:bg-ios-gray-50' : 'lg:bg-white'}`
                  : 'lg:border-transparent'
              }`}
            >
              <button
                onClick={() => onSelectDay(day)}
                disabled={!inMonth}
                className={`flex flex-col items-center lg:items-start py-1 lg:py-0 rounded-xl ${
                  inMonth ? 'active:bg-ios-gray-100 lg:hover:bg-transparent' : ''
                }`}
                aria-label={`Open ${format(day, 'EEEE, MMMM d')}`}
              >
                <span
                  className={`text-sm font-semibold w-8 h-8 lg:w-7 lg:h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-teal-600 text-white' : inMonth ? 'text-teal-900' : 'text-ios-gray-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {/* Phone: one dot per project, all a 50px cell has room for. */}
                <div className="lg:hidden flex gap-0.5 h-2 items-center">
                  {projectIds.slice(0, 3).map((pid) => {
                    const archived = dayJobs.some((j) => j.projectId === pid && j.isArchived);
                    const dotClass = archived
                      ? 'bg-ios-gray-400'
                      : PROJECT_COLORS[(colorMap.get(pid) ?? 0) % PROJECT_COLORS.length].dot;
                    return <span key={pid} className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />;
                  })}
                </div>
              </button>

              {/* Desktop and iPad landscape: the shifts themselves. */}
              <div className="hidden lg:flex flex-col gap-0.5 mt-0.5 min-w-0">
                {dayJobs.slice(0, 3).map((job) => {
                  const key = jobKey(job);
                  const colors = job.isArchived
                    ? { bg: 'bg-ios-gray-100', text: 'text-ios-gray-500', border: 'border-ios-gray-200' }
                    : PROJECT_COLORS[(colorMap.get(job.projectId) ?? 0) % PROJECT_COLORS.length];
                  return (
                    <button
                      key={key}
                      onMouseEnter={(e) => show(key, e.currentTarget, false)}
                      onClick={(e) => show(key, e.currentTarget, true)}
                      aria-expanded={openKey === key}
                      className={`w-full text-left px-1.5 py-1 rounded-md border ${colors.bg} ${colors.border} ${
                        pinned === key ? 'ring-2 ring-teal-500' : ''
                      }`}
                    >
                      <span className={`block text-[11px] font-semibold leading-tight truncate ${colors.text}`}>
                        {job.projectName}
                      </span>
                      <span className="block text-[10px] leading-tight truncate text-ios-gray-600">
                        {job.projectManagerName ?? 'No PM'} · {job.shift}
                      </span>
                    </button>
                  );
                })}
                {dayJobs.length > 3 && (
                  <button
                    onClick={() => onSelectDay(day)}
                    className="text-[10px] font-semibold text-ios-gray-500 text-left px-1.5 hover:text-teal-700"
                  >
                    +{dayJobs.length - 3} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {openJob && anchor && (
        <MonthJobDetail
          job={openJob}
          anchor={anchor}
          shiftTimes={shiftTimes}
          pinned={pinned !== null}
          onClose={() => { setPinned(null); setHovered(null); }}
        />
      )}
    </div>
  );
}

/** The expanded card: everything the chip had no room for. */
function MonthJobDetail({
  job,
  anchor,
  shiftTimes,
  pinned,
  onClose,
}: {
  job: CalendarJob;
  anchor: { x: number; y: number; below: boolean };
  shiftTimes: ShiftTimeSettings;
  pinned: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Only a pinned card gets a catcher; a hover one must not eat clicks. */}
      {pinned && <div className="fixed inset-0 z-[54]" onClick={onClose} aria-hidden="true" />}
      <div
        role="dialog"
        aria-label={`${job.projectName} — ${job.phaseName}`}
        // A hover card must not swallow the pointer, but a pinned one is meant
        // to be reached — someone will want to select the address out of it.
        className={`fixed z-[56] w-72 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-ios-gray-200 p-3 ${
          pinned ? '' : 'pointer-events-none'
        }`}
        style={{
          left: anchor.x,
          top: anchor.below ? anchor.y : undefined,
          bottom: anchor.below ? undefined : `calc(100vh - ${anchor.y}px)`,
        }}
      >
        <p className="text-sm font-bold text-teal-900 leading-tight">{job.projectName}</p>
        <p className="text-xs text-ios-gray-600 mb-2">{job.phaseName}</p>

        <dl className="space-y-1.5 text-xs">
          <DetailRow label="Shift">
            {job.shift} · {shiftTimeRange(job.shift, job.hours, shiftTimes, job.startTime)} · {job.hours} hrs
          </DetailRow>
          <DetailRow label="PM">{job.projectManagerName ?? 'Unassigned'}</DetailRow>
          <DetailRow label="Crew">
            {job.memberNames.length > 0 ? job.memberNames.join(', ') : 'Nobody assigned yet'}
          </DetailRow>
          {job.originAddress && <DetailRow label="From">{job.originAddress}</DetailRow>}
          {job.isMoveDay && job.destinationAddress && (
            <DetailRow label="To">{job.destinationAddress}</DetailRow>
          )}
          {job.note && <DetailRow label="Note">{job.note}</DetailRow>}
        </dl>
      </div>
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-12 flex-shrink-0 font-semibold text-ios-gray-500 uppercase tracking-wide text-[10px] pt-px">
        {label}
      </dt>
      <dd className="flex-1 min-w-0 text-teal-900 break-words">{children}</dd>
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
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-lg z-[61] bg-white rounded-t-2xl lg:rounded-2xl shadow-xl"
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
                    ? { bg: 'bg-ios-gray-100', text: 'text-ios-gray-500', dot: 'bg-ios-gray-400' }
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
  /*
   * Two ways to read a week. The block view stacks whatever is on a day; the
   * hourly one puts it against a clock, which is the view you want when two
   * shifts share a date and you need to see that they don't overlap.
   */
  const [hourly, setHourly] = useState(false);
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
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'plan' });
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
      const s = startOfWeek(currentDate, { weekStartsOn: 0 });
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
          <div className="flex items-center gap-1">
          {view === 'week' && (
            <button
              onClick={() => setHourly((h) => !h)}
              aria-pressed={hourly}
              aria-label={hourly ? 'Show the week as blocks' : 'Show the week by the hour'}
              title={hourly ? 'Show the week as blocks' : 'Show the week by the hour'}
              className={`w-10 h-10 flex items-center justify-center rounded-xl ${
                hourly ? 'bg-teal-50 text-teal-600' : 'text-ios-gray-600 active:bg-ios-gray-100 lg:hover:bg-ios-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowFilters(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl text-ios-gray-600 active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
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
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-600 active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
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
            className="w-8 h-8 flex items-center justify-center rounded-lg text-ios-gray-600 active:bg-ios-gray-100 lg:hover:bg-ios-gray-100"
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
              const dotClass = p.isArchived ? 'bg-ios-gray-400' : PROJECT_COLORS[p.colorIdx % PROJECT_COLORS.length].dot;
              return (
                <span key={p.id} className={`flex items-center gap-1 text-[10px] ${p.isArchived ? 'text-ios-gray-400' : 'text-ios-gray-600'}`}>
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
          hourly ? (
            <WeekHourView
              date={currentDate}
              jobs={filteredJobs}
              colorMap={colorMap}
              shiftTimes={state.shiftTimes}
              onSelectDay={handleSelectDay}
              onJobDoubleClick={handleJobDoubleClick}
            />
          ) : (
          <WeekView
            date={currentDate}
            jobs={filteredJobs}
            colorMap={colorMap}
            shiftTimes={state.shiftTimes}
            onSelectDay={handleSelectDay}
            dragJob={dragJob}
            dragOverDate={dragOverDate}
            onJobDoubleClick={handleJobDoubleClick}
            onJobDragStart={(j) => setDragJob(j)}
            onDayDragOver={(d) => setDragOverDate(d || null)}
            onDayDrop={handleDayDrop}
          />
          )
        )}
        {view === 'month' && (
          <MonthView date={currentDate} jobs={filteredJobs} colorMap={colorMap} shiftTimes={state.shiftTimes} onSelectDay={handleSelectDay} />
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
