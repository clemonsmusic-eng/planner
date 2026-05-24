import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { StatusBadge, getScheduleStatusVariant } from '../components/StatusBadge';
import type { Project, ProjectInputs } from '../types';
import { formatDateLabel } from '../lib/dateUtils';

function createDefaultInputs(): ProjectInputs {
  return {
    clientName: '',
    projectName: '',
    community: 'First Colonial Inn',
    moveType: 'Full Move',
    targetMoveDate: '',
    earliestStartDate: '',
    hardDeadline: '',
    flexibilityLevel: 'Medium',
    originSqFt: 0,
    destinationSqFt: 0,
    densityLevel: 'Moderate',
    budgetedManHours: 0,
    clientTimePreference: 'AM',
    specialNotes: '',
    cleanout: { enabled: false, type: '', startDate: '' },
    auction: { enabled: false },
    dateOverrides: [],
  };
}

function createNewProject(): Project {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    inputs: createDefaultInputs(),
    schedule: null,
  };
}

export function ProjectListPage() {
  const { state, dispatch } = useApp();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleCreateProject() {
    const project = createNewProject();
    dispatch({ type: 'CREATE_PROJECT', project });
  }

  function handleSelectProject(project: Project) {
    dispatch({ type: 'SET_ACTIVE_PROJECT', id: project.id });
    dispatch({ type: 'SET_ACTIVE_TAB', tab: 'inputs' });
  }

  function handleDeleteProject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (deletingId === id) {
      dispatch({ type: 'DELETE_PROJECT', id });
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  }

  const projects = state.projects;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4 pt-safe"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <span className="text-sm text-ios-gray-600">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {projects.length === 0 ? (
          <EmptyState onCreate={handleCreateProject} />
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={() => handleSelectProject(project)}
              onDelete={(e) => handleDeleteProject(project.id, e)}
              isDeleting={deletingId === project.id}
            />
          ))
        )}
      </div>

      {/* FAB */}
      {projects.length > 0 && (
        <button
          onClick={handleCreateProject}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] right-4 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40"
          aria-label="Create new project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onSelect,
  onDelete,
  isDeleting,
}: {
  project: Project;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}) {
  const { inputs, schedule } = project;
  const clientName = inputs.clientName || 'Unnamed Client';
  const moveDate = inputs.targetMoveDate ? formatDateLabel(inputs.targetMoveDate) : 'No date set';

  return (
    <Card onClick={onSelect} className="overflow-hidden">
      <div className="flex items-stretch">
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h2 className="font-semibold text-gray-900 text-base leading-tight">
                {clientName}
              </h2>
              {inputs.projectName && (
                <p className="text-sm text-ios-gray-600 mt-0.5">{inputs.projectName}</p>
              )}
            </div>
            {schedule && (
              <StatusBadge
                label={schedule.status}
                variant={getScheduleStatusVariant(schedule.status)}
              />
            )}
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-sm text-ios-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.615z" />
                <path fillRule="evenodd" d="M9.99 2C5.58 2 2 5.58 2 9.99s3.58 7.99 7.99 7.99 7.99-3.58 7.99-7.99S14.4 2 9.99 2zM9.25 4.25v.426a2.716 2.716 0 00-1.543.848c-.498.583-.707 1.355-.707 2.064 0 .553.13 1.14.514 1.637.386.498.96.852 1.736 1.073v3.12c-.654-.129-1.2-.491-1.539-.882a.75.75 0 00-1.122.996c.574.649 1.43 1.147 2.661 1.244v.5a.75.75 0 001.5 0v-.522a2.986 2.986 0 001.686-.945 2.786 2.786 0 00.672-1.858c0-.636-.175-1.264-.6-1.77-.426-.508-1.062-.84-1.757-1.01V6.344c.371.095.68.277.888.483a.75.75 0 001.072-1.05 3.26 3.26 0 00-1.96-.954V4.25a.75.75 0 00-1.5 0z" clipRule="evenodd" />
              </svg>
              <span>{inputs.community || 'No community'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-ios-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
              </svg>
              <span>Move: {moveDate}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-ios-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                <path fillRule="evenodd" d="M9.664 1.319a.75.75 0 01.672 0 41.059 41.059 0 018.198 5.424.75.75 0 01-.254 1.285 31.372 31.372 0 00-7.86 3.83.75.75 0 01-.84 0 31.508 31.508 0 00-2.08-1.287V9.394c0-.244.116-.463.302-.592a35.504 35.504 0 013.305-2.033.75.75 0 00-.714-1.319 37 37 0 00-3.446 2.12A2.216 2.216 0 006 9.393v.38a31.293 31.293 0 00-4.28-1.746.75.75 0 01-.254-1.285 41.059 41.059 0 018.198-5.424zM6 11.459a29.848 29.848 0 00-2.455-1.158 41.029 41.029 0 00-.39 3.114.75.75 0 00.419.74c.528.256 1.046.53 1.554.82-.21.324-.455.63-.739.914a.75.75 0 101.06 1.06c.37-.369.69-.77.96-1.193a26.61 26.61 0 013.095 2.348.75.75 0 00.992 0 26.547 26.547 0 015.93-3.95.75.75 0 00.42-.739 41.053 41.053 0 00-.39-3.114 29.925 29.925 0 00-5.199 2.801 2.25 2.25 0 01-2.514 0c-.41-.275-.826-.541-1.243-.793zm1.5 6.12V16.5a.75.75 0 00-1.5 0v1.079a.75.75 0 001.5 0z" clipRule="evenodd" />
              </svg>
              <span>{inputs.moveType}</span>
            </div>
          </div>

          {schedule && (
            <div className="mt-2 pt-2 border-t border-ios-gray-100 flex items-center gap-3 text-xs text-ios-gray-600">
              <span>{schedule.totalScheduledHours}h scheduled</span>
              <span>·</span>
              <span>{Math.round(schedule.percentScheduled)}% of budget</span>
            </div>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={onDelete}
          className={`flex items-center justify-center w-16 transition-colors ${
            isDeleting ? 'bg-red-500' : 'bg-ios-gray-100'
          }`}
          aria-label={isDeleting ? 'Confirm delete' : 'Delete project'}
        >
          {isDeleting ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-ios-gray-500">
              <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-indigo-400">
          <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.33.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">No Projects Yet</h2>
      <p className="text-ios-gray-600 mb-6 max-w-xs">
        Create your first move plan project for a Smooth Transitions client.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-base active:opacity-80 transition-opacity min-h-[44px]"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
        </svg>
        Create First Project
      </button>
    </div>
  );
}
