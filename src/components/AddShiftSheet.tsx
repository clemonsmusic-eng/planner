import { useState } from 'react';
import type { PhaseTemplate, RoleType } from '../types';
import type { NewShift } from '../store/AppContext';
import { toISODate } from '../lib/dateUtils';

const ROLE_OPTIONS: RoleType[] = ['PM', 'Assist PM', 'Lead', 'PM/Lead', 'Specialist', 'Mover'];
const SHIFT_OPTIONS: NewShift['shift'][] = ['AM', 'PM', 'Full Day'];

const CUSTOM_PHASE = '__custom__';

/** A template's own shift block, defaulting client-preference phases to AM. */
function shiftForTemplate(tpl: PhaseTemplate): NewShift['shift'] {
  if (tpl.isAM || tpl.shift === 'AM' || tpl.shift === '8am-move-day') return 'AM';
  if (tpl.isPM || tpl.shift === 'PM') return 'PM';
  if (tpl.shift === 'Full Day') return 'Full Day';
  return 'AM';
}

/** A template's roles, padded out to its default crew size. */
function rolesForTemplate(tpl: PhaseTemplate): RoleType[] {
  const seeded = tpl.roles.map((r) => r.role);
  while (seeded.length < tpl.minTeamSize) seeded.push('Specialist');
  return seeded.slice(0, Math.max(1, tpl.minTeamSize));
}

/**
 * Builds a shift by hand rather than letting the generator place it. Everything
 * the scheduler would have decided — date, phase, shift block, hours, and the
 * roles on the crew — is a field here.
 */
export function AddShiftSheet({
  phaseTemplates,
  defaultDate,
  onAdd,
  onClose,
}: {
  phaseTemplates: PhaseTemplate[];
  defaultDate: string;
  onAdd: (shift: NewShift) => void;
  onClose: () => void;
}) {
  const initial = phaseTemplates[0];
  const [date, setDate] = useState(defaultDate || toISODate(new Date()));
  const [phaseKey, setPhaseKey] = useState<string>(initial?.id ?? CUSTOM_PHASE);
  const [customName, setCustomName] = useState('');
  const [shift, setShift] = useState<NewShift['shift']>(initial ? shiftForTemplate(initial) : 'AM');
  const [hours, setHours] = useState(initial?.minHours ?? 4);
  const [roles, setRoles] = useState<RoleType[]>(initial ? rolesForTemplate(initial) : ['PM', 'Specialist']);

  const isCustom = phaseKey === CUSTOM_PHASE;
  const template = phaseTemplates.find((t) => t.id === phaseKey);
  const phaseName = isCustom ? customName.trim() : template?.name ?? '';
  const canSave = !!date && !!phaseName && roles.length > 0 && hours > 0;

  /** Picking a phase seeds the fields from its template, which stay editable. */
  function selectPhase(key: string) {
    setPhaseKey(key);
    if (key === CUSTOM_PHASE) return;
    const tpl = phaseTemplates.find((t) => t.id === key);
    if (!tpl) return;
    setHours(tpl.minHours);
    setShift(shiftForTemplate(tpl));
    setRoles(rolesForTemplate(tpl));
  }

  function setRoleAt(index: number, role: RoleType) {
    setRoles((rs) => rs.map((r, i) => (i === index ? role : r)));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="px-4 py-4 border-b border-ios-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-teal-900">Add Shift</h2>
          <button onClick={onClose} className="text-ios-gray-500 font-semibold flex-shrink-0">
            Cancel
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4">
          {/* Date */}
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 text-base bg-white"
            />
          </Field>

          {/* Phase */}
          <Field label="Phase">
            <select
              value={phaseKey}
              onChange={(e) => selectPhase(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 text-base bg-white appearance-none"
            >
              {phaseTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              <option value={CUSTOM_PHASE}>Custom…</option>
            </select>
            {isCustom && (
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Shift name"
                className="w-full min-h-[44px] mt-2 rounded-xl border border-ios-gray-300 px-3 text-base bg-white"
              />
            )}
          </Field>

          {/* Shift block */}
          <Field label="Shift">
            <div className="flex gap-2">
              {SHIFT_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setShift(s)}
                  className={`flex-1 min-h-[44px] rounded-xl text-sm font-semibold transition-colors ${
                    shift === s ? 'bg-teal-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          {/* Hours */}
          <Field label="Hours per person">
            <input
              type="number"
              inputMode="decimal"
              min={0.5}
              step={0.5}
              value={hours}
              onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
              className="w-full min-h-[44px] rounded-xl border border-ios-gray-300 px-3 text-base bg-white"
            />
          </Field>

          {/* Crew */}
          <Field label={`Crew — ${roles.length} ${roles.length === 1 ? 'role' : 'roles'}`}>
            <div className="space-y-2">
              {roles.map((role, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={role}
                    onChange={(e) => setRoleAt(i, e.target.value as RoleType)}
                    className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 px-3 text-base bg-white appearance-none"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setRoles((rs) => rs.filter((_, idx) => idx !== i))}
                    disabled={roles.length <= 1}
                    className="w-11 h-11 flex items-center justify-center rounded-xl text-ios-gray-500 active:bg-ios-gray-100 disabled:opacity-30 flex-shrink-0"
                    aria-label={`Remove role ${i + 1}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                onClick={() => setRoles((rs) => [...rs, 'Specialist'])}
                className="w-full min-h-[44px] rounded-xl border border-dashed border-teal-300 text-teal-600 text-sm font-semibold active:bg-teal-50"
              >
                + Add Role
              </button>
            </div>
          </Field>

          <p className="text-xs text-ios-gray-500">
            Roles are added unassigned — pick who works them on the schedule.
          </p>
        </div>

        {/* Actions clear the bottom bar rather than sitting behind it. */}
        <div className="flex-shrink-0 border-t border-ios-gray-200 px-4 py-3">
          <button
            onClick={() => {
              onAdd({
                date,
                phaseId: isCustom ? `custom-${crypto.randomUUID()}` : phaseKey,
                phaseName,
                shift,
                hours,
                roles,
              });
              onClose();
            }}
            disabled={!canSave}
            className="w-full min-h-[48px] rounded-xl bg-teal-600 text-white font-semibold disabled:opacity-40"
          >
            Add Shift
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wide block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
