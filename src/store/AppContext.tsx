import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type { AppState, Project, TabName, TeamMember, ProjectInputs, ScheduleResult, PhaseTemplate, ListCategory, AvailabilitySlot, AuctionAppSettings, AssignmentStatus, ProjectStatus, RoleType, ScheduleDay, ChecklistTemplateSection, ChecklistTemplateItem, ProjectChecklist, ManualShift, ProjectDocuments, SupplyItem } from '../types';
import {
  loadProjects, saveProjects,
  loadTeamMembers, saveTeamMembers,
  loadCommunities, saveCommunities,
  loadLists, saveLists,
  loadPhaseTemplates, savePhaseTemplates,
  loadAuctionSettings, saveAuctionSettings,
  loadChecklistTemplate, saveChecklistTemplate,
  loadSupplies, saveSupplies,
} from '../lib/storage';
import { generateSchedule, deriveSuggestedDates, type ExternalBookings } from '../lib/scheduling';
import { formatDateLabel } from '../lib/dateUtils';
import { normalizeChecklist, EMPTY_ITEM_STATE } from '../lib/checklist';
import { normalizeDocuments, allFileIds } from '../lib/documents';
import { deleteFile } from '../lib/fileStore';

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_ACTIVE_TAB'; tab: TabName }
  | { type: 'SET_PROJECT_LIST_FILTER'; filter: ProjectStatus | 'all' }
  | { type: 'SET_ACTIVE_PROJECT'; id: string | null }
  | { type: 'CREATE_PROJECT'; project: Project }
  | { type: 'UPDATE_PROJECT'; id: string; inputs: ProjectInputs }
  | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'SET_SCHEDULE'; id: string; schedule: ScheduleResult }
  | { type: 'SET_OVERRIDE'; id: string; inputs: ProjectInputs; schedule: ScheduleResult }
  | { type: 'UPDATE_TEAM_MEMBERS'; members: TeamMember[] }
  | { type: 'UPDATE_COMMUNITIES'; communities: string[] }
  | { type: 'UPDATE_LISTS'; lists: ListCategory[] }
  | { type: 'UPDATE_PHASE_TEMPLATES'; phaseTemplates: PhaseTemplate[] }
  | { type: 'UPDATE_AUCTION_SETTINGS'; settings: AuctionAppSettings }
  | { type: 'UPDATE_CHECKLIST_TEMPLATE'; checklistTemplate: ChecklistTemplateSection[] }
  | { type: 'UPDATE_CHECKLIST'; id: string; checklist: ProjectChecklist }
  | { type: 'LOAD_STATE'; state: Partial<AppState> }
  | { type: 'TOGGLE_LOCK'; id: string }
  | { type: 'MOVE_PHASE_DATE'; id: string; phaseId: string; originalDate: string; newDate: string }
  | { type: 'UPDATE_SCHEDULE_ENTRY'; projectId: string; entryId: string; memberId: string | null; memberName: string | null }
  | { type: 'ADD_SCHEDULE_ROLE'; projectId: string; date: string; phaseId: string; role: RoleType }
  | { type: 'REMOVE_SCHEDULE_ROLE'; projectId: string; entryId: string }
  | { type: 'ADD_SHIFT'; projectId: string; shift: NewShift }
  | { type: 'REMOVE_SHIFT'; projectId: string; date: string; phaseId: string }
  | { type: 'UPDATE_DOCUMENTS'; projectId: string; documents: ProjectDocuments }
  | { type: 'UPDATE_SUPPLIES'; supplies: SupplyItem[] };

/** A shift built by hand on the Schedule tab rather than by the generator. */
export type NewShift = ManualShift;


/**
 * Totals, per-member hours and the plan's milestone dates are produced by
 * generateSchedule, so any hand edit on the Schedule tab leaves them stale — and
 * the Plan tab reads the totals while the Checklist dates itself from the
 * milestones. Recompute all three from the entries so every tab agrees with the
 * schedule as it now stands.
 */
