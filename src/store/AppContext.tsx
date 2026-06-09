import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type { AppState, Project, TabName, TeamMember, ProjectInputs, ScheduleResult, PhaseTemplate, ListCategory, AvailabilitySlot, AuctionAppSettings } from '../types';
import {
  loadProjects, saveProjects,
  loadTeamMembers, saveTeamMembers,
  loadCommunities, saveCommunities,
  loadLists, saveLists,
  loadPhaseTemplates, savePhaseTemplates,
  loadAuctionSettings, saveAuctionSettings,
} from '../lib/storage';
import { generateSchedule, type ExternalBookings } from '../lib/scheduling';
import { PHASE_TEMPLATES as DEFAULT_PHASE_TEMPLATES } from '../lib/data';

// ─── Example / Seed project ───────────────────────────────────────────────────

function createExampleProject(teamMembers: TeamMember[], lists: ListCategory[] = []): Project {
  const inputs: ProjectInputs = {
    clientName: 'Jim Doyle',
    projectName: 'Doyle Move – First Colonial Inn',
    community: 'First Colonial Inn',
    moveType: 'Full Move',
    status: 'active',
    targetMoveDate: '2026-05-15',
    earliestStartDate: '2026-04-27',
    hardDeadline: '2026-05-22',
    flexibilityLevel: 'Medium',
    originSqFt: 2738,
    destinationSqFt: 858,
    densityLevel: 'Moderate',
    budgetedManHours: 149,
    clientTimePreference: 'AM',
    specialNotes: 'Example project from spec sheet',
    cleanout: { enabled: false, type: '', startDate: '' },
    auction: { enabled: false },
    dateOverrides: [],
    isLocked: false,
    phaseDateMoves: [],
  };
  const project: Project = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inputs,
    schedule: null,
  };
  project.schedule = generateSchedule(inputs, teamMembers, DEFAULT_PHASE_TEMPLATES, lists);
  return project;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_ACTIVE_TAB'; tab: TabName }
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
  | { type: 'LOAD_STATE'; state: Partial<AppState> }
  | { type: 'TOGGLE_LOCK'; id: string }
  | { type: 'MOVE_PHASE_DATE'; id: string; phaseId: string; originalDate: string; newDate: string };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };

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

    default:
      return state;
  }
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: AppState = {
  projects: [],
  activeProjectId: null,
  activeTab: 'projects',
  teamMembers: [],
  communities: [],
  lists: [],
  phaseTemplates: [],
  auctionSettings: { hourlyRate: 95, performanceLevel: 'Average' },
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  activeProject: Project | null;
  generateAndSaveSchedule: (projectId: string) => void;
  setShiftOverride: (projectId: string, date: string, shift: AvailabilitySlot | null) => void;
  movePhaseDate: (projectId: string, phaseId: string, originalDate: string, newDate: string) => ScheduleResult;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let projects = loadProjects();
    const teamMembers = loadTeamMembers();
    const communities = loadCommunities();
    const lists = loadLists();
    const phaseTemplates = loadPhaseTemplates();
    const auctionSettings = loadAuctionSettings();
    if (projects.length === 0) {
      const example = createExampleProject(teamMembers, lists);
      projects = [example];
      saveProjects(projects);
    }
    dispatch({
      type: 'LOAD_STATE',
      state: {
        projects,
        teamMembers,
        communities,
        lists,
        phaseTemplates,
        auctionSettings,
        activeProjectId: projects[0]?.id ?? null,
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
    const schedule = generateSchedule(project.inputs, state.teamMembers, state.phaseTemplates, state.lists, extBookings);
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
    const schedule = generateSchedule(inputs, state.teamMembers, state.phaseTemplates, state.lists, extBookings);
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
    const schedule = generateSchedule(inputs, state.teamMembers, state.phaseTemplates, state.lists, extBookings);
    dispatch({ type: 'SET_OVERRIDE', id: projectId, inputs, schedule });
    return schedule;
  }

  return (
    <AppContext.Provider value={{ state, dispatch, activeProject, generateAndSaveSchedule, setShiftOverride, movePhaseDate }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
