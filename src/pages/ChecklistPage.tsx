import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { HamburgerButton } from '../components/HamburgerMenu';
import { buildChecklist, checklistToText } from '../lib/checklist';
import { CHECKLIST_STANDING_NOTE } from '../lib/checklistTemplate';
import { formatDateLabel } from '../lib/dateUtils';
import type { ChecklistItem, ChecklistItemStatus, ChecklistSection, ChecklistSummary } from '../types';

type FilterMode = 'all' | 'open' | 'overdue' | 'done';

const FILTERS: { id: FilterMode; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'done', label: 'Done' },
];

const STATUS_STYLES: Record<ChecklistItemStatus, { chip: string; label: (date: string) => string }> = {
  complete:    { chip: 'bg-ios-gray-100 text-ios-gray-600', label: (d) => d },
  overdue:     { chip: 'bg-red-100 text-red-700',           label: (d) => d },
  today:       { chip: 'bg-indigo-100 text-indigo-700',     label: (d) => `Today · ${d}` },
  upcoming:    { chip: 'bg-amber-100 text-amber-700',       label: (d) => d },
  scheduled:   { chip: 'bg-ios-gray-100 text-ios-gray-600', label: (d) => d },
  unscheduled: { chip: 'bg-ios-gray-100 text-ios-gray-500', label: () => 'No date' },
};

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ios-gray-400 flex-shrink-0">
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

