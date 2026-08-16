import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type { AppState, Project, TabName, TeamMember, ProjectInputs, ScheduleResult, PhaseTemplate, ListCategory, AvailabilitySlot, AuctionAppSettings, ProjectStatus, RoleType, ChecklistTemplateSection, ChecklistTemplateItem, ProjectChecklist, ManualShift, ProjectDocuments, SupplyItem, ShiftTimeSettings, ShiftNote, ServiceCategory } from '../types';
import {
  loadProjects, saveProjects,
  loadTeamMembers, saveTeamMembers,
  loadCommunities, saveCommunities,
  loadLists, saveLists,
  loadPhaseTemplates, savePhaseTemplates,
  loadAuctionSettings, saveAuctionSettings,
  loadChecklistTemplate, saveChecklistTemplate,
  loadSupplies, saveSupplies,
  loadSupplyCategories,
  loadShiftTimes, saveShiftTimes, DEFAULT_SHIFT_TIMES, saveSupplyCategories,
  loadServices, saveServices,
} from '../lib/storage';
import { generateSchedule, type ExternalBookings } from '../lib/scheduling';
import { normalizeChecklist, EMPTY_ITEM_STATE } from '../lib/checklist';
import { normalizeDocuments, allFileIds } from '../lib/documents';
import { deleteFile } from '../lib/fileStore';
import { applyScheduleEdit } from '../lib/scheduleEdits';

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
  | { type: 'SET_LOCK'; projectId: string; which: 'inputs' | 'schedule'; locked: boolean }
  | { type: 'MOVE_PHASE_DATE'; id: string; phaseId: string; originalDate: string; newDate: string }
  | { type: 'UPDATE_SCHEDULE_ENTRY'; projectId: string; entryId: string; memberId: string | null; memberName: string | null }
  | { type: 'ADD_SCHEDULE_ROLE'; projectId: string; date: string; phaseId: string; role: RoleType }
  | { type: 'REMOVE_SCHEDULE_ROLE'; projectId: string; entryId: string }
  | { type: 'ADD_SHIFT'; projectId: string; shift: NewShift }
  | { type: 'REMOVE_SHIFT'; projectId: string; date: string; phaseId: string }
  | { type: 'SET_SHIFT_HOURS'; projectId: string; date: string; phaseId: string; hours: number }
  | { type: 'UPDATE_DOCUMENTS'; projectId: string; documents: ProjectDocuments }
  | { type: 'UPDATE_SUPPLIES'; supplies: SupplyItem[] }
  | { type: 'UPDATE_SUPPLY_CATEGORIES'; categories: string[]; supplies?: SupplyItem[] }
  | { type: 'UPDATE_SHIFT_TIMES'; times: ShiftTimeSettings }
  | { type: 'UPDATE_SERVICES'; services: ServiceCategory[] }
  | { type: 'SET_SCHEDULE_DRAFT'; project: Project | null }
  | { type: 'COMMIT_SCHEDULE_DRAFT' }
  | { type: 'SET_SHIFT_NOTES'; projectId: string; notes: ShiftNote[] };

