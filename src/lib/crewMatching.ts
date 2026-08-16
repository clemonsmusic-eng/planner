import { getRoleQualifiers } from './data';
import type { PhaseId, Project, RoleType, TeamMember, TeamMemberAvailability } from '../types';

/**
 * Who can work a given role on a given day.
 *
 * The generator has always known this — it is how a plan gets crewed — but the
 * knowledge lived inside the scheduling run, so a shift added by hand came out
 * unassigned and had to be filled in one picker at a time. These are the same
 * rules, pulled out so anything that needs to pick people can ask.
 */

const DAY_NAMES: (keyof TeamMemberAvailability)[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type ShiftSlot = 'AM' | 'PM' | 'Full Day';

/** Whether the member's availability and time off leave this shift open. */
export function isMemberAvailableForShift(member: TeamMember, date: string, shift: ShiftSlot): boolean {
  if ((member.timeOff ?? []).some((t) => date >= t.startDate && date <= t.endDate)) return false;
  const slot = member.availability[DAY_NAMES[new Date(`${date}T12:00:00`).getDay()]];
  if (slot === 'Unavailable') return false;
  if (slot === 'Full Day') return true;
  return slot === shift;
}

/**
 * Whether the member is signed off for this role on this phase.
 *
 * A role qualifies through `getRoleQualifiers`, so someone approved as PM/Lead
 * covers a Lead slot without being listed twice.
 */
export function isMemberApprovedForRole(member: TeamMember, phaseId: string, role: RoleType): boolean {
  const approved = member.phaseRoles[phaseId as PhaseId];
  if (!approved || approved === 'N/A') return false;
  const qualifying = getRoleQualifiers(role);
  return approved.some((r) => qualifying.includes(r));
}

/** Shifts that overlap: a full day collides with both halves of the day. */
const overlaps = (a: ShiftSlot, b: ShiftSlot) => a === b || a === 'Full Day' || b === 'Full Day';

/**
 * Everyone already working that date and shift, on any project.
 *
 * Double-booking is the failure mode that matters most here — a person can
 * only be in one place — and it does not respect project boundaries, so this
 * looks across all of them rather than just the one being edited.
 */
export function membersBookedOn(projects: Project[], date: string, shift: ShiftSlot): Set<string> {
  const booked = new Set<string>();
  for (const project of projects) {
    for (const day of project.schedule?.days ?? []) {
      if (day.date !== date) continue;
      for (const entry of day.entries) {
        if (entry.assignedMember && overlaps(entry.shift, shift)) booked.add(entry.assignedMember);
      }
    }
  }
  return booked;
}

export interface CrewCandidate {
  member: TeamMember;
  /** Why they are not a clean pick, if they aren't. Empty means no caveat. */
  warning: string;
}

/**
 * Candidates for one role, best first.
 *
 * Ordered the way the generator orders them — priority members ahead of the
 * rest, then roster order — so a hand-added shift is crewed the same way the
 * plan would have crewed it.
 */
export function candidatesFor(
  role: RoleType,
  phaseId: string,
  date: string,
  shift: ShiftSlot,
  teamMembers: TeamMember[],
  unavailable: Set<string>
): CrewCandidate[] {
  return teamMembers
    .filter((m) => !unavailable.has(m.id))
    .filter((m) => isMemberApprovedForRole(m, phaseId, role))
    .filter((m) => isMemberAvailableForShift(m, date, shift))
    .sort((a, b) => {
      if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
      return teamMembers.indexOf(a) - teamMembers.indexOf(b);
    })
    .map((member) => ({ member, warning: '' }));
}

export interface AutoAssignInput {
  roles: RoleType[];
  phaseId: string;
  date: string;
  shift: ShiftSlot;
  teamMembers: TeamMember[];
  projects: Project[];
}

export interface AutoAssignResult {
  /** One entry per role, in role order. `null` where nobody qualified. */
  assigned: (TeamMember | null)[];
  /** Roles that could not be filled, for telling the user why. */
  unfilled: RoleType[];
}

/**
 * Fill a shift's roles with people.
 *
 * Roles are filled in order and each pick is taken out of the running for the
 * rest of the shift, so one person can't be given two slots on it. A role with
 * no qualified, free candidate is left open rather than filled with someone
 * unapproved — an empty slot is visible, a wrong one is not.
 */
export function autoAssignCrew({
  roles,
  phaseId,
  date,
  shift,
  teamMembers,
  projects,
}: AutoAssignInput): AutoAssignResult {
  const taken = new Set(membersBookedOn(projects, date, shift));
  const assigned: (TeamMember | null)[] = [];
  const unfilled: RoleType[] = [];

  for (const role of roles) {
    const pick = candidatesFor(role, phaseId, date, shift, teamMembers, taken)[0]?.member ?? null;
    if (pick) taken.add(pick.id);
    else unfilled.push(role);
    assigned.push(pick);
  }

  return { assigned, unfilled };
}
