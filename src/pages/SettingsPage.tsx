import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { HamburgerButton } from '../components/HamburgerMenu';
import type { AvailabilitySlot, PhaseId, MemberPhaseRole, MemberPhaseRoles, RoleType, TeamMember, TeamMemberAvailability, PhaseTemplate, ListCategory } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: (keyof TeamMemberAvailability)[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DAY_SHORT: Record<keyof TeamMemberAvailability, string> = {
  Mon: 'Mo', Tue: 'Tu', Wed: 'We', Thu: 'Th', Fri: 'Fr', Sat: 'Sa', Sun: 'Su',
};

const SLOT_CYCLE: AvailabilitySlot[] = ['Full Day', 'AM', 'PM', 'Unavailable'];

// Phase role grid
const ALL_SELECTABLE_ROLES: RoleType[] = ['PM', 'Assist PM', 'Lead', 'PM/Lead', 'Specialist', 'Mover'];

const PHASE_CONFIG: { id: PhaseId; label: string }[] = [
  { id: 'phase-1',   label: 'Vis 1' },
  { id: 'phase-2',   label: 'Vis 2' },
  { id: 'phase-3',   label: 'Sort' },
  { id: 'phase-4-1', label: 'Pk AM' },
  { id: 'phase-4-2', label: 'Pk PM' },
  { id: 'phase-5-1', label: 'Mv AM' },
  { id: 'phase-5-2', label: 'Mv PM' },
  { id: 'phase-6',   label: 'Clnout' },
  { id: 'phase-7',   label: 'Pickup' },
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
  if (r.length > 1) return 'bg-indigo-100 text-indigo-800 border border-indigo-300';
  const single = r[0];
  if (single === 'PM') return 'bg-indigo-600 text-white';
  if (single === 'Assist PM') return 'bg-purple-500 text-white';
  if (single === 'Lead') return 'bg-sky-500 text-white';
  if (single === 'PM/Lead') return 'bg-indigo-400 text-white';
  if (single === 'Specialist') return 'bg-green-500 text-white';
  if (single === 'Mover') return 'bg-amber-500 text-white';
  return 'bg-ios-gray-200 text-ios-gray-400';
}

function roleButtonColors(role: RoleType, selected: boolean): string {
  if (!selected) return 'bg-white text-gray-700 border border-ios-gray-300';
  if (role === 'PM') return 'bg-indigo-600 text-white border-indigo-600';
  if (role === 'Assist PM') return 'bg-purple-500 text-white border-purple-500';
  if (role === 'Lead') return 'bg-sky-500 text-white border-sky-500';
  if (role === 'PM/Lead') return 'bg-indigo-400 text-white border-indigo-400';
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
  if (s === 'Full Day') return 'bg-indigo-500 text-white';
  if (s === 'AM') return 'bg-sky-400 text-white';
  if (s === 'PM') return 'bg-amber-400 text-white';
  return 'bg-ios-gray-200 text-ios-gray-400';
}

function nextSlot(current: AvailabilitySlot): AvailabilitySlot {
  return SLOT_CYCLE[(SLOT_CYCLE.indexOf(current) + 1) % SLOT_CYCLE.length];
}

// ─── Accordion Section ────────────────────────────────────────────────────────

function AccordionSection({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-ios-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 min-h-[56px]"
      >
        <div className="text-left">
          <p className="font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-ios-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ml-3 ${open ? 'rotate-180' : ''}`}
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
}

function MemberCard({ member, onChange, onDelete }: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);

  function cycleDay(day: keyof TeamMemberAvailability) {
    onChange({
      ...member,
      availability: { ...member.availability, [day]: nextSlot(member.availability[day]) },
    });
  }

  return (
    <div className="bg-ios-gray-50 rounded-xl border border-ios-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[52px]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              member.isPriority ? 'bg-indigo-500' : 'bg-ios-gray-300'
            }`}
          />
          <span className="font-semibold text-gray-900 truncate">{member.name}</span>
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
        <div className="px-4 pb-4 space-y-4 border-t border-ios-gray-100">
          {/* Name + Priority */}
          <div className="flex items-center gap-3 pt-3">
            <input
              value={member.name}
              onChange={(e) => onChange({ ...member, name: e.target.value })}
              className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 px-3 py-2 text-base font-semibold text-gray-900 bg-white"
              placeholder="Name"
            />
            <button
              onClick={() => onChange({ ...member, isPriority: !member.isPriority })}
              className={`px-3 py-2 rounded-xl text-sm font-semibold min-h-[44px] whitespace-nowrap transition-colors ${
                member.isPriority
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
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
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${member.isPriority ? 'bg-indigo-500' : 'bg-ios-gray-300'}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{member.name}</p>
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
                      ${isActive ? 'ring-2 ring-offset-1 ring-indigo-500 scale-95' : ''}`}
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
              <div className="mt-2 p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
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

// ─── Phase Template Card ──────────────────────────────────────────────────────

function PhaseTemplateCard({
  template,
  onChange,
}: {
  template: PhaseTemplate;
  onChange: (updated: PhaseTemplate) => void;
}) {
  const shiftLabel = template.isAM ? 'AM' : template.isPM ? 'PM' : template.shift === 'client-pref' ? 'Client Pref' : template.shift;

  return (
    <div className="bg-ios-gray-50 rounded-xl border border-ios-gray-200 px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-900 flex-1">{template.name}</p>
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
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={template.minTeamSize}
            onChange={(e) => onChange({ ...template, minTeamSize: parseInt(e.target.value) || template.minTeamSize })}
            className="flex-1 min-h-[40px] rounded-xl border border-ios-gray-300 px-2 py-1 text-sm text-center bg-white"
          />
          <span className="text-xs text-ios-gray-400 flex-shrink-0">to</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={template.maxTeamSize}
            onChange={(e) => onChange({ ...template, maxTeamSize: parseInt(e.target.value) || template.maxTeamSize })}
            className="flex-1 min-h-[40px] rounded-xl border border-ios-gray-300 px-2 py-1 text-sm text-center bg-white"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {template.roles.map((r, i) => (
          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
            {r.role}{r.isLocked ? ' 🔒' : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Table List Card (for sqft-ranges, pre-move-team-sizes, move-day-team-sizes) ─

function TableListCard({
  list,
  hint,
  onChange,
}: {
  list: ListCategory;
  hint: string;
  onChange: (updated: ListCategory) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  type Row = { maxSqft: number; teamSize: number };

  function parseRows(): Row[] {
    return list.items
      .map(item => {
        const [a, b] = item.split(':');
        const maxSqft = parseInt(a ?? '', 10);
        const teamSize = parseInt(b ?? '', 10);
        if (isNaN(maxSqft) || isNaN(teamSize)) return null;
        return { maxSqft, teamSize };
      })
      .filter((r): r is Row => r !== null)
      .sort((a, b) => a.maxSqft - b.maxSqft);
  }

  function serialize(rows: Row[]): string[] {
    return rows.sort((a, b) => a.maxSqft - b.maxSqft).map(r => `${r.maxSqft}:${r.teamSize}`);
  }

  function updateRow(idx: number, field: 'maxSqft' | 'teamSize', val: number) {
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
    const finiteRows = rows.filter(r => r.maxSqft < 9999);
    const last = finiteRows[finiteRows.length - 1]?.maxSqft ?? 0;
    const newRows = [
      ...finiteRows,
      { maxSqft: last + 200, teamSize: 2 },
      ...rows.filter(r => r.maxSqft >= 9999),
    ];
    onChange({ ...list, items: serialize(newRows) });
  }

  const rows = parseRows();

  return (
    <div className="bg-ios-gray-50 rounded-xl border border-ios-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[48px]"
      >
        <div className="text-left flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-900 truncate block">{list.name}</span>
          <span className="text-[11px] text-ios-gray-500">{hint}</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 text-ios-gray-400 flex-shrink-0 transition-transform ml-2 ${expanded ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-ios-gray-200 px-4 py-3 space-y-2">
          <p className="text-[11px] text-ios-gray-500">Max sq ft → team size. Use 9999 as the final "any above" row.</p>
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-ios-gray-400 w-4 text-right flex-shrink-0">
                {row.maxSqft >= 9999 ? '>' : '≤'}
              </span>
              {row.maxSqft < 9999 ? (
                <input
                  type="number"
                  inputMode="numeric"
                  value={row.maxSqft}
                  onChange={e => updateRow(idx, 'maxSqft', parseInt(e.target.value) || 0)}
                  className="w-[72px] min-h-[40px] rounded-xl border border-ios-gray-300 px-2 text-sm text-center bg-white"
                />
              ) : (
                <div className="w-[72px] flex items-center justify-center text-sm text-ios-gray-500 min-h-[40px]">above</div>
              )}
              <span className="text-xs text-ios-gray-400 flex-shrink-0">sq ft →</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={row.teamSize}
                onChange={e => updateRow(idx, 'teamSize', parseInt(e.target.value) || 1)}
                className="w-14 min-h-[40px] rounded-xl border border-ios-gray-300 px-2 text-sm text-center bg-white"
              />
              <span className="text-xs text-ios-gray-400 flex-shrink-0">ppl</span>
              <button
                onClick={() => removeRow(idx)}
                className="ml-auto w-7 h-7 flex items-center justify-center text-ios-gray-400 active:text-red-500 rounded-lg"
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
            + Add Range
          </button>
        </div>
      )}
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
          <span className="text-sm font-semibold text-gray-900 truncate block">{list.name}</span>
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
          <span className="text-sm font-semibold text-gray-900 truncate block">{list.name}</span>
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
            className="w-full min-h-[40px] rounded-xl border border-ios-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 bg-white"
            placeholder="List name"
          />
          {/* Items */}
          <div className="space-y-1">
            {list.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 min-h-[40px] border border-ios-gray-200">
                <span className="text-sm text-gray-900 flex-1 py-2">{item}</span>
                <button
                  onClick={() => removeItem(idx)}
                  className="w-7 h-7 flex items-center justify-center text-ios-gray-400 hover:text-red-500 rounded-lg"
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
              className="bg-indigo-600 text-white px-3 rounded-xl font-semibold text-sm min-h-[40px]"
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

type SectionKey = 'team' | 'phaseRoles' | 'lists' | 'templates' | 'communities';

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
  const [newCommunity, setNewCommunity] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set());

  function toggleSection(key: SectionKey) {
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
        'phase-6': ['Specialist'], 'phase-7': ['Specialist'],
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

  function addCommunity() {
    const trimmed = newCommunity.trim();
    if (!trimmed) return;
    setCommunities((prev) => [...prev, trimmed]);
    setNewCommunity('');
    setIsDirty(true);
  }

  function removeCommunity(index: number) {
    setCommunities((prev) => prev.filter((_, i) => i !== index));
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
    setIsDirty(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center gap-2">
          <HamburgerButton />
          <h1 className="text-xl font-bold text-gray-900 flex-1">Settings</h1>
          {isDirty ? (
            <button
              onClick={save}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-sm font-semibold min-h-[36px]"
            >
              Save
            </button>
          ) : (
            <span className="text-xs text-ios-gray-400">All changes saved</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* ── Team ─────────────────────────────────────────────────────── */}
        <AccordionSection
          title="Team"
          subtitle={`${members.length} members`}
          open={openSections.has('team')}
          onToggle={() => toggleSection('team')}
        >
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-ios-gray-500">
              Tap a member to expand. Tap availability cells to cycle: Full Day → AM → PM → Off.
            </p>
            <div className="space-y-2">
              {members.map((member, i) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  onChange={(updated) => updateMember(i, updated)}
                  onDelete={() => deleteMember(i)}
                />
              ))}
            </div>
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
        </AccordionSection>

        {/* ── Phase Roles ──────────────────────────────────────────────── */}
        <AccordionSection
          title="Phase Roles"
          subtitle={`${members.length} members`}
          open={openSections.has('phaseRoles')}
          onToggle={() => toggleSection('phaseRoles')}
        >
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
        </AccordionSection>

        {/* ── Variables ────────────────────────────────────────────────── */}
        <AccordionSection
          title="Variables"
          subtitle="Scheduling parameter lists"
          open={openSections.has('lists')}
          onToggle={() => toggleSection('lists')}
        >
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-ios-gray-500">
              Simple lists populate dropdowns. The three team-size tables (sq ft → people) and shift hours directly drive schedule generation.
            </p>
            {lists.map((list, listIdx) => {
              const onChange = (updated: ListCategory) => updateList(listIdx, updated);
              if (list.id === 'sqft-ranges') {
                return <TableListCard key={list.id} list={list} hint="Origin sq ft → pack/sort team size" onChange={onChange} />;
              }
              if (list.id === 'pre-move-team-sizes') {
                return <TableListCard key={list.id} list={list} hint="Dest sq ft → pre-move team size" onChange={onChange} />;
              }
              if (list.id === 'move-day-team-sizes') {
                return <TableListCard key={list.id} list={list} hint="Dest sq ft → move day team size" onChange={onChange} />;
              }
              if (list.id === 'shift-type-hours') {
                return <ShiftHoursCard key={list.id} list={list} onChange={onChange} />;
              }
              return <ListCategoryCard key={list.id} list={list} onChange={onChange} />;
            })}
          </div>
        </AccordionSection>

        {/* ── Task Template ─────────────────────────────────────────────── */}
        <AccordionSection
          title="Task Template"
          subtitle="Phase hours and base team sizes"
          open={openSections.has('templates')}
          onToggle={() => toggleSection('templates')}
        >
          <div className="px-4 py-3 space-y-2">
            <p className="text-xs text-ios-gray-500">
              Edit hours per person and base team size for each phase. Changes affect schedule generation.
              Some phases auto-scale based on square footage.
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
        </AccordionSection>

        {/* ── Communities ───────────────────────────────────────────────── */}
        <AccordionSection
          title="Communities"
          subtitle="Senior communities in the project dropdown"
          open={openSections.has('communities')}
          onToggle={() => toggleSection('communities')}
        >
          <div className="px-4 py-3 space-y-2">
            {communities.map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center justify-between bg-ios-gray-50 rounded-xl px-4 min-h-[48px] border border-ios-gray-200"
              >
                <span className="text-sm text-gray-900 flex-1 py-3">{name}</span>
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
                className="bg-indigo-600 text-white px-4 rounded-xl font-semibold text-sm min-h-[48px]"
              >
                Add
              </button>
            </div>
          </div>
        </AccordionSection>

        {/* Bottom save bar */}
        {isDirty && (
          <button
            onClick={save}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-base min-h-[56px]"
          >
            Save All Changes
          </button>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