/** A shift built by hand on the Schedule tab rather than by the generator. */
export type NewShift = ManualShift;


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

    /**
     * Two tiers, kept consistent here rather than at the call sites.
     *
     * A locked schedule implies locked inputs: the plan hangs off them, so it
     * cannot be settled while they are still open. Everything else follows from
     * that one invariant — locking the schedule pulls the inputs shut with it,
     * and unlocking the inputs releases the schedule, because leaving it locked
     * would leave a plan frozen against numbers that can now move.
     */
    case 'SET_LOCK': {
      const projects = state.projects.map((p) => {
        if (p.id !== action.projectId) return p;
        const isLocked = action.which === 'inputs' ? action.locked : action.locked || !!p.inputs.isLocked;
        const scheduleLocked =
          action.which === 'schedule' ? action.locked : action.locked ? !!p.inputs.scheduleLocked : false;
        return { ...p, inputs: { ...p.inputs, isLocked, scheduleLocked }, updatedAt: new Date().toISOString() };
      });
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
      const projects = state.projects.map((p) =>
        p.id === action.projectId ? applyScheduleEdit(p, { kind: 'assignMember', entryId: action.entryId, memberId: action.memberId, memberName: action.memberName }, state.teamMembers) : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'ADD_SCHEDULE_ROLE': {
      const projects = state.projects.map((p) =>
        p.id === action.projectId ? applyScheduleEdit(p, { kind: 'addRole', date: action.date, phaseId: action.phaseId, role: action.role }, state.teamMembers) : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'ADD_SHIFT': {
      const projects = state.projects.map((p) =>
        p.id === action.projectId ? applyScheduleEdit(p, { kind: 'addShift', shift: action.shift }, state.teamMembers) : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    /** Drops one phase's whole crew from one day, leaving other shifts alone. */
    case 'REMOVE_SHIFT': {
      const projects = state.projects.map((p) =>
        p.id === action.projectId ? applyScheduleEdit(p, { kind: 'removeShift', date: action.date, phaseId: action.phaseId }, state.teamMembers) : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'REMOVE_SCHEDULE_ROLE': {
      const projects = state.projects.map((p) =>
        p.id === action.projectId ? applyScheduleEdit(p, { kind: 'removeRole', entryId: action.entryId }, state.teamMembers) : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    /**
     * Hours for one shift, applied to every role on it — the figure is hours
     * per person, which is what the generator assigns and what the man-hour
     * totals are built from.
     */
    case 'SET_SHIFT_HOURS': {
      const projects = state.projects.map((p) =>
        p.id === action.projectId ? applyScheduleEdit(p, { kind: 'setHours', date: action.date, phaseId: action.phaseId, hours: action.hours }, state.teamMembers) : p
      );
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

    /** Renaming or removing a section has to move its items in the same write. */
    case 'UPDATE_SUPPLY_CATEGORIES': {
      saveSupplyCategories(action.categories);
      if (action.supplies) saveSupplies(action.supplies);
      return {
        ...state,
        supplyCategories: action.categories,
        supplies: action.supplies ?? state.supplies,
      };
    }

    /** Notes ride on inputs but must not invalidate the generated plan. */
    case 'SET_SHIFT_NOTES': {
      const projects = state.projects.map((p) =>
        p.id === action.projectId
          ? { ...p, inputs: { ...p.inputs, shiftNotes: action.notes }, updatedAt: new Date().toISOString() }
          : p
      );
      saveProjects(projects);
      return { ...state, projects };
    }

    case 'SET_SCHEDULE_DRAFT':
      return { ...state, scheduleDraft: action.project };

    /** Write the draft over its project — the only path from draft to stored. */
    case 'COMMIT_SCHEDULE_DRAFT': {
      const draft = state.scheduleDraft;
      if (!draft) return state;
      const projects = state.projects.map((p) =>
        p.id === draft.id ? { ...draft, updatedAt: new Date().toISOString() } : p
      );
      saveProjects(projects);
      return { ...state, projects, scheduleDraft: null };
    }

    case 'UPDATE_SERVICES': {
      saveServices(action.services);
      return { ...state, services: action.services };
    }

    case 'UPDATE_SHIFT_TIMES': {
      saveShiftTimes(action.times);
      return { ...state, shiftTimes: action.times };
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
  supplyCategories: [],
  shiftTimes: DEFAULT_SHIFT_TIMES,
  services: [],
  scheduleDraft: null,
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  activeProject: Project | null;
  generateAndSaveSchedule: (projectId: string, inputsOverride?: ProjectInputs) => void;
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
  setShiftNote: (projectId: string, phaseId: string, date: string, note: string) => void;
  planFrom: (projectId: string, inputs: ProjectInputs) => ScheduleResult;
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
    const supplyCategories = loadSupplyCategories();
    const shiftTimes = loadShiftTimes();
    const services = loadServices();
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
        supplyCategories,
        shiftTimes,
        services,
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

  /**
   * `state` here is the closure from the render that handed this function out,
   * so a caller that has just edited the inputs would otherwise generate from
   * the previous ones — every save landing a plan one edit behind. Callers
   * holding fresh inputs pass them in rather than racing the dispatch.
   */
  function generateAndSaveSchedule(projectId: string, inputsOverride?: ProjectInputs) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project && !inputsOverride) return;
    const inputs = inputsOverride ?? project!.inputs;
    const extBookings = buildExternalBookings(projectId);
    const schedule = generateSchedule(inputs, state.teamMembers, state.phaseTemplates, state.lists, extBookings, state.auctionSettings);
    dispatch({ type: 'SET_SCHEDULE', id: projectId, schedule });
  }

  /**
   * Generate a plan from inputs without storing it. The Schedule tab's draft
   * needs this for the two edits that re-run the generator — moving a shift's
   * date and overriding a day's shift — since neither can go through the store
   * until Save.
   */
  function planFrom(projectId: string, inputs: ProjectInputs): ScheduleResult {
    const extBookings = buildExternalBookings(projectId);
    return generateSchedule(inputs, state.teamMembers, state.phaseTemplates, state.lists, extBookings, state.auctionSettings);
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

  /**
   * Note against one shift. Stored on inputs beside the other hand edits, so
   * regenerating the plan doesn't wipe what someone wrote; an empty note drops
   * the row rather than leaving a blank one behind.
   */
  function setShiftNote(projectId: string, phaseId: string, date: string, note: string) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    const existing = project.inputs.shiftNotes ?? [];
    const rest = existing.filter((n) => !(n.phaseId === phaseId && n.date === date));
    const trimmed = note.trim();
    dispatch({
      type: 'SET_SHIFT_NOTES',
      projectId,
      notes: trimmed ? [...rest, { phaseId, date, note: trimmed }] : rest,
    });
  }

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
        updateDocuments, setShiftNote, planFrom,
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
