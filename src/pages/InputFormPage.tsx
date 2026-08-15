import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { FloatingSaveButton, FloatingSaveSpacer } from '../components/FloatingSaveButton';
import { LockButton } from '../components/LockButton';
import type { ProjectInputs, DateOverride, FlexibilityLevel, TimePreference, MoveType } from '../types';
import { SERVICE_CATALOG } from '../lib/data';

const CLEANOUT_TYPES = ['Basic', 'Full - Storage', 'Full - Donation/Dispersal', 'Full - Auction'] as const;

// Chevron icon used in project picker
function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-400 flex-shrink-0">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function inputClass(hasError?: boolean) {
  return `w-full min-h-[44px] rounded-xl border ${hasError ? 'border-red-400' : 'border-ios-gray-300'} bg-white px-3 py-2 text-base text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-500`;
}

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
}

function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-2">
      <span className="text-teal-600">{icon}</span>
      <h2 className="text-xs font-bold uppercase tracking-wider text-teal-600">{title}</h2>
    </div>
  );
}


/**
 * One service category, collapsed by default. Checking sub-services adds their
 * labels to inputs.contractedServices; categories are independent, and any
 * number of services may be checked across any number of categories.
 */
function ServiceCategoryGroup({
  category,
  services,
  selected,
  onToggleService,
}: {
  category: string;
  services: string[];
  selected: string[];
  onToggleService: (service: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const chosen = services.filter((sv) => selected.includes(sv));

  return (
    <div className="border border-ios-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-3 min-h-[48px] text-left active:bg-ios-gray-50"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-teal-900">{category}</p>
          <p className="text-xs text-ios-gray-500">
            {chosen.length > 0 ? `${chosen.length} selected` : `${services.length} services`}
          </p>
        </div>
        {chosen.length > 0 && (
          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
            {chosen.length}
          </span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-ios-gray-100 divide-y divide-ios-gray-100">
          {services.map((service) => {
            const isChecked = selected.includes(service);
            return (
              <button
                key={service}
                onClick={() => onToggleService(service)}
                role="checkbox"
                aria-checked={isChecked}
                className="w-full flex items-center gap-3 px-3 py-2.5 min-h-[44px] text-left active:bg-ios-gray-50"
              >
                <span
                  className={`w-[20px] h-[20px] rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isChecked ? 'bg-teal-600 border-teal-600' : 'border-ios-gray-300'
                  }`}
                >
                  {isChecked && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
                <span className={`text-sm leading-snug ${isChecked ? 'text-teal-900 font-medium' : 'text-teal-900'}`}>
                  {service}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


export function InputFormPage() {
  const { dispatch, activeProject, generateAndSaveSchedule, state } = useApp();
  const [inputs, setInputs] = useState<ProjectInputs | null>(null);
  const [saved, setSaved] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);

  useEffect(() => {
    if (activeProject) {
      setInputs({ ...activeProject.inputs });
    } else {
      setInputs(null);
    }
  }, [activeProject?.id]);

  if (!activeProject || !inputs) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-teal-400">
            <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-teal-900 mb-1">No Project Selected</h2>
          <p className="text-ios-gray-600 text-sm">Go to Projects tab and select or create a project.</p>
        </div>
        <button
          onClick={() => { dispatch({ type: 'SET_PROJECT_LIST_FILTER', filter: 'all' }); dispatch({ type: 'SET_ACTIVE_TAB', tab: 'projects' }); }}
          className="bg-teal-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px] active:opacity-80 lg:hover:opacity-90"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  function update<K extends keyof ProjectInputs>(key: K, value: ProjectInputs[K]) {
    setInputs((prev) => prev ? { ...prev, [key]: value } : prev);
    setSaved(false);
  }

  /**
   * Anyone the team sheet says can run a job — a PM or PM/Lead on any phase.
   * If nobody is marked up yet the whole team is offered rather than an empty
   * menu, so a new install can still name someone.
   */
  const pmCandidates = (() => {
    const qualified = state.teamMembers.filter((m) =>
      Object.values(m.phaseRoles).some(
        (r) => Array.isArray(r) && r.some((role) => role === 'PM' || role === 'PM/Lead')
      )
    );
    return qualified.length > 0 ? qualified : state.teamMembers;
  })();

  const otherActiveUnlocked = state.projects.filter(
    (p) => p.id !== activeProject?.id && (p.inputs.status ?? 'active') === 'active' && !p.inputs.isLocked
  );

  function saveAndGenerate(allProjects: boolean) {
    if (!inputs || !activeProject) return;
    dispatch({ type: 'UPDATE_PROJECT', id: activeProject.id, inputs });
    setTimeout(() => {
      generateAndSaveSchedule(activeProject.id);
      if (allProjects) {
        for (const p of otherActiveUnlocked) {
          generateAndSaveSchedule(p.id);
        }
      }
      setSaved(true);
    }, 50);
  }

  function handleSaveAndGenerate() {
    if (!inputs || !activeProject) return;
    if (otherActiveUnlocked.length > 0) {
      setShowSavePrompt(true);
    } else {
      saveAndGenerate(false);
    }
  }

  function handleStatusChange(newStatus: 'draft' | 'active' | 'archived') {
    if (!activeProject || !inputs) return;
    update('status', newStatus);
    dispatch({ type: 'UPDATE_PROJECT', id: activeProject.id, inputs: { ...inputs, status: newStatus } });
  }

  function addDateOverride() {
    if (!inputs) return;
    const override: DateOverride = {
      id: crypto.randomUUID(),
      date: '',
      shift: 'AM',
      reason: '',
    };
    update('dateOverrides', [...inputs.dateOverrides, override]);
  }

  const contractedServices = inputs?.contractedServices ?? [];

  /** Multi-select: a service toggles independently of every other. */
  function toggleService(service: string) {
    setInputs((prev) => {
      if (!prev) return prev;
      const current = prev.contractedServices ?? [];
      return {
        ...prev,
        contractedServices: current.includes(service)
          ? current.filter((sv) => sv !== service)
          : [...current, service],
      };
    });
    setSaved(false);
  }

  function updateOverride(id: string, field: keyof DateOverride, value: string) {
    if (!inputs) return;
    update(
      'dateOverrides',
      inputs.dateOverrides.map((o) => (o.id === id ? { ...o, [field]: value } : o))
    );
  }

  function removeOverride(id: string) {
    if (!inputs) return;
    update('dateOverrides', inputs.dateOverrides.filter((o) => o.id !== id));
  }

  const isFormComplete = Boolean(
    inputs && inputs.clientName && inputs.targetMoveDate && inputs.earliestStartDate && inputs.budgetedManHours > 0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center gap-2">
          {/* Project picker */}
          <div className="flex-1 min-w-0 relative">
            <button
              onClick={() => setPickerOpen(o => !o)}
              className="flex items-center gap-1 min-w-0 max-w-full"
            >
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-teal-900 leading-tight truncate text-left">
                  {inputs.clientName || 'New Project'}
                </h1>
                {inputs.clientName && (
                  <p className="text-xs text-ios-gray-600 truncate text-left">{inputs.community}</p>
                )}
              </div>
              <ChevronDownIcon />
            </button>
            {pickerOpen && (
              <div className="absolute top-full left-0 z-30 mt-1 bg-white rounded-xl shadow-lg border border-ios-gray-200 w-[260px] max-h-[280px] overflow-y-auto">
                {state.projects
                  .filter(p => (p.inputs.status ?? 'active') !== 'archived')
                  .map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        dispatch({ type: 'SET_ACTIVE_PROJECT', id: p.id });
                        dispatch({ type: 'SET_ACTIVE_TAB', tab: 'inputs' });
                        setPickerOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-left border-b border-ios-gray-100 last:border-0 ${p.id === activeProject?.id ? 'bg-teal-50' : 'active:bg-ios-gray-50'}`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.id === activeProject?.id ? 'bg-teal-600' : 'bg-ios-gray-300'}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${p.id === activeProject?.id ? 'text-teal-700' : 'text-teal-900'}`}>
                          {p.inputs.clientName || 'Untitled'}
                        </p>
                        <p className="text-xs text-ios-gray-500 truncate">{p.inputs.community}</p>
                      </div>
                      <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                        (p.inputs.status ?? 'active') === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {(p.inputs.status ?? 'active')}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          {/* Status dropdown */}
          <select
            value={inputs.status ?? 'active'}
            onChange={(e) => handleStatusChange(e.target.value as 'draft' | 'active' | 'archived')}
            className={`flex-shrink-0 text-xs font-semibold px-2 py-1.5 rounded-full border border-transparent appearance-none cursor-pointer min-h-[36px] ${
              (inputs.status ?? 'active') === 'draft'
                ? 'bg-amber-100 text-amber-700'
                : (inputs.status ?? 'active') === 'archived'
                ? 'bg-ios-gray-200 text-ios-gray-500'
                : 'bg-green-100 text-green-700'
            }`}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          {/* Lock button */}
          <LockButton
            isLocked={!!activeProject.inputs.isLocked}
            onToggle={() => dispatch({ type: 'TOGGLE_LOCK', id: activeProject.id })}
          />
          {/* Save button */}
          <button
            onClick={handleSaveAndGenerate}
            disabled={!isFormComplete}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm min-h-[44px] transition-colors ${
              isFormComplete
                ? saved
                  ? 'bg-green-100 text-green-800'
                  : 'bg-teal-600 text-white active:opacity-80 lg:hover:opacity-90'
                : 'bg-ios-gray-100 text-ios-gray-500'
            }`}
          >
            {saved ? 'Saved ✓' : 'Save & Plan'}
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Section: Client Info */}
        <SectionHeader
          title="Client Info"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
            </svg>
          }
        />
        <Card className="p-4 space-y-4">
          <FormField label="Client Name" required>
            <input
              type="text"
              value={inputs.clientName}
              onChange={(e) => update('clientName', e.target.value)}
              placeholder="Client name"
              className={inputClass()}
            />
          </FormField>
          <FormField label="Project Name">
            <input
              type="text"
              value={inputs.projectName}
              onChange={(e) => update('projectName', e.target.value)}
              placeholder="Optional project name"
              className={inputClass()}
            />
          </FormField>
          <FormField label="Community" required>
            <SelectField
              value={inputs.community}
              onChange={(v) => update('community', v)}
              options={state.communities}
            />
          </FormField>
          <FormField label="Move Type" required>
            <SelectField
              value={inputs.moveType}
              onChange={(v) => update('moveType', v as MoveType)}
              options={state.lists.find(l => l.id === 'move-types')?.items ?? []}
            />
          </FormField>
          {/*
            Who owns the job. The scheduler assigns a PM per shift and that can
            change day to day; this is the one name the client and the community
            deal with, so it's set here and not derived from the schedule.
          */}
          <FormField
            label="Project Manager"
            hint={pmCandidates.length === 0 ? 'No one on the team carries a PM role yet — set one in Settings.' : undefined}
          >
            <SelectField
              value={inputs.projectManagerId ?? ''}
              onChange={(v) => update('projectManagerId', v || null)}
              options={[{ value: '', label: 'Unassigned' }, ...pmCandidates.map((m) => ({ value: m.id, label: m.name }))]}
            />
          </FormField>
          <FormField label="Origin Address" hint="Where the move starts">
            <input
              type="text"
              value={inputs.originAddress ?? ''}
              onChange={(e) => update('originAddress', e.target.value)}
              placeholder="Street, city, unit"
              className={inputClass()}
            />
          </FormField>
          <FormField label="Destination Address" hint="Where the move ends">
            <input
              type="text"
              value={inputs.destinationAddress ?? ''}
              onChange={(e) => update('destinationAddress', e.target.value)}
              placeholder="Street, city, unit"
              className={inputClass()}
            />
          </FormField>
        </Card>

        {/* Section: Dates */}
        <SectionHeader
          title="Dates"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
            </svg>
          }
        />
        <Card className="p-4 space-y-4">
          <FormField label="Earliest Start Date" required hint="First visit / planning session">
            <input
              type="date"
              value={inputs.earliestStartDate}
              onChange={(e) => update('earliestStartDate', e.target.value)}
              className={inputClass(!inputs.earliestStartDate)}
            />
          </FormField>
          <FormField label="Target Move Date" required>
            <input
              type="date"
              value={inputs.targetMoveDate}
              onChange={(e) => update('targetMoveDate', e.target.value)}
              className={inputClass(!inputs.targetMoveDate)}
            />
          </FormField>
          <FormField label="Hard Deadline">
            <input
              type="date"
              value={inputs.hardDeadline}
              onChange={(e) => update('hardDeadline', e.target.value)}
              className={inputClass()}
            />
          </FormField>
          <FormField label="Flexibility Level">
            <SelectField
              value={inputs.flexibilityLevel}
              onChange={(v) => update('flexibilityLevel', v as FlexibilityLevel)}
              options={state.lists.find(l => l.id === 'flexibility')?.items ?? ['Low', 'Medium', 'High']}
            />
          </FormField>
        </Card>

        {/* Section: Budget & Preferences */}
        <SectionHeader
          title="Budget & Preferences"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.615z" />
              <path fillRule="evenodd" d="M9.99 2C5.58 2 2 5.58 2 9.99s3.58 7.99 7.99 7.99 7.99-3.58 7.99-7.99S14.4 2 9.99 2zM9.25 4.25v.426a2.716 2.716 0 00-1.543.848c-.498.583-.707 1.355-.707 2.064 0 .553.13 1.14.514 1.637.386.498.96.852 1.736 1.073v3.12c-.654-.129-1.2-.491-1.539-.882a.75.75 0 00-1.122.996c.574.649 1.43 1.147 2.661 1.244v.5a.75.75 0 001.5 0v-.522a2.986 2.986 0 001.686-.945 2.786 2.786 0 00.672-1.858c0-.636-.175-1.264-.6-1.77-.426-.508-1.062-.84-1.757-1.01V6.344c.371.095.68.277.888.483a.75.75 0 001.072-1.05 3.26 3.26 0 00-1.96-.954V4.25a.75.75 0 00-1.5 0z" clipRule="evenodd" />
            </svg>
          }
        />
        <Card className="p-4 space-y-4">
          <FormField label="Budgeted Man Hours" required>
            <input
              type="number"
              inputMode="numeric"
              value={inputs.budgetedManHours || ''}
              onChange={(e) => update('budgetedManHours', parseFloat(e.target.value) || 0)}
              placeholder="e.g. 149"
              className={inputClass(!inputs.budgetedManHours)}
            />
          </FormField>
          <FormField label="Client Time Preference">
            <div className="flex rounded-xl border border-ios-gray-300 overflow-hidden min-h-[44px]">
              {(['AM', 'PM'] as TimePreference[]).map((pref) => (
                <button
                  key={pref}
                  onClick={() => update('clientTimePreference', pref)}
                  className={`flex-1 font-semibold text-sm transition-colors ${
                    inputs.clientTimePreference === pref
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-teal-700'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Special Notes">
            <textarea
              value={inputs.specialNotes}
              onChange={(e) => update('specialNotes', e.target.value)}
              placeholder="Any special notes or requirements..."
              rows={3}
              className={`${inputClass()} resize-none`}
            />
          </FormField>
        </Card>

        {/* Section: Services Contracted */}
        <SectionHeader
          title="Services Contracted"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v11.5A2.25 2.25 0 0115.75 18H4.25A2.25 2.25 0 012 15.75V4.25zm11.28 3.22a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06L8.75 10.94l3.47-3.47a.75.75 0 011.06 0z" clipRule="evenodd" />
            </svg>
          }
        />
        <Card className="p-4 space-y-2">
          {contractedServices.length > 0 && (
            <p className="text-xs text-ios-gray-600 pb-1">
              {contractedServices.length} service{contractedServices.length === 1 ? '' : 's'} contracted
            </p>
          )}
          {SERVICE_CATALOG.map(({ category, services }) => (
            <ServiceCategoryGroup
              key={category}
              category={category}
              services={services}
              selected={contractedServices}
              onToggleService={toggleService}
            />
          ))}
        </Card>

        {/* Section: Cleanout */}
        <SectionHeader
          title="Cleanout"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
          }
        />
        <Card className="p-4 space-y-4">
          {/* Cleanout Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between min-h-[44px]">
              <div>
                <p className="font-medium text-teal-900">Cleanout</p>
                <p className="text-xs text-ios-gray-600">Post-move cleanout service</p>
              </div>
              <button
                onClick={() =>
                  update('cleanout', { ...inputs.cleanout, enabled: !inputs.cleanout.enabled })
                }
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  inputs.cleanout.enabled ? 'bg-teal-600' : 'bg-ios-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    inputs.cleanout.enabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {inputs.cleanout.enabled && (
              <div className="space-y-3 pl-2 border-l-2 border-teal-200">
                <FormField label="Cleanout Type">
                  <SelectField
                    value={inputs.cleanout.type || ''}
                    onChange={(v) => {
                      const isAuction = v === 'Full - Auction';
                      setInputs((prev) => prev ? {
                        ...prev,
                        cleanout: { ...prev.cleanout, type: v },
                        auction: isAuction ? { enabled: true } : prev.auction,
                      } : prev);
                      setSaved(false);
                    }}
                    options={[...CLEANOUT_TYPES]}
                    placeholder="Select type…"
                  />
                </FormField>
                {inputs.cleanout.type === 'Full - Auction' && (() => {
                  const { hourlyRate, performanceLevel } = state.auctionSettings;
                  const minPerLot = { High: 13, Average: 18, Low: 25 }[performanceLevel];
                  const lotCount = inputs.auction.lotCount ?? 0;
                  const estHours = lotCount > 0 ? Math.round(lotCount * minPerLot / 60 * 10) / 10 : null;
                  const estCost = estHours !== null ? Math.round(estHours * hourlyRate) : null;
                  return (
                    <div className="space-y-3">
                      <p className="text-xs text-teal-600 font-medium">
                        Auction scheduling will be automatically added.
                      </p>
                      <FormField label="Lot Count" hint="Number of auction lots">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={inputs.auction.lotCount || ''}
                          onChange={(e) => update('auction', { ...inputs.auction, lotCount: parseInt(e.target.value) || 0 })}
                          placeholder="e.g. 150"
                          className={inputClass()}
                        />
                      </FormField>
                      {estHours !== null && (
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-1.5">
                          <p className="text-[11px] font-bold text-teal-600 uppercase tracking-wide">Labor Estimate</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-ios-gray-600">Performance</span>
                            <span className="text-xs font-semibold text-teal-900">{performanceLevel} · {minPerLot} min/lot</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-ios-gray-600">Est. Hours</span>
                            <span className="text-xs font-bold text-teal-900">{estHours} hrs</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-teal-200 pt-1.5 mt-1">
                            <span className="text-xs text-ios-gray-600">Labor Value</span>
                            <span className="text-sm font-bold text-teal-700">${estCost?.toLocaleString()} <span className="text-xs font-normal text-ios-gray-500">@ ${hourlyRate}/hr</span></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <FormField label="Start Date" hint="Leave blank to auto-calculate (2 workdays after move)">
                  <input
                    type="date"
                    value={inputs.cleanout.startDate}
                    onChange={(e) =>
                      update('cleanout', { ...inputs.cleanout, startDate: e.target.value })
                    }
                    className={inputClass()}
                  />
                </FormField>
              </div>
            )}
          </div>

        </Card>

        {/* Section: Schedule Overrides */}
        <SectionHeader
          title="Schedule Overrides"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
            </svg>
          }
        />
        <Card className="p-4 space-y-3">
          <p className="text-sm text-ios-gray-600">
            Override the shift for a specific date (e.g. client only available in PM that day).
          </p>

          {inputs.dateOverrides.map((override) => (
            <div key={override.id} className="p-3 bg-ios-gray-100 rounded-xl space-y-2">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={override.date}
                  onChange={(e) => updateOverride(override.id, 'date', e.target.value)}
                  className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <SelectField
                  value={override.shift}
                  onChange={(v) => updateOverride(override.id, 'shift', v)}
                  options={['AM', 'PM', 'Full Day', 'Unavailable']}
                  className="flex-1"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={override.reason}
                  onChange={(e) => updateOverride(override.id, 'reason', e.target.value)}
                  placeholder="Reason (optional)"
                  className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  onClick={() => removeOverride(override.id)}
                  className="w-11 h-11 flex items-center justify-center text-red-500 bg-red-50 rounded-xl"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addDateOverride}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-ios-gray-300 rounded-xl py-3 text-sm font-medium text-ios-gray-600 active:opacity-70 lg:hover:opacity-80 min-h-[44px]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Date Override
          </button>
        </Card>

        {/* Bottom action */}
        <div className="mt-6">
          <button
            onClick={handleSaveAndGenerate}
            disabled={!isFormComplete}
            className={`w-full py-4 rounded-2xl font-bold text-base min-h-[56px] transition-colors ${
              isFormComplete
                ? 'bg-teal-600 text-white active:opacity-80 lg:hover:opacity-90'
                : 'bg-ios-gray-200 text-ios-gray-500'
            }`}
          >
            {saved ? 'Schedule Generated ✓' : 'Save & Generate Schedule'}
          </button>
          {!isFormComplete && (
            <p className="text-center text-xs text-ios-gray-600 mt-2">
              Fill in Client Name, Dates, and Budgeted Hours to generate
            </p>
          )}
        </div>
        {!saved && <FloatingSaveSpacer />}
      </div>

      {!saved && <FloatingSaveButton onSave={handleSaveAndGenerate} label="Save & Generate" />}

      {/*
        Save Prompt Modal. The backdrop and the dialog have to be ordered
        deliberately: a backdrop above the dialog dims it and eats every tap.
      */}
      {showSavePrompt && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setShowSavePrompt(false)} />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[61] bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="font-bold text-teal-900 text-lg mb-1">Generate Schedule</h3>
            <p className="text-sm text-ios-gray-600 mb-5">
              There are {otherActiveUnlocked.length} other active project{otherActiveUnlocked.length > 1 ? 's' : ''}. Would you like to regenerate their schedules to resolve any new conflicts?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { saveAndGenerate(true); setShowSavePrompt(false); }}
                className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold"
              >
                Update All Active Projects
              </button>
              <button
                onClick={() => { saveAndGenerate(false); setShowSavePrompt(false); }}
                className="w-full py-3 rounded-xl border border-ios-gray-300 text-teal-900 font-semibold"
              >
                This Project Only
              </button>
              <button
                onClick={() => setShowSavePrompt(false)}
                className="w-full py-2 text-sm text-ios-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