function withRecomputedTotals(
  schedule: ScheduleResult,
  days: ScheduleDay[],
  teamMembers: TeamMember[],
  budgetedManHours: number
): ScheduleResult {
  const entries = days.flatMap((d) => d.entries);
  const totalScheduledHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const percentScheduled = budgetedManHours > 0 ? (totalScheduledHours / budgetedManHours) * 100 : 0;

  const hoursByMember: Record<string, number> = {};
  for (const e of entries) {
    if (e.assignedMember) hoursByMember[e.assignedMember] = (hoursByMember[e.assignedMember] ?? 0) + e.hours;
  }

  return {
    ...schedule,
    days,
    suggestedDates: deriveSuggestedDates(days, schedule.suggestedDates),
    totalScheduledHours,
    remainingHours: budgetedManHours - totalScheduledHours,
    percentScheduled,
    status: percentScheduled > 120 ? 'OVER BUDGET' : percentScheduled < 85 ? 'UNDER SCHEDULED' : 'ON TRACK',
    teamHours: teamMembers
      .filter((m) => hoursByMember[m.id] !== undefined)
      .map((m) => ({
        memberId: m.id,
        memberName: m.name,
        scheduledHours: hoursByMember[m.id],
        maxHours: m.maxHoursPerWeek,
        isOverMax: m.maxHoursPerWeek > 0 && hoursByMember[m.id] > m.maxHoursPerWeek,
      })),
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };

    case 'SET_PROJECT_LIST_FILTER':
      return { ...state, projectListFilter: action.filter };

    case 'SET_ACTIVE_PROJECT':
      return { ...state, activeProjectId: action.id };

    case 'CREATE_PROJECT': {
      const projects = [...state.projects, action.project];
      saveProjects(projects);
      return { ...state, projects, activeProjectId: action.project.id, activeTab: 'inputs' };
    }

    case 'UPDATE_PROJECT': {
      const projects = state.projects.map((p) =>
        p.id === action.id
          ? { ...p, inputs: action.inputs, updatedAt: new Date().toISOString(), schedule: null }
          : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'DELETE_PROJECT': {
      // Drop the project's attachment blobs too — the metadata goes with the
      // project, but the bytes live in IndexedDB and would otherwise be orphaned.
      const doomed = state.projects.find((p) => p.id === action.id);
      if (doomed?.documents) {
        for (const id of allFileIds(normalizeDocuments(doomed.documents))) deleteFile(id);
      }
      const projects = state.projects.filter((p) => p.id !== action.id);
      saveProjects(projects);
      const newActive =
        state.activeProjectId === action.id
          ? (projects[0]?.id ?? null)
          : state.activeProjectId;
      return { ...state, projects, activeProjectId: newActive };
    }

    case 'SET_SCHEDULE': {
      const projects = state.projects.map((p) =>
        p.id === action.id ? { ...p, schedule: action.schedule } : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'SET_OVERRIDE': {
      const projects = state.projects.map((p) =>
        p.id === action.id
          ? { ...p, inputs: action.inputs, schedule: action.schedule, updatedAt: new Date().toISOString() }
          : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'UPDATE_TEAM_MEMBERS': {
      saveTeamMembers(action.members);
      return { ...state, teamMembers: action.members };
    }

    case 'UPDATE_COMMUNITIES': {
      saveCommunities(action.communities);
      return { ...state, communities: action.communities };
    }

    case 'UPDATE_LISTS': {
      saveLists(action.lists);
      return { ...state, lists: action.lists };
    }

    case 'UPDATE_PHASE_TEMPLATES': {
      savePhaseTemplates(action.phaseTemplates);
      return { ...state, phaseTemplates: action.phaseTemplates };
    }

    case 'UPDATE_AUCTION_SETTINGS': {
      saveAuctionSettings(action.settings);
      return { ...state, auctionSettings: action.settings };
    }

    case 'UPDATE_CHECKLIST_TEMPLATE': {
      saveChecklistTemplate(action.checklistTemplate);
      return { ...state, checklistTemplate: action.checklistTemplate };
    }

    case 'UPDATE_CHECKLIST': {
      const projects = state.projects.map((p) =>
        p.id === action.id ? { ...p, checklist: action.checklist } : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    case 'TOGGLE_LOCK': {
      const projects = state.projects.map((p) =>
        p.id === action.id
          ? { ...p, inputs: { ...p.inputs, isLocked: !p.inputs.isLocked }, updatedAt: new Date().toISOString() }
          : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'MOVE_PHASE_DATE': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.id) return p;
        const existing = p.inputs.phaseDateMoves ?? [];
        // Replace any prior move for this phaseId+originalDate or add new
        const filtered = existing.filter(
          (m) => !(m.phaseId === action.phaseId && m.originalDate === action.originalDate)
        );
        const phaseDateMoves = [
          ...filtered,
          { id: crypto.randomUUID(), phaseId: action.phaseId, originalDate: action.originalDate, newDate: action.newDate },
        ];
        return { ...p, inputs: { ...p.inputs, phaseDateMoves }, updatedAt: new Date().toISOString() };
      });
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'UPDATE_SCHEDULE_ENTRY': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId || !p.schedule) return p;
        const days = p.schedule.days.map((day) => ({
          ...day,
          entries: day.entries.map((entry) =>
            entry.id === action.entryId
              ? {
                  ...entry,
                  assignedMember: action.memberId,
                  assignedMemberName: action.memberName,
                  status: (action.memberId ? 'assigned' : 'needs-assignment') as AssignmentStatus,
                  warnings: [],
                }
              : entry
          ),
        }));
        return {
          ...p,
          schedule: withRecomputedTotals(p.schedule, days, state.teamMembers, p.inputs.budgetedManHours),
        };
      });
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'ADD_SCHEDULE_ROLE': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId || !p.schedule) return p;
        const days = p.schedule.days.map((day) => {
          if (day.date !== action.date) return day;
          const sibling = day.entries.find((e) => e.phaseId === action.phaseId);
          if (!sibling) return day;
          // New slot inherits the phase's shift and hours; it starts unassigned.
          const entry = {
            ...sibling,
            id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            role: action.role,
            assignedMember: null,
            assignedMemberName: null,
            status: 'needs-assignment' as AssignmentStatus,
            warnings: [],
          };
          const lastIdx = day.entries.map((e) => e.phaseId).lastIndexOf(action.phaseId);
          const entries = [...day.entries];
          entries.splice(lastIdx + 1, 0, entry);
          return { ...day, entries };
        });
        return {
          ...p,
          schedule: withRecomputedTotals(p.schedule, days, state.teamMembers, p.inputs.budgetedManHours),
        };
      });
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'ADD_SHIFT': {
      const { date, phaseId, phaseName, shift, hours, roles } = action.shift;
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId || !p.schedule) return p;

        const stamp = Date.now();
        const entries = roles.map((role, i) => ({
          id: `entry-${stamp}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          date,
          phaseName,
          phaseId,
          role,
          assignedMember: null,
          assignedMemberName: null,
          shift,
          hours,
          status: 'needs-assignment' as AssignmentStatus,
          warnings: [],
        }));

        const existing = p.schedule.days.find((d) => d.date === date);
        const days = existing
          ? p.schedule.days.map((d) => (d.date === date ? { ...d, entries: [...d.entries, ...entries] } : d))
          // A shift on a day the plan didn't cover adds that day, in date order.
          : [...p.schedule.days, { date, label: formatDateLabel(date), entries }].sort((a, b) =>
              a.date.localeCompare(b.date)
            );

        return {
          ...p,
          // Recorded on the inputs too, so a later regenerate replays it.
          inputs: {
            ...p.inputs,
            addedShifts: [...(p.inputs.addedShifts ?? []), action.shift],
            removedShifts: (p.inputs.removedShifts ?? []).filter(
              (r) => !(r.phaseId === phaseId && r.date === date)
            ),
          },
          schedule: withRecomputedTotals(p.schedule, days, state.teamMembers, p.inputs.budgetedManHours),
          updatedAt: new Date().toISOString(),
        };
      });
      saveProjects(projects);
      return { ...state, projects };
    }

    /** Drops one phase's whole crew from one day, leaving other shifts alone. */
    case 'REMOVE_SHIFT': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId || !p.schedule) return p;
        const days = p.schedule.days
          .map((day) =>
            day.date === action.date
              ? { ...day, entries: day.entries.filter((e) => e.phaseId !== action.phaseId) }
              : day
          )
          .filter((day) => day.entries.length > 0);
        return {
          ...p,
          // Remembered on the inputs so a regenerate doesn't bring the shift back.
          // A hand-added shift is dropped outright rather than tombstoned.
          inputs: {
            ...p.inputs,
            addedShifts: (p.inputs.addedShifts ?? []).filter(
              (a) => !(a.phaseId === action.phaseId && a.date === action.date)
            ),
            removedShifts: [
              ...(p.inputs.removedShifts ?? []).filter(
                (r) => !(r.phaseId === action.phaseId && r.date === action.date)
              ),
              { phaseId: action.phaseId, date: action.date },
            ],
          },
          schedule: withRecomputedTotals(p.schedule, days, state.teamMembers, p.inputs.budgetedManHours),
          updatedAt: new Date().toISOString(),
        };
      });
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'REMOVE_SCHEDULE_ROLE': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId || !p.schedule) return p;
        const days = p.schedule.days
          .map((day) => ({ ...day, entries: day.entries.filter((e) => e.id !== action.entryId) }))
          .filter((day) => day.entries.length > 0);
        return {
          ...p,
          schedule: withRecomputedTotals(p.schedule, days, state.teamMembers, p.inputs.budgetedManHours),
        };
      });
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'UPDATE_DOCUMENTS': {
      const projects = state.projects.map((p) =>
        p.id === action.projectId
          ? { ...p, documents: action.documents, updatedAt: new Date().toISOString() }
          : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'UPDATE_SUPPLIES': {
      saveSupplies(action.supplies);
      return { ...state, supplies: action.supplies };
    }

    default:
      return state;
  }
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  projects: [],
  activeProjectId: null,
  activeTab: 'home',
  teamMembers: [],
  communities: [],
  lists: [],
  phaseTemplates: [],
  auctionSettings: { hourlyRate: 95, performanceLevel: 'Average' },
  projectListFilter: 'all',
  checklistTemplate: [],
  supplies: [],
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  activeProject: Project | null;
  generateAndSaveSchedule: (projectId: string) => void;
  setShiftOverride: (projectId: string, date: string, shift: AvailabilitySlot | null) => void;
  movePhaseDate: (projectId: string, phaseId: string, originalDate: string, newDate: string) => ScheduleResult;
  toggleChecklistItem: (projectId: string, itemId: string) => void;
  setChecklistDueDate: (projectId: string, itemId: string, date: string | null) => void;
  setChecklistNote: (projectId: string, itemId: string, note: string) => void;
  addChecklistItem: (projectId: string, item: ChecklistTemplateItem & { sectionId: string }) => void;
  removeChecklistItem: (projectId: string, itemId: string, isCustom: boolean) => void;
  restoreChecklistItems: (projectId: string) => void;
  resetChecklistProgress: (projectId: string) => void;
  updateDocuments: (projectId: string, fn: (docs: ProjectDocuments) => ProjectDocuments) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const projects = loadProjects();
    const teamMembers = loadTeamMembers();
    const communities = loadCommunities();
    const lists = loadLists();
    const phaseTemplates = loadPhaseTemplates();
    const auctionSettings = loadAuctionSettings();
    const checklistTemplate = loadChecklistTemplate();
    const supplies = loadSupplies();
    dispatch({
      type: 'LOAD_STATE',
      state: {
        projects,
        teamMembers,
        communities,
        lists,
        phaseTemplates,
        auctionSettings,
        checklistTemplate,
        supplies,
        // Nothing is opened for you. Auto-selecting the first stored project
        // made whichever one happened to be first look like a default.
        activeProjectId: null,
      },
    });
  }, []);

  const activeProject =
    state.projects.find((p) => p.id === state.activeProjectId) ?? null;

  /**
   * Build a map of memberId → dateStr → shift for all projects that have
   * higher scheduling priority than `projectId` (earlier createdAt).
   * These bookings are treated as immovable when generating the target project's schedule.
   */
  function buildExternalBookings(projectId: string): ExternalBookings {
    const sorted = [...state.projects].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const targetIdx = sorted.findIndex((p) => p.id === projectId);
    const priorProjects = targetIdx > 0 ? sorted.slice(0, targetIdx) : [];

    const bookings: ExternalBookings = {};
    for (const prior of priorProjects) {
      if (!prior.schedule) continue;
      for (const day of prior.schedule.days) {
        for (const entry of day.entries) {
          if (!entry.assignedMember) continue;
          if (!bookings[entry.assignedMember]) bookings[entry.assignedMember] = {};
          const cur = bookings[entry.assignedMember][entry.date];
          if (!cur) {
            bookings[entry.assignedMember][entry.date] = entry.shift;
          } else if (cur !== entry.shift) {
            // AM + PM on same day = Full Day booked
            bookings[entry.assignedMember][entry.date] = 'Full Day';
          }
        }
      }
    }
    return bookings;
  }

  function generateAndSaveSchedule(projectId: string) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    const extBookings = buildExternalBookings(projectId);
    const schedule = generateSchedule(project.inputs, state.teamMembers, state.phaseTemplates, state.lists, extBookings, state.auctionSettings);
    dispatch({ type: 'SET_SCHEDULE', id: projectId, schedule });
  }

  function setShiftOverride(projectId: string, date: string, shift: AvailabilitySlot | null) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project || !date) return;
    const filtered = project.inputs.dateOverrides.filter((o) => o.date !== date);
    const dateOverrides = shift
      ? [...filtered, { id: crypto.randomUUID(), date, shift, reason: 'Manual override' }]
      : filtered;
    const inputs = { ...project.inputs, dateOverrides };
    const extBookings = buildExternalBookings(projectId);
    const schedule = generateSchedule(inputs, state.teamMembers, state.phaseTemplates, state.lists, extBookings, state.auctionSettings);
    dispatch({ type: 'SET_OVERRIDE', id: projectId, inputs, schedule });
  }

  function movePhaseDate(projectId: string, phaseId: string, originalDate: string, newDate: string): ScheduleResult {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) throw new Error('Project not found');
    const existing = project.inputs.phaseDateMoves ?? [];
    const filtered = existing.filter(
      (m) => !(m.phaseId === phaseId && m.originalDate === originalDate)
    );
    const phaseDateMoves = [
      ...filtered,
      { id: crypto.randomUUID(), phaseId, originalDate, newDate },
    ];
    const inputs = { ...project.inputs, phaseDateMoves };
    const extBookings = buildExternalBookings(projectId);
    const schedule = generateSchedule(inputs, state.teamMembers, state.phaseTemplates, state.lists, extBookings, state.auctionSettings);
    dispatch({ type: 'SET_OVERRIDE', id: projectId, inputs, schedule });
    return schedule;
  }

  // ── Checklist mutations ─────────────────────────────────────────────────────
  // Each one reads the project's current checklist, applies a narrow change, and
  // writes the whole checklist back through UPDATE_CHECKLIST.

  function mutateChecklist(projectId: string, fn: (c: ProjectChecklist) => ProjectChecklist) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    dispatch({ type: 'UPDATE_CHECKLIST', id: projectId, checklist: fn(normalizeChecklist(project.checklist)) });
  }

  function updateItemState(
    checklist: ProjectChecklist,
    itemId: string,
    patch: Partial<ProjectChecklist['itemStates'][string]>
  ): ProjectChecklist {
    const current = checklist.itemStates[itemId] ?? EMPTY_ITEM_STATE;
    return { ...checklist, itemStates: { ...checklist.itemStates, [itemId]: { ...current, ...patch } } };
  }

  function toggleChecklistItem(projectId: string, itemId: string) {
    mutateChecklist(projectId, (c) => {
      const done = !(c.itemStates[itemId]?.done ?? false);
      return updateItemState(c, itemId, { done, completedAt: done ? new Date().toISOString() : null });
    });
  }

  function setChecklistDueDate(projectId: string, itemId: string, date: string | null) {
    mutateChecklist(projectId, (c) => updateItemState(c, itemId, { dueDateOverride: date }));
  }

  function setChecklistNote(projectId: string, itemId: string, note: string) {
    mutateChecklist(projectId, (c) => updateItemState(c, itemId, { note }));
  }

  function addChecklistItem(projectId: string, item: ChecklistTemplateItem & { sectionId: string }) {
    mutateChecklist(projectId, (c) => ({ ...c, customItems: [...c.customItems, item] }));
  }

  /**
   * Custom items are deleted outright; template items are only hidden for this
   * project, so the shared template stays intact.
   */
  function removeChecklistItem(projectId: string, itemId: string, isCustom: boolean) {
    mutateChecklist(projectId, (c) =>
      isCustom
        ? { ...c, customItems: c.customItems.filter((i) => i.id !== itemId) }
        : { ...c, excludedItemIds: [...new Set([...c.excludedItemIds, itemId])] }
    );
  }

  function restoreChecklistItems(projectId: string) {
    mutateChecklist(projectId, (c) => ({ ...c, excludedItemIds: [] }));
  }

  function resetChecklistProgress(projectId: string) {
    mutateChecklist(projectId, (c) => ({ ...c, itemStates: {} }));
  }

  // ── Documents ───────────────────────────────────────────────────────────────
  // Furniture rows and file metadata. Blobs go to IndexedDB via lib/fileStore;
  // only what's small enough for localStorage is written back through here.

  function updateDocuments(projectId: string, fn: (docs: ProjectDocuments) => ProjectDocuments) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    dispatch({ type: 'UPDATE_DOCUMENTS', projectId, documents: fn(normalizeDocuments(project.documents)) });
  }

  return (
    <AppContext.Provider
      value={{
        state, dispatch, activeProject, generateAndSaveSchedule, setShiftOverride, movePhaseDate,
        toggleChecklistItem, setChecklistDueDate, setChecklistNote,
        addChecklistItem, removeChecklistItem, restoreChecklistItems, resetChecklistProgress,
        updateDocuments,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
