import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../store/AppContext';
import {
  SETTINGS_GROUPS, SUB_LABELS, resolveOrder,
  type SettingsGroup as SettingsGroupDef, type SettingsGroupKey, type SettingsOrder,
} from '../lib/settingsLayout';
import { loadSettingsOrder, saveSettingsOrder } from '../lib/storage';
import { GRIP_PATH, useReorder } from '../lib/useReorder';
import type { ServiceCategory } from '../types';
import { FloatingSaveButton, FloatingSaveSpacer } from '../components/FloatingSaveButton';
import type { AvailabilitySlot, PhaseId, MemberPhaseRole, MemberPhaseRoles, RoleType, TeamMember, TeamMemberAvailability, PhaseTemplate, ListCategory, ExperienceLevel, AuctionAppSettings, TimeOffRequest, ChecklistTemplateSection, ChecklistTemplateItem, ChecklistAnchor, ChecklistOwner } from '../types';
import { formatDateLabel } from '../lib/dateUtils';
import { ANCHOR_LABELS, CHECKLIST_OWNERS, DEFAULT_CHECKLIST_TEMPLATE } from '../lib/checklistData';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: (keyof TeamMemberAvailability)[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_SHORT: Record<keyof TeamMemberAvailability, string> = {
  Mon: 'Mo', Tue: 'Tu', Wed: 'We', Thu: 'Th', Fri: 'Fr', Sat: 'Sa', Sun: 'Su',
};

const SLOT_CYCLE: AvailabilitySlot[] = ['Full Day', 'AM', 'PM', 'Unavailable'];

// Phase role grid
const ALL_SELECTABLE_ROLES: RoleType[] = ['PM', 'Assist PM', 'Lead', 'PM/Lead', 'Specialist', 'Mover'];

const PHASE_CONFIG: { id: PhaseId; label: string }[] = [
  { id: 'phase-1',            label: 'Vis 1' },
  { id: 'phase-2',            label: 'Vis 2' },
  { id: 'phase-3',            label: 'Sort' },
  { id: 'phase-4-1',          label: 'Pk AM' },
  { id: 'phase-4-2',          label: 'Pk PM' },
  { id: 'phase-5-1',          label: 'Mv AM' },
  { id: 'phase-5-2',          label: 'Mv PM' },
  { id: 'phase-6',            label: 'Clnout' },
  { id: 'phase-lot-prep',     label: 'LotPrp' },
  { id: 'phase-pickup-prep',  label: 'PkPrep' },
  { id: 'phase-7',            label: 'Pickup' },
];

function roleAbbr(r: RoleType): string {
  if (r === 'Assist PM') return 'APM';
  if (r === 'PM/Lead') return 'P/L';
  if (r === 'Specialist') return 'Spec';
  if (r === 'Mover') return 'Mov';
  return r; // PM, Lead
}

function phaseRoleCellDisplay(r: MemberPhaseRole): string {
  if (r === 'N/A') return 'N/A';
  if (r.length === 0) return 'N/A';
  if (r.length === 1) return roleAbbr(r[0]);
  return roleAbbr(r[0]) + '+' + (r.length - 1);
}

function phaseRoleCellColor(r: MemberPhaseRole): string {
  if (r === 'N/A' || r.length === 0) return 'bg-ios-gray-200 text-ios-gray-400';
  if (r.length > 1) return 'bg-teal-100 text-teal-800 border border-teal-300';
  const single = r[0];
  if (single === 'PM') return 'bg-teal-600 text-white';
  if (single === 'Assist PM') return 'bg-purple-500 text-white';
  if (single === 'Lead') return 'bg-sky-500 text-white';
  if (single === 'PM/Lead') return 'bg-teal-400 text-white';
  if (single === 'Specialist') return 'bg-green-500 text-white';
  if (single === 'Mover') return 'bg-amber-500 text-white';
  return 'bg-ios-gray-200 text-ios-gray-400';
}

function roleButtonColors(role: RoleType, selected: boolean): string {
  if (!selected) return 'bg-white text-teal-700 border border-ios-gray-300';
  if (role === 'PM') return 'bg-teal-600 text-white border-teal-600';
  if (role === 'Assist PM') return 'bg-purple-500 text-white border-purple-500';
  if (role === 'Lead') return 'bg-sky-500 text-white border-sky-500';
  if (role === 'PM/Lead') return 'bg-teal-400 text-white border-teal-400';
  if (role === 'Specialist') return 'bg-green-500 text-white border-green-500';
  if (role === 'Mover') return 'bg-amber-500 text-white border-amber-500';
  return 'bg-ios-gray-400 text-white border-ios-gray-400';
}

function slotLabel(s: AvailabilitySlot): string {
  if (s === 'Full Day') return 'FD';
  if (s === 'AM') return 'AM';
  if (s === 'PM') return 'PM';
  return '—';
}

function slotColors(s: AvailabilitySlot): string {
  if (s === 'Full Day') return 'bg-teal-500 text-white';
  if (s === 'AM') return 'bg-sky-400 text-white';
  if (s === 'PM') return 'bg-amber-400 text-white';
  return 'bg-ios-gray-200 text-ios-gray-400';
}

function nextSlot(current: AvailabilitySlot): AvailabilitySlot {
  return SLOT_CYCLE[(SLOT_CYCLE.indexOf(current) + 1) % SLOT_CYCLE.length];
}

// ─── Accordion Section ────────────────────────────────────────────────────────

/** A top-level Settings group, holding its submenus. */
function SettingsGroupCard({
  group,
  open,
  onToggle,
  children,
}: {
  group: SettingsGroupDef;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div data-group={group.label} className="bg-white rounded-2xl shadow-sm border border-ios-gray-200 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-4 min-h-[60px] active:bg-ios-gray-100 lg:hover:bg-ios-gray-100">
        <div className="text-left">
          <p className="font-bold text-teal-900 text-base">{group.label}</p>
          <p className="text-xs text-ios-gray-500 mt-0.5">{group.subtitle}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ml-3 ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && <div className="border-t border-ios-gray-100 p-2 space-y-2 bg-ios-gray-50/60">{children}</div>}
    </div>
  );
}