export function ChecklistPage() {
  const {
    state,
    dispatch,
    activeProject,
    generateAndSaveSchedule,
    getChecklistState,
    toggleChecklistItem,
    setChecklistLongDistance,
    resetChecklist,
  } = useApp();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const checklistState = activeProject ? getChecklistState(activeProject.id) : null;

  const summary = useMemo<ChecklistSummary | null>(
    () => (activeProject && checklistState ? buildChecklist(activeProject, checklistState) : null),
    [activeProject, checklistState]
  );

  if (!activeProject) {
    return (
      <EmptyState
        title="No Project Selected"
        message="Select a project from the menu to see its checklist."
        actionLabel="Go to Projects"
        onAction={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'projects' })}
      />
    );
  }

  function toggleSection(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function matchesFilter(item: ChecklistItem): boolean {
    if (filter === 'all') return true;
    if (filter === 'done') return item.done;
    if (filter === 'open') return !item.done;
    return item.status === 'overdue';
  }

  const visibleSections: ChecklistSection[] = (summary?.sections ?? [])
    .map((section) => ({ ...section, items: section.items.filter(matchesFilter) }))
    .filter((section) => section.items.length > 0);

  async function copyAsText() {
    if (!activeProject || !summary) return;
    try {
      await navigator.clipboard.writeText(checklistToText(activeProject, summary));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center gap-2">
          <HamburgerButton />
          <div className="flex-1 min-w-0 relative">
            <button onClick={() => setPickerOpen((o) => !o)} className="flex items-center gap-1 min-w-0 max-w-full">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 leading-tight truncate text-left">
                  {activeProject.inputs.clientName || 'Checklist'}
                </h1>
                <p className="text-xs text-ios-gray-600 truncate text-left">PM Checklist</p>
              </div>
              <ChevronDownIcon />
            </button>
            {pickerOpen && (
              <div className="absolute top-full left-0 z-30 mt-1 bg-white rounded-xl shadow-lg border border-ios-gray-200 w-[260px] max-h-[280px] overflow-y-auto">
                {state.projects
                  .filter((p) => (p.inputs.status ?? 'active') !== 'archived')
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        dispatch({ type: 'SET_ACTIVE_PROJECT', id: p.id });
                        setPickerOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-left border-b border-ios-gray-100 last:border-0 ${
                        p.id === activeProject.id ? 'bg-indigo-50' : 'active:bg-ios-gray-50'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          p.id === activeProject.id ? 'bg-indigo-600' : 'bg-ios-gray-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            p.id === activeProject.id ? 'text-indigo-700' : 'text-gray-900'
                          }`}
                        >
                          {p.inputs.clientName || 'Untitled'}
                        </p>
                        <p className="text-xs text-ios-gray-500 truncate">{p.inputs.community}</p>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!summary ? (
          <EmptyState
            title="No Plan Yet"
            message="Checklist due dates come from the move plan. Generate the plan to build this project's checklist."
            actionLabel="Generate Plan"
            onAction={() => generateAndSaveSchedule(activeProject!.id)}
            inline
          />
        ) : (
          <>
            <ProgressCard summary={summary} />

            <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-indigo-900 leading-relaxed">{CHECKLIST_STANDING_NOTE}</p>
            </div>

            {/* Long distance toggle */}
            <Card className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">Outbound long distance move</p>
                <p className="text-xs text-ios-gray-600">Adds the long distance packing and destination handoff steps.</p>
              </div>
              <button
                onClick={() => setChecklistLongDistance(activeProject!.id, !checklistState!.longDistance)}
                role="switch"
                aria-checked={checklistState!.longDistance}
                aria-label="Outbound long distance move"
                className={`w-12 h-7 rounded-full flex-shrink-0 transition-colors relative ${
                  checklistState!.longDistance ? 'bg-indigo-600' : 'bg-ios-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                    checklistState!.longDistance ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </Card>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
              {FILTERS.map((f) => {
                const isActive = filter === f.id;
                const count =
                  f.id === 'all'
                    ? summary.totalItems
                    : f.id === 'done'
                    ? summary.doneItems
                    : f.id === 'overdue'
                    ? summary.overdueItems
                    : summary.totalItems - summary.doneItems;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold min-h-[32px] border transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-ios-gray-600 border-ios-gray-200'
                    }`}
                  >
                    {f.label} · {count}
                  </button>
                );
              })}
            </div>

            {visibleSections.length === 0 ? (
              <p className="text-center text-sm text-ios-gray-600 py-8">Nothing matches this filter.</p>
            ) : (
              visibleSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  collapsed={collapsed.has(section.id)}
                  onToggleCollapse={() => toggleSection(section.id)}
                  onToggleItem={(itemId) => toggleChecklistItem(activeProject!.id, itemId)}
                />
              ))
            )}

            {/* Footer actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={copyAsText}
                className="flex-1 px-4 py-2.5 border border-indigo-600 text-indigo-600 rounded-xl font-semibold text-sm min-h-[44px]"
              >
                {copied ? 'Copied' : 'Copy as Text'}
              </button>
              <button
                onClick={() => {
                  if (confirm('Clear every check on this checklist?')) resetChecklist(activeProject!.id);
                }}
                className="flex-1 px-4 py-2.5 border border-ios-gray-300 text-ios-gray-600 rounded-xl font-semibold text-sm min-h-[44px]"
              >
                Reset Checks
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProgressCard({ summary }: { summary: ChecklistSummary }) {
  const pct = Math.round(summary.percentComplete);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900">Progress</h2>
        {summary.overdueItems > 0 ? (
          <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            {summary.overdueItems} overdue
          </span>
        ) : (
          <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">On track</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.doneItems}</p>
          <p className="text-xs text-ios-gray-600">Done</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.totalItems - summary.doneItems}</p>
          <p className="text-xs text-ios-gray-600">Open</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${summary.overdueItems > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {summary.overdueItems}
          </p>
          <p className="text-xs text-ios-gray-600">Overdue</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-ios-gray-600">
          <span>Complete</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-ios-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>

      {summary.nextDue && (
        <div className="mt-4 pt-3 border-t border-ios-gray-100">
          <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1">Next Up</p>
          <p className="text-sm text-gray-900 leading-snug">{summary.nextDue.text}</p>
          <p className="text-xs text-ios-gray-500 mt-0.5">
            {summary.nextDue.dueDate ? formatDateLabel(summary.nextDue.dueDate) : 'No date'}
          </p>
        </div>
      )}
    </Card>
  );
}

function SectionCard({
  section,
  collapsed,
  onToggleCollapse,
  onToggleItem,
}: {
  section: ChecklistSection;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onToggleItem: (itemId: string) => void;
}) {
  const allDone = section.doneCount === section.items.length;

  return (
    <Card className="overflow-hidden">
      <button onClick={onToggleCollapse} className="w-full px-4 py-3 flex items-start gap-3 text-left min-h-[56px]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-bold text-gray-900">{section.name}</h2>
            {section.overdueCount > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                {section.overdueCount} overdue
              </span>
            )}
            {allDone && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-100 text-green-800">
                Done
              </span>
            )}
          </div>
          <p className="text-xs text-ios-gray-600 mt-0.5">
            {section.dueDate ? formatDateLabel(section.dueDate) : 'Not scheduled'} · {section.owner}
          </p>
          {section.note && <p className="text-xs text-ios-gray-500 mt-0.5 italic">{section.note}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <span className="text-xs font-semibold text-ios-gray-600">
            {section.doneCount}/{section.items.length}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-5 h-5 text-ios-gray-500 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-3">
          {section.items.map((item, i) => (
            <ItemRow
              key={item.id}
              item={item}
              isLast={i === section.items.length - 1}
              onToggle={() => onToggleItem(item.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function ItemRow({ item, isLast, onToggle }: { item: ChecklistItem; isLast: boolean; onToggle: () => void }) {
  const style = STATUS_STYLES[item.status];
  const dueLabel = item.dueDate ? style.label(formatDateLabel(item.dueDate)) : 'No date';

  return (
    <div className={`flex items-start gap-3 py-3 ${isLast ? '' : 'border-b border-ios-gray-100'}`}>
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.text}
        className={`w-6 h-6 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          item.done ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-ios-gray-300'
        }`}
      >
        {item.done && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${item.done ? 'text-ios-gray-500 line-through' : 'text-gray-900'}`}>
          {item.text}
        </p>
        {item.subItems && item.subItems.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {item.subItems.map((sub) => (
              <li key={sub} className="text-xs text-ios-gray-600 leading-snug pl-3 relative">
                <span className="absolute left-0 top-1.5 w-1 h-1 rounded-full bg-ios-gray-400" />
                {sub}
              </li>
            ))}
          </ul>
        )}
        <span className={`inline-flex mt-1.5 items-center rounded-full font-semibold text-[10px] px-2 py-0.5 ${style.chip}`}>
          {dueLabel}
        </span>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  inline = false,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  inline?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center gap-4 px-6 ${inline ? 'py-12' : 'justify-center h-full'}`}>
      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-400">
          <path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{title}</h2>
        <p className="text-ios-gray-600 text-sm">{message}</p>
      </div>
      <button onClick={onAction} className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]">
        {actionLabel}
      </button>
    </div>
  );
}
