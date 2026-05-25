import React, { useState, useEffect } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { FormField } from '../components/FormField';
import { SelectField } from '../components/SelectField';
import { HamburgerButton } from '../components/HamburgerMenu';
import type { ProjectInputs, DateOverride, FlexibilityLevel, DensityLevel, TimePreference, MoveType } from '../types';

function inputClass(hasError?: boolean) {
  return `w-full min-h-[44px] rounded-xl border ${hasError ? 'border-red-400' : 'border-ios-gray-300'} bg-white px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500`;
}

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
}

function SectionHeader({ title, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-2">
      <span className="text-indigo-600">{icon}</span>
      <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-600">{title}</h2>
    </div>
  );
}

export function InputFormPage() {
  const { dispatch, activeProject, generateAndSaveSchedule, state } = useApp();
  const [inputs, setInputs] = useState<ProjectInputs | null>(null);
  const [saved, setSaved] = useState(false);

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
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-400">
            <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32L19.513 8.2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">No Project Selected</h2>
          <p className="text-ios-gray-600 text-sm">Go to Projects tab and select or create a project.</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'projects' })}
          className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px] active:opacity-80"
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

  function handleSaveAndGenerate() {
    if (!inputs || !activeProject) return;
    dispatch({ type: 'UPDATE_PROJECT', id: activeProject.id, inputs });
    // After dispatch, regenerate schedule
    setTimeout(() => {
      generateAndSaveSchedule(activeProject.id);
      setSaved(true);
    }, 50);
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
          <HamburgerButton />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">
              {inputs.clientName || 'New Project'}
            </h1>
            {inputs.clientName && (
              <p className="text-xs text-ios-gray-600 truncate">{inputs.community}</p>
            )}
          </div>
          <button
            onClick={handleSaveAndGenerate}
            disabled={!isFormComplete}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm min-h-[44px] transition-colors ${
              isFormComplete
                ? saved
                  ? 'bg-green-100 text-green-800'
                  : 'bg-indigo-600 text-white active:opacity-80'
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
              placeholder="e.g. Jim Doyle"
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
              options={state.moveTypes}
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
          <FormField label="Target Move Date" required>
            <input
              type="date"
              value={inputs.targetMoveDate}
              onChange={(e) => update('targetMoveDate', e.target.value)}
              className={inputClass(!inputs.targetMoveDate)}
            />
          </FormField>
          <FormField label="Earliest Start Date" required hint="First visit / planning session">
            <input
              type="date"
              value={inputs.earliestStartDate}
              onChange={(e) => update('earliestStartDate', e.target.value)}
              className={inputClass(!inputs.earliestStartDate)}
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
              options={['Low', 'Medium', 'High']}
            />
          </FormField>
        </Card>

        {/* Section: Property */}
        <SectionHeader
          title="Property Details"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z" clipRule="evenodd" />
            </svg>
          }
        />
        <Card className="p-4 space-y-4">
          <FormField label="Origin Sq Ft (current home)" required>
            <input
              type="number"
              inputMode="numeric"
              value={inputs.originSqFt || ''}
              onChange={(e) => update('originSqFt', parseFloat(e.target.value) || 0)}
              placeholder="e.g. 2738"
              className={inputClass()}
            />
          </FormField>
          <FormField label="Destination Sq Ft (new home)" required>
            <input
              type="number"
              inputMode="numeric"
              value={inputs.destinationSqFt || ''}
              onChange={(e) => update('destinationSqFt', parseFloat(e.target.value) || 0)}
              placeholder="e.g. 858"
              className={inputClass()}
            />
          </FormField>
          <FormField label="Density Level" hint="Describes how packed / full the home is">
            <SelectField
              value={inputs.densityLevel}
              onChange={(v) => update('densityLevel', v as DensityLevel)}
              options={['Light', 'Moderate', 'Heavy']}
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
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-700'
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

        {/* Section: Optional Services */}
        <SectionHeader
          title="Optional Services"
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
                <p className="font-medium text-gray-900">Cleanout</p>
                <p className="text-xs text-ios-gray-600">Post-move cleanout service</p>
              </div>
              <button
                onClick={() =>
                  update('cleanout', { ...inputs.cleanout, enabled: !inputs.cleanout.enabled })
                }
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  inputs.cleanout.enabled ? 'bg-indigo-600' : 'bg-ios-gray-300'
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
              <div className="space-y-3 pl-2 border-l-2 border-indigo-200">
                <FormField label="Cleanout Type">
                  <input
                    type="text"
                    value={inputs.cleanout.type}
                    onChange={(e) =>
                      update('cleanout', { ...inputs.cleanout, type: e.target.value })
                    }
                    placeholder="e.g. Full cleanout, Partial..."
                    className={inputClass()}
                  />
                </FormField>
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

          {/* Auction Toggle */}
          <div className="flex items-center justify-between min-h-[44px]">
            <div>
              <p className="font-medium text-gray-900">Auction</p>
              <p className="text-xs text-ios-gray-600">Include lot organization & auction pickup</p>
            </div>
            <button
              onClick={() =>
                update('auction', { enabled: !inputs.auction.enabled })
              }
              className={`relative w-12 h-7 rounded-full transition-colors ${
                inputs.auction.enabled ? 'bg-indigo-600' : 'bg-ios-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  inputs.auction.enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
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
                  className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="flex-1 min-h-[44px] rounded-xl border border-ios-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-ios-gray-300 rounded-xl py-3 text-sm font-medium text-ios-gray-600 active:opacity-70 min-h-[44px]"
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
                ? 'bg-indigo-600 text-white active:opacity-80'
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
      </div>
    </div>
  );
}
