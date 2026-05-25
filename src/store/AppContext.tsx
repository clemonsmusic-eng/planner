import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type { AppState, Project, TabName, TeamMember, ProjectInputs, ScheduleResult, PhaseTemplate, ListCategory } from '../types';
import {
  loadProjects, saveProjects,
  loadTeamMembers, saveTeamMembers,
  loadCommunities, saveCommunities,
  loadLists, saveLists,
  loadPhaseTemplates, savePhaseTemplates,
} from '../lib/storage';
import { generateSchedule } from '../lib/scheduling';
import { PHASE_TEMPLATES as DEFAULT_PHASE_TEMPLATES } from '../lib/data';

// ─── Example / Seed project ───────────────────────────────────────────────────

function createExampleProject(teamMembers: TeamMember[]): Project {
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
  };
  const project: Project = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inputs,
    schedule: null,
  };
  project.schedule = generateSchedule(inputs, teamMembers, DEFAULT_PHASE_TEMPLATES);
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
  | { type: 'UPDATE_TEAM_MEMBERS'; members: TeamMember[] }
  | { type: 'UPDATE_COMMUNITIES'; communities: string[] }
  | { type: 'UPDATE_LISTS'; lists: ListCategory[] }
  | { type: 'UPDATE_PHASE_TEMPLATES'; phaseTemplates: PhaseTemplate[] }
  | { type: 'LOAD_STATE'; state: Partial<AppState> };

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

    case 'LOAD_STATE':
      return { ...state, ...action.state };

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
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  activeProject: Project | null;
  generateAndSaveSchedule: (projectId: string) => void;
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
    if (projects.length === 0) {
      const example = createExampleProject(teamMembers);
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
        activeProjectId: projects[0]?.id ?? null,
      },
    });
  }, []);

  const activeProject =
    state.projects.find((p) => p.id === state.activeProjectId) ?? null;

  function generateAndSaveSchedule(projectId: string) {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    const schedule = generateSchedule(project.inputs, state.teamMembers, state.phaseTemplates);
    dispatch({ type: 'SET_SCHEDULE', id: projectId, schedule });
  }

  return (
    <AppContext.Provider value={{ state, dispatch, activeProject, generateAndSaveSchedule }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