function AccordionSection({
  title,
  subtitle,
  open,
  onToggle,
  children,
  dragKey,
  rearranging,
  dragging,
  onDragStart,
}: {
  title: string;
  subtitle?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  dragKey?: string;
  rearranging?: boolean;
  dragging?: boolean;
  onDragStart?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      data-sub={dragKey}
      className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
        dragging ? 'border-teal-400 shadow-lg' : 'border-ios-gray-200'
      }`}
    >
      <button
        onClick={rearranging ? undefined : onToggle}
        // While rearranging the header is a handle, not a disclosure: opening a
        // panel mid-drag would move every row underneath the finger.
        onPointerDown={rearranging ? onDragStart : undefined}
        style={rearranging ? { touchAction: 'none' } : undefined}
        className={`w-full flex items-center justify-between px-4 py-3.5 min-h-[52px] ${
          rearranging ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        {rearranging && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
            className="w-4 h-4 text-ios-gray-400 flex-shrink-0 mr-3" aria-hidden="true">
            <path d="M7 4a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zm-6 5a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
        )}
        <div className="text-left flex-1 min-w-0">
          <p className="font-bold text-teal-900 truncate">{title}</p>
          {subtitle && <p className="text-xs text-ios-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ml-3 ${open ? 'rotate-180' : ''} ${rearranging ? 'opacity-0' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-ios-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: TeamMember;
  onChange: (updated: TeamMember) => void;
  onDelete: () => void;
  dragHandle?: React.ReactNode;
}

function MemberCard({ member, onChange, onDelete, dragHandle }: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);

  function cycleDay(day: keyof TeamMemberAvailability) {
    onChange({
      ...member,
      availability: { ...member.availability, [day]: nextSlot(member.availability[day]) },
    });
  }

  return (
    <div className="bg-ios-gray-50 rounded-xl border border-ios-gray-200 overflow-hidden">
      <div className="flex items-stretch">
        {dragHandle}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 flex items-center justify-between pr-4 py-3 min-h-[52px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                member.isPriority ? 'bg-teal-500' : 'bg-ios-gray-300'
              }`}
            />
            <span className="font-semibold text-teal-900 truncate">{member.name}</span>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-ios-gray-100">
          {/* Name + Priority */}
          <div className="flex items-center gap-3 pt-3">
            <input
              value={member.name}
              onChange={(e) => onChange({ ...member, name: e.target.value })}
              className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base font-semibold text-teal-900 bg-white"
              placeholder="Name"
            />
            <button
              onClick={() => onChange({ ...member, isPriority: !member.isPriority })}
              className={`px-3 py-2 rounded-xl text-sm font-semibold min-h-[44px] whitespace-nowrap transition-colors ${
                member.isPriority
                  ? 'bg-teal-100 text-teal-700 border border-teal-200'
                  : 'bg-ios-gray-100 text-ios-gray-600 border border-ios-gray-200'
              }`}
            >
              {member.isPriority ? '● Priority' : '○ Standard'}
            </button>
          </div>

          {/* Hour range */}
          <div>
            <p className="text-xs font-semibold text-ios-gray-600 uppercase tracking-wide mb-2">
              Weekly Hours
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-ios-gray-500 mb-1 block">Min</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={member.minHoursPerWeek ?? 0}
                  onChange={(e) =>
                    onChange({ ...member, minHoursPerWeek: parseInt(e.target.value) || 0 })
                  }
                  className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base text-center bg-white"
                />
              </div>
              <div className="flex items-end pb-2 text-ios-gray-400 font-light">—</div>
              <div className="flex-1">
                <label className="text-xs text-ios-gray-500 mb-1 block">Max</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={member.maxHoursPerWeek}
                  onChange={(e) =>
                    onChange({ ...member, maxHoursPerWeek: parseInt(e.target.value) || 0 })
                  }
                  className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base text-center bg-white"
                />
              </div>
            </div>
          </div>

          {/* Daily availability grid */}
          <div>
            <p className="text-xs font-semibold text-ios-gray-600 uppercase tracking-wide mb-2">
              Daily Availability — tap to cycle
            </p>
            <div className="flex gap-1">
              {DAYS.map((day) => {
                const slot = member.availability[day];
                return (
                  <button
                    key={day}
                    onClick={() => cycleDay(day)}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl min-h-[52px] transition-colors ${slotColors(slot)}`}
                  >
                    <span className="text-[9px] font-semibold opacity-70 leading-none">
                      {DAY_SHORT[day]}
                    </span>
                    <span className="text-[11px] font-bold leading-none">{slotLabel(slot)}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {SLOT_CYCLE.map((s) => (
                <span key={s} className="flex items-center gap-1 text-[10px] text-ios-gray-500">
                  <span className={`inline-block w-2 h-2 rounded-full ${slotColors(s).split(' ')[0]}`} />
                  {s === 'Full Day' ? 'FD = Full Day' : s === 'Unavailable' ? '— = Off' : s}
                </span>
              ))}
            </div>
          </div>

          {/* Time Off */}
          <TimeOffSection member={member} onChange={onChange} />

          {/* Delete */}
          <button
            onClick={onDelete}
            className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold min-h-[44px]"
          >
            Remove {member.name}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Time Off Section ─────────────────────────────────────────────────────────

function TimeOffSection({
  member,
  onChange,
}: {
  member: TeamMember;
  onChange: (updated: TeamMember) => void;
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  const periods = member.timeOff ?? [];
  const today = new Date().toISOString().slice(0, 10);

  function addPeriod() {
    if (!startDate || !endDate || endDate < startDate) return;
    const newPeriod: TimeOffRequest = {
      id: `to-${Date.now()}`,
      startDate,
      endDate,
      note: note.trim() || undefined,
    };
    onChange({ ...member, timeOff: [...periods, newPeriod] });
    setStartDate('');
    setEndDate('');
    setNote('');
    setAdding(false);
  }

  function removePeriod(id: string) {
    onChange({ ...member, timeOff: periods.filter((t) => t.id !== id) });
  }

  const upcoming = periods.filter((t) => t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const past = periods.filter((t) => t.endDate < today).sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div>
      <p className="text-xs font-semibold text-ios-gray-600 uppercase tracking-wide mb-2">Time Off</p>

      {/* Upcoming / active periods */}
      {upcoming.length > 0 && (
        <div className="space-y-1 mb-2">
          {upcoming.map((t) => {
            const isActive = today >= t.startDate && today <= t.endDate;
            return (
              <div key={t.id} className={`flex items-start justify-between gap-2 rounded-xl px-3 py-2 border ${isActive ? 'bg-amber-50 border-amber-200' : 'bg-white border-ios-gray-200'}`}>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isActive ? 'text-amber-800' : 'text-teal-900'}`}>
                    {isActive && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mr-1.5">Active · </span>}
                    {formatDateLabel(t.startDate)}
                    {t.startDate !== t.endDate && ` – ${formatDateLabel(t.endDate)}`}
                  </p>
                  {t.note && <p className="text-xs text-ios-gray-500 truncate">{t.note}</p>}
                </div>
                <button
                  onClick={() => removePeriod(t.id)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-ios-gray-400 active:text-red-500 rounded-lg mt-0.5"
                  aria-label="Remove time off"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Past periods (collapsed) */}
      {past.length > 0 && (
        <details className="mb-2">
          <summary className="text-xs text-ios-gray-400 cursor-pointer mb-1 select-none">
            {past.length} past period{past.length !== 1 ? 's' : ''}
          </summary>
          <div className="space-y-1 mt-1">
            {past.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-2 rounded-xl px-3 py-2 border border-ios-gray-200 bg-ios-gray-50 opacity-60">
                <div className="min-w-0">
                  <p className="text-sm text-ios-gray-600">
                    {formatDateLabel(t.startDate)}{t.startDate !== t.endDate && ` – ${formatDateLabel(t.endDate)}`}
                  </p>
                  {t.note && <p className="text-xs text-ios-gray-400 truncate">{t.note}</p>}
                </div>
                <button
                  onClick={() => removePeriod(t.id)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-ios-gray-300 active:text-red-500 rounded-lg mt-0.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Add form */}
      {adding ? (
        <div className="bg-white rounded-xl border border-teal-200 p-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-ios-gray-500 uppercase tracking-wide block mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (!endDate || e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full min-h-[40px] rounded-xl border border-ios-gray-300 px-2 py-1.5 text-sm bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold text-ios-gray-500 uppercase tracking-wide block mb-1">To</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-ios-gray-300 px-2 py-1.5 text-sm bg-white"
              />
            </div>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full min-h-[36px] rounded-xl border border-ios-gray-300 px-3 py-1.5 text-sm bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setStartDate(''); setEndDate(''); setNote(''); }}
              className="flex-1 py-2 rounded-xl border border-ios-gray-300 text-sm text-ios-gray-600 font-medium min-h-[36px]"
            >
              Cancel
            </button>
            <button
              onClick={addPeriod}
              disabled={!startDate || !endDate || endDate < startDate}
              className="flex-1 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold min-h-[36px] disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 border border-dashed border-ios-gray-300 rounded-xl text-xs font-semibold text-ios-gray-500 min-h-[40px] flex items-center justify-center gap-1.5"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Time Off
        </button>
      )}
    </div>
  );
}

// ─── Draggable Member List ────────────────────────────────────────────────────

type DragState = { memberId: string; fromIdx: number; overIdx: number };

function DraggableMemberList({
  members,
  onUpdate,
  onDelete,
  onReorder,
}: {
  members: TeamMember[];
  onUpdate: (idx: number, updated: TeamMember) => void;
  onDelete: (idx: number) => void;
  onReorder: (reordered: TeamMember[]) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  function computeDisplayed(d: DragState | null): TeamMember[] {
    if (!d || d.fromIdx === d.overIdx) return members;
    const arr = [...members];
    const [item] = arr.splice(d.fromIdx, 1);
    arr.splice(d.overIdx, 0, item);
    return arr;
  }

  function findOverIdx(clientY: number, displayed: TeamMember[]): number {
    for (let i = 0; i < displayed.length; i++) {
      const el = itemRefs.current.get(displayed[i].id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return displayed.length - 1;
  }

  function handleDragStart(e: React.PointerEvent, memberId: string) {
    e.preventDefault();
    e.stopPropagation();
    const fromIdx = members.findIndex((m) => m.id === memberId);
    if (fromIdx === -1) return;
    setDrag({ memberId, fromIdx, overIdx: fromIdx });
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag) return;
    e.preventDefault();
    const displayed = computeDisplayed(drag);
    const overIdx = findOverIdx(e.clientY, displayed);
    if (overIdx !== drag.overIdx) setDrag({ ...drag, overIdx });
  }

  function handlePointerUp() {
    if (!drag) return;
    if (drag.fromIdx !== drag.overIdx) {
      const arr = [...members];
      const [item] = arr.splice(drag.fromIdx, 1);
      arr.splice(drag.overIdx, 0, item);
      onReorder(arr);
    }
    setDrag(null);
  }

  const displayed = computeDisplayed(drag);

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="space-y-2"
    >
      {displayed.map((member) => {
        const originalIdx = members.findIndex((m) => m.id === member.id);
        const isDragging = drag?.memberId === member.id;
        return (
          <div
            key={member.id}
            ref={(el) => { itemRefs.current.set(member.id, el); }}
            className={`transition-opacity duration-100 ${isDragging ? 'opacity-40' : ''}`}
          >
            <MemberCard
              member={member}
              onChange={(updated) => onUpdate(originalIdx, updated)}
              onDelete={() => onDelete(originalIdx)}
              dragHandle={
                <div
                  onPointerDown={(e) => handleDragStart(e, member.id)}
                  className="flex-shrink-0 w-10 flex items-center justify-center self-stretch cursor-grab active:cursor-grabbing select-none"
                  style={{ touchAction: 'none' }}
                  aria-label="Drag to reorder"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-300">
                    <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                  </svg>
                </div>
              }
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Member Phase Roles Card ──────────────────────────────────────────────────

function MemberPhaseRolesCard({
  member,
  onChange,
}: {
  member: TeamMember;
  onChange: (updated: TeamMember) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activePhaseId, setActivePhaseId] = useState<PhaseId | null>(null);

  function toggleRole(phaseId: PhaseId, role: RoleType) {
    const current = member.phaseRoles[phaseId];
    let next: MemberPhaseRole;
    if (current === 'N/A') {
      next = [role];
    } else {
      const arr = current;
      const without = arr.filter((r) => r !== role);
      next = arr.includes(role) ? (without.length === 0 ? 'N/A' : without) : [...arr, role];
    }
    onChange({ ...member, phaseRoles: { ...member.phaseRoles, [phaseId]: next } });
  }

  function setPhaseNA(phaseId: PhaseId) {
    onChange({ ...member, phaseRoles: { ...member.phaseRoles, [phaseId]: 'N/A' } });
  }

  // Summary: list distinct active roles
  const uniqueRoles = [...new Set(
    PHASE_CONFIG.flatMap((p) => {
      const r = member.phaseRoles[p.id];
      return r === 'N/A' ? [] : r;
    })
  )];
  const summary = uniqueRoles.length > 0 ? uniqueRoles.join(', ') : 'N/A all phases';

  return (
    <div className="bg-ios-gray-50 rounded-xl border border-ios-gray-200 overflow-hidden">
      <button
        onClick={() => { setExpanded((e) => !e); setActivePhaseId(null); }}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[52px]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${member.isPriority ? 'bg-teal-500' : 'bg-ios-gray-300'}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-teal-900 truncate">{member.name}</p>
            <p className="text-[11px] text-ios-gray-500 truncate">{summary}</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-ios-gray-100">
          {/* Phase grid */}
          {[PHASE_CONFIG.slice(0, 5), PHASE_CONFIG.slice(5)].map((row, rowIdx) => (
            <div key={rowIdx} className={`flex gap-1 ${rowIdx === 1 ? 'mt-1' : ''}`}>
              {row.map((phase) => {
                const role = member.phaseRoles[phase.id];
                const isActive = activePhaseId === phase.id;
                return (
                  <button
                    key={phase.id}
                    onClick={() => setActivePhaseId(isActive ? null : phase.id)}
                    className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl min-h-[52px] transition-all
                      ${phaseRoleCellColor(role)}
                      ${isActive ? 'ring-2 ring-offset-1 ring-teal-500 scale-95' : ''}`}
                  >
                    <span className="text-[8px] font-semibold opacity-70 leading-none text-center">{phase.label}</span>
                    <span className="text-[10px] font-bold leading-none">{phaseRoleCellDisplay(role)}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Inline role picker */}
          {activePhaseId && (() => {
            const current = member.phaseRoles[activePhaseId];
            const activeLabel = PHASE_CONFIG.find(p => p.id === activePhaseId)?.label ?? '';
            return (
              <div className="mt-2 p-3 bg-white rounded-xl border border-teal-200 space-y-2">
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wide">
                  {activeLabel} — tap to toggle
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setPhaseNA(activePhaseId)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[34px] ${
                      current === 'N/A' ? 'bg-ios-gray-500 text-white border-ios-gray-500' : 'bg-white text-ios-gray-500 border-ios-gray-300'
                    }`}
                  >
                    N/A
                  </button>
                  {ALL_SELECTABLE_ROLES.map((role) => {
                    const selected = current !== 'N/A' && current.includes(role);
                    return (
                      <button key={role} onClick={() => toggleRole(activePhaseId, role)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors min-h-[34px] ${roleButtonColors(role, selected)}`}>
                        {role}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setActivePhaseId(null)} className="text-[10px] text-ios-gray-400 w-full text-center pt-0.5">
                  Done
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Hours options: 0, 0.5, 1.0 … 10.0
const HOURS_OPTIONS = Array.from({ length: 21 }, (_, i) => i * 0.5);

function HoursSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 min-h-[40px] rounded-xl border border-ios-gray-300 px-2 py-1 text-sm text-center bg-white appearance-none"
    >
      {HOURS_OPTIONS.map((h) => (
        <option key={h} value={h}>
          {h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}
        </option>
      ))}
    </select>
  );
}

// Team size options: 0–10
const TEAM_SIZE_OPTIONS = Array.from({ length: 11 }, (_, i) => i);

function TeamSizeSelect({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="flex-1 min-h-[40px] rounded-xl border border-ios-gray-300 px-2 py-1 text-sm text-center bg-white appearance-none"
    >
      {TEAM_SIZE_OPTIONS.map((n) => (
        <option key={n} value={n}>{n}</option>
      ))}
    </select>
  );
}

// ─── Phase Template Card ──────────────────────────────────────────────────────

function PhaseTemplateCard({
  template,
  onChange,
}: {
  template: PhaseTemplate;
  onChange: (updated: PhaseTemplate) => void;
}) {
  const shiftLabel = template.isAM ? 'AM' : template.isPM ? 'PM' : template.shift === 'client-pref' ? 'Client Pref' : template.shift;
  const isAuctionOnly = template.id === 'phase-lot-prep' || template.id === 'phase-pickup-prep' || template.id === 'phase-7';

  return (
    <div className={`bg-ios-gray-50 rounded-xl border px-4 py-3 ${isAuctionOnly ? 'border-amber-200' : 'border-ios-gray-200'}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-teal-900">{template.name}</p>
          {isAuctionOnly && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-amber-600">Auction only</span>
          )}
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ios-gray-200 text-ios-gray-600 whitespace-nowrap flex-shrink-0">
          {shiftLabel}
        </span>
      </div>
      {/* Hours range */}
      <div className="mb-2">
        <label className="text-[10px] font-semibold text-ios-gray-500 uppercase tracking-wide block mb-1">
          Hours / Person
        </label>
        <div className="flex items-center gap-2">
          <HoursSelect value={template.minHours} onChange={(v) => onChange({ ...template, minHours: v })} />
          <span className="text-xs text-ios-gray-400 flex-shrink-0">to</span>
          <HoursSelect value={template.maxHours} onChange={(v) => onChange({ ...template, maxHours: v })} />
        </div>
      </div>
      {/* Team size range */}
      <div className="mb-2">
        <label className="text-[10px] font-semibold text-ios-gray-500 uppercase tracking-wide block mb-1">
          Team Size
        </label>
        <div className="flex items-center gap-2">
          <TeamSizeSelect value={template.minTeamSize} onChange={(v) => onChange({ ...template, minTeamSize: v })} />
          <span className="text-xs text-ios-gray-400 flex-shrink-0">to</span>
          <TeamSizeSelect value={template.maxTeamSize} onChange={(v) => onChange({ ...template, maxTeamSize: v })} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {template.roles.map((r, i) => (
          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-semibold">
            {r.role}{r.isLocked ? ' 🔒' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Shift Hours Card (for shift-type-hours) ──────────────────────────────────

function ShiftHoursCard({
  list,
  onChange,
}: {
  list: ListCategory;
  onChange: (updated: ListCategory) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  type Row = { name: string; hours: number };

  function parseRows(): Row[] {
    return list.items.map(item => {
      const eqIdx = item.indexOf('=');
      if (eqIdx < 0) return null;
      const name = item.slice(0, eqIdx).trim();
      const hours = parseFloat(item.slice(eqIdx + 1).trim());
      if (!name || isNaN(hours)) return null;
      return { name, hours };
    }).filter((r): r is Row => r !== null);
  }

  function serialize(rows: Row[]): string[] {
    return rows.map(r => `${r.name}=${r.hours}`);
  }

  function updateRow(idx: number, field: 'name' | 'hours', val: string | number) {
    const rows = parseRows();
    rows[idx] = { ...rows[idx], [field]: val };
    onChange({ ...list, items: serialize(rows) });
  }

  function removeRow(idx: number) {
    const rows = parseRows();
    rows.splice(idx, 1);
    onChange({ ...list, items: serialize(rows) });
  }

  function addRow() {
    const rows = parseRows();
    onChange({ ...list, items: serialize([...rows, { name: 'New Shift', hours: 4 }]) });
  }

  const rows = parseRows();

  return (
    <div className="bg-ios-gray-50 rounded-xl border border-ios-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[48px]"
      >
        <div className="text-left flex-1 min-w-0">
          <span className="text-sm font-semibold text-teal-900 truncate block">{list.name}</span>
          <span className="text-[11px] text-ios-gray-500">Hours per shift block — used in sort day calculation</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 text-ios-gray-400 flex-shrink-0 transition-transform ml-2 ${expanded ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-ios-gray-200 px-4 py-3 space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <input
                value={row.name}
                onChange={e => updateRow(idx, 'name', e.target.value)}
                className="flex-1 min-h-[40px] rounded-xl border border-ios-gray-300 px-3 text-sm bg-white"
                placeholder="Shift name"
              />
              <input
                type="number"
                inputMode="decimal"
                min={0.5}
                step={0.5}
                value={row.hours}
                onChange={e => updateRow(idx, 'hours', parseFloat(e.target.value) || 0)}
                className="w-16 min-h-[40px] rounded-xl border border-ios-gray-300 px-2 text-sm text-center bg-white"
              />
              <span className="text-xs text-ios-gray-400 flex-shrink-0">hrs</span>
              <button
                onClick={() => removeRow(idx)}
                className="w-7 h-7 flex items-center justify-center text-ios-gray-400 active:text-red-500 rounded-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            className="w-full py-2 border border-dashed border-ios-gray-300 rounded-xl text-xs font-medium text-ios-gray-500 min-h-[36px]"
          >
            + Add Shift
          </button>
        </div>
      )}
    </div>
  );
}

// ─── List Category Card ───────────────────────────────────────────────────────

function ListCategoryCard({
  list,
  onChange,
}: {
  list: ListCategory;
  onChange: (updated: ListCategory) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [newItem, setNewItem] = useState('');

  // Order is meaning here — these lists populate pickers, and the first entry
  // is the default — so the entries drag into the order they should be offered.
  const reorder = useReorder(
    list.items,
    (items) => onChange({ ...list, items }),
    `list-${list.id}`
  );

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange({ ...list, items: [...list.items, trimmed] });
    setNewItem('');
  }

  function removeItem(idx: number) {
    onChange({ ...list, items: list.items.filter((_, i) => i !== idx) });
  }

  return (
    <div className="bg-ios-gray-50 rounded-xl border border-ios-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[48px]"
      >
        <div className="text-left flex-1 min-w-0">
          <span className="text-sm font-semibold text-teal-900 truncate block">{list.name}</span>
          <span className="text-[11px] text-ios-gray-500">{list.items.length} item{list.items.length !== 1 ? 's' : ''}</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-ios-gray-400 flex-shrink-0 transition-transform ml-2 ${expanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-ios-gray-200 px-4 py-3 space-y-2">
          {/* Editable name */}
          <input
            value={list.name}
            onChange={(e) => onChange({ ...list, name: e.target.value })}
            className="w-full min-h-[40px] rounded-xl border border-ios-gray-300 px-3 py-2 text-sm font-semibold text-teal-900 bg-white"
            placeholder="List name"
          />
          {/* Items */}
          <div className="space-y-1">
            {list.items.map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                {...reorder.rowProps(idx)}
                className={`flex items-center gap-1 bg-white rounded-lg pr-3 min-h-[40px] border ${
                  reorder.dragIndex === idx ? 'border-teal-400 ring-2 ring-teal-200' : 'border-ios-gray-200'
                }`}
              >
                <span
                  {...reorder.handleProps(idx)}
                  aria-label={`Reorder ${item}`}
                  className="w-8 self-stretch flex items-center justify-center text-ios-gray-300 lg:hover:text-ios-gray-500 flex-shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d={GRIP_PATH} />
                  </svg>
                </span>
                <span className="text-sm text-teal-900 flex-1 py-2 min-w-0 truncate">{item}</span>
                <button
                  onClick={() => removeItem(idx)}
                  className="w-7 h-7 flex items-center justify-center text-ios-gray-400 hover:text-red-500 rounded-lg flex-shrink-0"
                  aria-label={`Remove ${item}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {/* Add item */}
          <div className="flex gap-2">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              placeholder={`Add to ${list.name}…`}
              className="flex-1 min-h-[40px] rounded-xl border border-ios-gray-300 px-3 py-2 text-sm bg-white"
            />
            <button
              onClick={addItem}
              className="bg-teal-600 text-white px-3 rounded-xl font-semibold text-sm min-h-[40px]"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

// ─── Checklist Template Card ──────────────────────────────────────────────────

/**
 * Edits one checklist section and its items. Items carry an anchor + offset
 * rather than a date — the checklist resolves those against each project's
 * generated plan, so a template edit re-dates every project at once.
 */
function ChecklistSectionCard({
  section,
  onChange,
  onDelete,
}: {
  section: ChecklistTemplateSection;
  onChange: (updated: ChecklistTemplateSection) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function updateItem(index: number, patch: Partial<ChecklistTemplateItem>) {
    onChange({ ...section, items: section.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  }

  function addItem() {
    onChange({
      ...section,
      items: [
        ...section.items,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          text: 'New task',
          anchor: 'move-day' as ChecklistAnchor,
          offsetDays: 0,
          offsetMode: 'calendar' as const,
          owner: 'PM' as ChecklistOwner,
        },
      ],
    });
  }

  function removeItem(index: number) {
    onChange({ ...section, items: section.items.filter((_, i) => i !== index) });
  }

  return (
    <div className="border border-ios-gray-200 rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-3 min-h-[52px] text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-teal-900 truncate">{section.name}</p>
          <p className="text-xs text-ios-gray-500">
            {section.items.length} item{section.items.length === 1 ? '' : 's'}
            {section.requires && ` · needs ${section.requires}`}
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-ios-gray-100 px-3 py-3 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1">
              Section Name
            </label>
            <input
              value={section.name}
              onChange={(e) => onChange({ ...section, name: e.target.value })}
              className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>

          <div className="space-y-2">
            {section.items.map((item, i) => (
              <div key={item.id} className="bg-ios-gray-50 rounded-xl p-2.5 space-y-2">
                <div className="flex items-start gap-2">
                  <textarea
                    value={item.text}
                    onChange={(e) => updateItem(i, { text: e.target.value })}
                    rows={2}
                    className="flex-1 rounded-lg border border-ios-gray-300 px-2.5 py-1.5 text-sm bg-white resize-none"
                  />
                  <button
                    onClick={() => removeItem(i)}
                    className="w-8 h-8 flex items-center justify-center text-ios-gray-400 hover:text-red-500 rounded-lg flex-shrink-0"
                    aria-label="Remove item"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <select
                    value={item.anchor}
                    onChange={(e) => updateItem(i, { anchor: e.target.value as ChecklistAnchor })}
                    className="rounded-lg border border-ios-gray-300 px-2 py-1.5 text-xs bg-white min-h-[36px]"
                  >
                    {Object.entries(ANCHOR_LABELS).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={item.offsetDays}
                    onChange={(e) => updateItem(i, { offsetDays: parseInt(e.target.value, 10) || 0 })}
                    className="w-16 rounded-lg border border-ios-gray-300 px-2 py-1.5 text-xs bg-white min-h-[36px]"
                    aria-label="Offset in days"
                  />

                  <button
                    onClick={() => updateItem(i, { offsetMode: item.offsetMode === 'calendar' ? 'workday' : 'calendar' })}
                    className="rounded-lg border border-ios-gray-300 px-2 py-1.5 text-xs bg-white min-h-[36px] font-medium text-ios-gray-700"
                  >
                    {item.offsetMode === 'workday' ? 'workdays' : 'days'}
                  </button>

                  <select
                    value={item.owner}
                    onChange={(e) => updateItem(i, { owner: e.target.value as ChecklistOwner })}
                    className="rounded-lg border border-ios-gray-300 px-2 py-1.5 text-xs bg-white min-h-[36px]"
                  >
                    {CHECKLIST_OWNERS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={addItem}
              className="flex-1 py-2.5 border-2 border-dashed border-ios-gray-300 rounded-xl text-ios-gray-500 text-xs font-semibold min-h-[44px]"
            >
              + Add Item
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 border border-red-200 min-h-[44px]"
            >
              Delete Section
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export function SettingsPage() {
  const { state, dispatch } = useApp();

  const [members, setMembers] = useState<TeamMember[]>(
    state.teamMembers.map((m) => ({ ...m, availability: { ...m.availability } }))
  );
  const [communities, setCommunities] = useState<string[]>([...state.communities]);
  const [lists, setLists] = useState<ListCategory[]>(state.lists.map(l => ({ ...l, items: [...l.items] })));
  const [phaseTemplates, setPhaseTemplates] = useState<PhaseTemplate[]>(
    state.phaseTemplates.map((t) => ({ ...t }))
  );
  const [auctionSettings, setAuctionSettings] = useState<AuctionAppSettings>({ ...state.auctionSettings });
  const [checklistTemplate, setChecklistTemplate] = useState<ChecklistTemplateSection[]>(
    state.checklistTemplate.map((sec) => ({ ...sec, items: sec.items.map((i) => ({ ...i })) }))
  );
  const [services, setServices] = useState<ServiceCategory[]>(
    state.services.map((c) => ({ ...c, services: [...c.services] }))
  );
  const [newServiceCategory, setNewServiceCategory] = useState('');
  const [newCommunity, setNewCommunity] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Set<SettingsGroupKey>>(new Set());
  const [subOrder, setSubOrder] = useState<SettingsOrder>(() => loadSettingsOrder());
  const [rearranging, setRearranging] = useState(false);
  const [dragSub, setDragSub] = useState<string | null>(null);
  // Read by the window listeners, which close over the value at drag start.
  const orderRef = useRef<SettingsOrder | null>(null);

  /**
   * Reorder submenus by dragging.
   *
   * A drag only moves an entry within its own group — the groups are what give
   * each panel its meaning, and letting Shift Times land under Employees would
   * quietly undo that. Listeners go on the window rather than using pointer
   * capture, because reordering detaches the row being dragged and capture dies
   * with it.
   */
  function beginDrag(sub: string, e: React.PointerEvent) {
    if (!rearranging) return;
    e.preventDefault();
    setDragSub(sub);
  }

  useEffect(() => {
    if (!dragSub) return;
    const group = SETTINGS_GROUPS.find((g) => g.subs.includes(dragSub));
    if (!group) return;

    function onMove(e: PointerEvent) {
      e.preventDefault();
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const row = under?.closest<HTMLElement>('[data-sub]');
      const overKey = row?.dataset.sub;
      if (!overKey || overKey === dragSub || !group!.subs.includes(overKey)) return;

      const current = orderRef.current ?? subOrder;
      const order = resolveOrder(group!, current);
      const from = order.indexOf(dragSub!);
      const box = row!.getBoundingClientRect();
      const after = e.clientY > box.top + box.height / 2;
      let to = order.indexOf(overKey) + (after ? 1 : 0);
      if (from < to) to -= 1;
      if (from < 0 || to < 0 || from === to) return;

      const next = [...order];
      next.splice(from, 1);
      next.splice(to, 0, dragSub!);
      const merged = { ...current, [group!.key]: next };
      orderRef.current = merged;
      setSubOrder(merged);
    }

    function onEnd() {
      if (orderRef.current) saveSettingsOrder(orderRef.current);
      orderRef.current = null;
      setDragSub(null);
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [dragSub, subOrder]);

  function toggleGroup(key: SettingsGroupKey) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateMember(index: number, updated: TeamMember) {
    setMembers((prev) => prev.map((m, i) => (i === index ? updated : m)));
    setIsDirty(true);
  }

  function deleteMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  function addMember() {
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: 'New Member',
      phaseRoles: {
        'phase-1': ['Specialist'], 'phase-2': ['Specialist'], 'phase-3': ['Specialist'],
        'phase-4-1': ['Specialist'], 'phase-4-2': ['Specialist'],
        'phase-5-1': ['Specialist'], 'phase-5-2': ['Specialist'],
        'phase-6': ['Specialist'], 'phase-lot-prep': ['Specialist'], 'phase-pickup-prep': ['Specialist'], 'phase-7': ['Specialist'],
      } as MemberPhaseRoles,
      availability: {
        Mon: 'Full Day', Tue: 'Full Day', Wed: 'Full Day',
        Thu: 'Full Day', Fri: 'Full Day', Sat: 'Unavailable', Sun: 'Unavailable',
      },
      minHoursPerWeek: 0,
      maxHoursPerWeek: 0,
      isPriority: false,
    };
    setMembers((prev) => [...prev, newMember]);
    setOpenSections((prev) => new Set([...prev, 'team']));
    setIsDirty(true);
  }

  function addServiceCategory() {
    const trimmed = newServiceCategory.trim();
    if (!trimmed) return;
    setServices((prev) => [...prev, { category: trimmed, services: [] }]);
    setNewServiceCategory('');
    setIsDirty(true);
  }

  function addCommunity() {
    const trimmed = newCommunity.trim();
    if (!trimmed) return;
    // Sorted on the way in: a list this long is only usable in order, and
    // appending put every new one at the bottom where nobody looks for it.
    setCommunities((prev) =>
      [...prev, trimmed].sort((x, y) => x.localeCompare(y, undefined, { sensitivity: 'base' }))
    );
    setNewCommunity('');
    setIsDirty(true);
  }

  function removeCommunity(index: number) {
    setCommunities((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  function updateChecklistSection(index: number, updated: ChecklistTemplateSection) {
    setChecklistTemplate((prev) => prev.map((sec, i) => (i === index ? updated : sec)));
    setIsDirty(true);
  }

  function deleteChecklistSection(index: number) {
    setChecklistTemplate((prev) => prev.filter((_, i) => i !== index));
    setIsDirty(true);
  }

  function addChecklistSection() {
    setChecklistTemplate((prev) => [
      ...prev,
      { id: `sec-${Date.now()}`, name: 'New Section', order: prev.length + 1, items: [] },
    ]);
    setIsDirty(true);
  }

  function restoreDefaultChecklist() {
    if (!confirm('Replace the checklist template with the built-in default? Section and item edits will be lost. Per-project progress is kept.')) return;
    setChecklistTemplate(DEFAULT_CHECKLIST_TEMPLATE.map((sec) => ({ ...sec, items: sec.items.map((i) => ({ ...i })) })));
    setIsDirty(true);
  }

  function updateList(listIdx: number, updated: ListCategory) {
    setLists((prev) => prev.map((l, i) => (i === listIdx ? updated : l)));
    setIsDirty(true);
  }

  function updatePhaseTemplate(index: number, updated: PhaseTemplate) {
    setPhaseTemplates((prev) => prev.map((t, i) => (i === index ? updated : t)));
    setIsDirty(true);
  }

  function save() {
    dispatch({ type: 'UPDATE_TEAM_MEMBERS', members });
    dispatch({ type: 'UPDATE_COMMUNITIES', communities });
    dispatch({ type: 'UPDATE_LISTS', lists });
    dispatch({ type: 'UPDATE_PHASE_TEMPLATES', phaseTemplates });
    dispatch({ type: 'UPDATE_AUCTION_SETTINGS', settings: auctionSettings });
    dispatch({ type: 'UPDATE_CHECKLIST_TEMPLATE', checklistTemplate });
    dispatch({ type: 'UPDATE_SERVICES', services });
    setIsDirty(false);
  }

  /*
   * Every panel on the page, keyed so a group can name the ones it holds.
   * The parameter lists each get their own entry: they used to share a single
   * "Variables" panel, which meant knowing that Flexibility lived inside it.
   */
  const SUBS: Record<string, { title: string; subtitle?: React.ReactNode; body: React.ReactNode }> = {
    team: {
      title: 'Team Members',
      subtitle: `${members.length} members`,
      body: (
        <>
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-ios-gray-500">
              Tap a member to expand. Tap availability cells to cycle: Full Day → AM → PM → Off.
            </p>
            <DraggableMemberList
              members={members}
              onUpdate={updateMember}
              onDelete={deleteMember}
              onReorder={(reordered) => { setMembers(reordered); setIsDirty(true); }}
            />
            <button
              onClick={addMember}
              className="w-full py-3.5 border-2 border-dashed border-ios-gray-300 rounded-2xl text-ios-gray-500 text-sm font-semibold min-h-[52px] flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Team Member
            </button>
          </div>
        </>
      ),
    },
    phaseRoles: {
      title: 'Phase Roles',
      subtitle: `${members.length} members`,
      body: (
        <>
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-ios-gray-500">
              Tap a member to expand. Tap a phase cell to pick which roles that person can fill in that phase.
            </p>
            <div className="space-y-2">
              {members.map((member, i) => (
                <MemberPhaseRolesCard
                  key={member.id}
                  member={member}
                  onChange={(updated) => updateMember(i, updated)}
                />
              ))}
            </div>
          </div>
        </>
      ),
    },
    teamExperience: {
      title: 'Team Experience',
      subtitle: "Pack & Sort and Cleanout competency per member",
      body: (
        <>
          <div className="px-4 py-4 space-y-3">
            <p className="text-xs text-ios-gray-500">
              Annotation only — shown as a multiplier on Schedule and Calendar. Does not affect scheduling or hours.
            </p>
            <div className="space-y-1">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_120px_120px] gap-2 px-1 pb-1">
                <span className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wide">Member</span>
                <span className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wide text-center">Pack & Sort</span>
                <span className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wide text-center">Cleanout</span>
              </div>
              {members.map((member, i) => {
                const exp = member.experience ?? { packAndSort: 'Average', cleanout: 'Average' };
                return (
                  <div key={member.id} className="grid grid-cols-[1fr_120px_120px] gap-2 items-center bg-ios-gray-50 rounded-xl px-3 py-2 border border-ios-gray-200">
                    <span className="text-sm font-medium text-teal-900 truncate">{member.name}</span>
                    {(['packAndSort', 'cleanout'] as const).map((cat) => (
                      <select
                        key={cat}
                        value={exp[cat]}
                        onChange={(e) => {
                          const updated: TeamMember = {
                            ...member,
                            experience: { ...exp, [cat]: e.target.value as ExperienceLevel },
                          };
                          updateMember(i, updated);
                        }}
                        className={`min-h-[36px] rounded-lg border px-2 py-1 text-sm font-semibold text-center appearance-none cursor-pointer transition-colors ${
                          exp[cat] === 'High'
                            ? 'bg-green-100 border-green-300 text-green-800'
                            : exp[cat] === 'Low'
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-ios-gray-100 border-ios-gray-300 text-ios-gray-700'
                        }`}
                      >
                        <option value="High">High</option>
                        <option value="Average">Average</option>
                        <option value="Low">Low</option>
                      </select>
                    ))}
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="text-sm text-ios-gray-400 text-center py-4">Add team members in the Team section first.</p>
              )}
            </div>
            <div className="flex gap-4 pt-1">
              {[
                { level: 'High', color: 'bg-green-100 text-green-800', mult: '0.85×' },
                { level: 'Average', color: 'bg-ios-gray-100 text-ios-gray-700', mult: '1.00×' },
                { level: 'Low', color: 'bg-amber-100 text-amber-800', mult: '1.15×' },
              ].map(({ level, color, mult }) => (
                <span key={level} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
                  {level} · {mult}
                </span>
              ))}
            </div>
          </div>
        </>
      ),
    },
    templates: {
      title: 'Task Template',
      subtitle: "Phase hours and base team sizes",
      body: (
        <>
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-ios-gray-500">
              Edit hours per person and base team size for each phase. Changes affect schedule generation.
              Crew size for an individual shift can be adjusted on the Schedule tab.
            </p>
            {phaseTemplates
              .slice()
              .sort((a, b) => Number(a.order) - Number(b.order))
              .map((template) => {
                const idx = phaseTemplates.findIndex((t) => t.id === template.id);
                return (
                  <PhaseTemplateCard
                    key={template.id}
                    template={template}
                    onChange={(updated) => updatePhaseTemplate(idx, updated)}
                  />
                );
              })}
          </div>
        </>
      ),
    },
    checklist: {
      title: 'Checklist Template',
      subtitle: `${checklistTemplate.length} sections · ${checklistTemplate.reduce((n, s) => n + s.items.length, 0)} items`,
      body: (
        <>
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-ios-gray-500">
              Items are dated relative to a milestone from the move plan, not by fixed date — so
              every project's checklist re-dates itself when its plan changes.
            </p>
            <div className="space-y-2">
              {checklistTemplate.map((section, i) => (
                <ChecklistSectionCard
                  key={section.id}
                  section={section}
                  onChange={(updated) => updateChecklistSection(i, updated)}
                  onDelete={() => deleteChecklistSection(i)}
                />
              ))}
            </div>
            <button
              onClick={addChecklistSection}
              className="w-full py-3.5 border-2 border-dashed border-ios-gray-300 rounded-2xl text-ios-gray-500 text-sm font-semibold min-h-[52px] flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add Section
            </button>
            <button
              onClick={restoreDefaultChecklist}
              className="w-full py-2.5 text-xs font-semibold text-ios-gray-500"
            >
              Restore Default Template
            </button>
          </div>
        </>
      ),
    },
    communities: {
      title: 'Communities',
      subtitle: "Senior communities in the project dropdown",
      body: (
        <>
          <div className="px-4 py-3 space-y-2">
            {communities.map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center justify-between bg-ios-gray-50 rounded-xl px-4 min-h-[48px] border border-ios-gray-200"
              >
                <span className="text-sm text-teal-900 flex-1 py-3">{name}</span>
                <button
                  onClick={() => removeCommunity(i)}
                  className="ml-2 w-8 h-8 flex items-center justify-center text-ios-gray-400 hover:text-red-500 transition-colors rounded-lg"
                  aria-label={`Remove ${name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <input
                value={newCommunity}
                onChange={(e) => setNewCommunity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCommunity()}
                placeholder="Add a community…"
                className="flex-1 min-h-[48px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base bg-white"
              />
              <button
                onClick={addCommunity}
                className="bg-teal-600 text-white px-4 rounded-xl font-semibold text-sm min-h-[48px]"
              >
                Add
              </button>
            </div>
          </div>
        </>
      ),
    },
    shiftTimes: {
      title: 'Shift Times',
      subtitle: "When AM and PM shifts start",
      body: (
        <>
          <div className="px-4 py-4 space-y-4">
            <p className="text-xs text-ios-gray-500">
              Used to show shift times on the calendar. A Full Day starts at the AM time.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="am-start" className="text-xs font-semibold text-ios-gray-600 uppercase tracking-wide mb-2 block">
                  AM starts
                </label>
                <input
                  id="am-start"
                  type="time"
                  value={state.shiftTimes.am}
                  onChange={(e) =>
                    e.target.value && dispatch({ type: 'UPDATE_SHIFT_TIMES', times: { ...state.shiftTimes, am: e.target.value } })
                  }
                  className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900"
                />
              </div>
              <div>
                <label htmlFor="pm-start" className="text-xs font-semibold text-ios-gray-600 uppercase tracking-wide mb-2 block">
                  PM starts
                </label>
                <input
                  id="pm-start"
                  type="time"
                  value={state.shiftTimes.pm}
                  onChange={(e) =>
                    e.target.value && dispatch({ type: 'UPDATE_SHIFT_TIMES', times: { ...state.shiftTimes, pm: e.target.value } })
                  }
                  className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900"
                />
              </div>
            </div>
          </div>
        </>
      ),
    },
    auctionDefaults: {
      title: 'Auction Defaults',
      subtitle: "Hourly rate and performance level for estimates",
      body: (
        <>
          <div className="px-4 py-4 space-y-4">
            <p className="text-xs text-ios-gray-500">
              These defaults drive the labor estimate on the Inputs tab when a Full – Auction cleanout is selected.
            </p>
            {/* Hourly Rate */}
            <div>
              <label className="text-xs font-semibold text-ios-gray-600 uppercase tracking-wide mb-2 block">Hourly Rate ($)</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={auctionSettings.hourlyRate || ''}
                onChange={(e) => {
                  setAuctionSettings((prev) => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }));
                  setIsDirty(true);
                }}
                placeholder="e.g. 95"
                className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-base text-teal-900"
              />
            </div>
            {/* Performance Level */}
            <div>
              <label className="text-xs font-semibold text-ios-gray-600 uppercase tracking-wide mb-2 block">Performance Level</label>
              <div className="space-y-2">
                {([
                  { level: 'High' as ExperienceLevel, minPerLot: 13, desc: 'Experienced team, organized home, easy access' },
                  { level: 'Average' as ExperienceLevel, minPerLot: 18, desc: 'Typical auction, mixed items, normal sorting' },
                  { level: 'Low' as ExperienceLevel, minPerLot: 25, desc: 'Dense home, heavy sorting, stairs or complex pickup' },
                ]).map(({ level, minPerLot, desc }) => (
                  <button
                    key={level}
                    onClick={() => {
                      setAuctionSettings((prev) => ({ ...prev, performanceLevel: level }));
                      setIsDirty(true);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors border ${
                      auctionSettings.performanceLevel === level
                        ? 'bg-teal-50 border-teal-300'
                        : 'bg-ios-gray-50 border-ios-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center ${
                      auctionSettings.performanceLevel === level ? 'border-teal-600' : 'border-ios-gray-300'
                    }`}>
                      {auctionSettings.performanceLevel === level && (
                        <div className="w-2 h-2 rounded-full bg-teal-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${auctionSettings.performanceLevel === level ? 'text-teal-900' : 'text-teal-800'}`}>{level}</span>
                        <span className="text-xs text-ios-gray-500">{minPerLot} min/lot</span>
                      </div>
                      <p className="text-xs text-ios-gray-500 truncate">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      ),
    },
  };

  const serviceOrder = useReorder(
    services,
    (next) => { setServices(next); setIsDirty(true); },
    'service-categories'
  );

  /*
   * The service catalogue, edited as one list per category. Each category
   * reuses the parameter-list editor rather than growing a second one — the
   * shape is the same, a name and the entries under it.
   *
   * Categories drag into order as well as the services inside them, because
   * this order is the order the Input tab offers them in.
   */
  SUBS.services = {
    title: 'Services Contracted',
    subtitle: `${services.reduce((n, c) => n + c.services.length, 0)} services in ${services.length} categories`,
    body: (
      <div className="px-4 py-3 space-y-2">
        <p className="text-xs text-ios-gray-500">
          What a client can contract. These populate the Services Contracted picker on a project's Input tab.
        </p>
        {services.map((cat, catIdx) => (
          <div
            key={`${cat.category}-${catIdx}`}
            {...serviceOrder.rowProps(catIdx)}
            className={`flex items-start gap-1 rounded-xl ${
              serviceOrder.dragIndex === catIdx ? 'ring-2 ring-teal-300' : ''
            }`}
          >
            <span
              {...serviceOrder.handleProps(catIdx)}
              aria-label={`Reorder ${cat.category}`}
              className="w-7 h-11 flex items-center justify-center text-ios-gray-300 lg:hover:text-ios-gray-500 flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d={GRIP_PATH} />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <ListCategoryCard
                list={{ id: cat.category, name: cat.category, items: cat.services }}
                onChange={(updated) => {
                  setServices((prev) =>
                    prev.map((c, i) => (i === catIdx ? { category: updated.name, services: updated.items } : c))
                  );
                  setIsDirty(true);
                }}
              />
            </div>
            <button
              onClick={() => {
                setServices((prev) => prev.filter((_, i) => i !== catIdx));
                setIsDirty(true);
              }}
              className="w-9 h-9 mt-1 flex items-center justify-center rounded-lg text-ios-gray-400 active:text-red-600 lg:hover:text-red-600 flex-shrink-0"
              aria-label={`Remove the ${cat.category} category`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <input
            value={newServiceCategory}
            onChange={(e) => setNewServiceCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addServiceCategory()}
            placeholder="Add a category…"
            className="flex-1 min-h-[48px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base bg-white"
          />
          <button
            onClick={addServiceCategory}
            className="bg-teal-600 text-white px-4 rounded-xl font-semibold text-sm min-h-[48px]"
          >
            Add
          </button>
        </div>
      </div>
    ),
  };

  lists.forEach((list, listIdx) => {
    const onChange = (updated: ListCategory) => updateList(listIdx, updated);
    SUBS[`list:${list.id}`] = {
      title: SUB_LABELS[`list:${list.id}`] ?? list.name,
      subtitle: `${list.items.length} ${list.items.length === 1 ? 'entry' : 'entries'}`,
      body: (
        <div className="px-4 py-3">
          {list.id === 'shift-type-hours'
            ? <ShiftHoursCard list={list} onChange={onChange} />
            : <ListCategoryCard list={list} onChange={onChange} />}
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-teal-900 flex-1">Settings</h1>
          <button
            onClick={() => { setRearranging((v) => !v); setOpenSections(new Set()); }}
            aria-pressed={rearranging}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold min-h-[36px] mr-2 transition-colors ${
              rearranging ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
            }`}
          >
            {rearranging ? 'Done' : 'Rearrange'}
          </button>
          {isDirty ? (
            <button
              onClick={save}
              className="bg-teal-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold min-h-[36px]"
            >
              Save
            </button>
          ) : (
            <span className="text-xs text-ios-gray-400">All changes saved</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {SETTINGS_GROUPS.map((group) => {
          const order = resolveOrder(group, subOrder);
          return (
            <SettingsGroupCard
              key={group.key}
              group={group}
              open={openGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
            >
              {order.map((subKey) => {
                const sub = SUBS[subKey];
                if (!sub) return null;
                return (
                  <AccordionSection
                    key={subKey}
                    title={sub.title}
                    subtitle={sub.subtitle}
                    open={!rearranging && openSections.has(subKey)}
                    onToggle={() => toggleSection(subKey)}
                    dragKey={subKey}
                    rearranging={rearranging}
                    dragging={dragSub === subKey}
                    onDragStart={(e) => beginDrag(subKey, e)}
                  >
                    {sub.body}
                  </AccordionSection>
                );
              })}
            </SettingsGroupCard>
          );
        })}

        {/* Bottom save bar */}
        {isDirty && (
          <button
            onClick={save}
            className="w-full bg-teal-600 text-white py-4 rounded-2xl font-bold text-base min-h-[56px]"
          >
            Save All Changes
          </button>
        )}

        <div className="h-4" />
        {isDirty && <FloatingSaveSpacer />}
      </div>

      {isDirty && <FloatingSaveButton onSave={save} />}
    </div>
  );
}
