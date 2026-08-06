import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { HamburgerButton } from '../components/HamburgerMenu';
import { formatDateLabel } from '../lib/dateUtils';
import { buildChecklist, groupByDueDate, DUE_SOON_DAYS } from '../lib/checklist';
import type { ChecklistItem, ChecklistProgress, ChecklistItemStatus } from '../types';

type GroupMode = 'section' | 'date';

// ─── Small pieces ─────────────────────────────────────────────────────────────

const statusStyles: Record<ChecklistItemStatus, { dot: string; text: string; label: string }> = {
  done:        { dot: 'bg-green-500',    text: 'text-ios-gray-400', label: '' },
  overdue:     { dot: 'bg-red-500',      text: 'text-red-600',      label: 'Overdue' },
  'due-soon':  { dot: 'bg-orange-400',   text: 'text-orange-600',   label: 'Due soon' },
  upcoming:    { dot: 'bg-ios-gray-300', text: 'text-ios-gray-500', label: '' },
  unscheduled: { dot: 'bg-ios-gray-300', text: 'text-ios-gray-500', label: 'No date' },
};

function CheckCircle({ done }: { done: boolean }) {
  if (done) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-green-500">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <span className="w-6 h-6 rounded-full border-2 border-ios-gray-300 block" />
  );
}

function ItemRow({
  item,
  showSection,
  hideDate,
  onToggle,
}: {
  item: ChecklistItem;
  /** Show which section the item came from — used in the date-grouped view. */
  showSection?: boolean;
  /** Suppress the row's own date when a group header already shows it. */
  hideDate?: boolean;
  onToggle: () => void;
}) {
  const style = statusStyles[item.status];
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-start gap-3 py-3 text-left active:bg-ios-gray-50 min-h-[44px]"
      aria-pressed={item.done}
    >
      <span className="flex-shrink-0 pt-0.5">
        <CheckCircle done={item.done} />
      </span>
      <span className="flex-1 min-w-0">
        <span
          className={`block text-sm font-medium ${
            item.done ? 'text-ios-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {item.label}
        </span>
        {item.detail && !item.done && (
          <span className="block text-xs text-ios-gray-500 mt-0.5">{item.detail}</span>
        )}
        <span className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
          {!hideDate && (
            <span className={`text-xs ${style.text}`}>
              {item.dueDate ? formatDateLabel(item.dueDate) : 'No date on this job'}
            </span>
          )}
          {!item.done && style.label && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                item.status === 'overdue'
                  ? 'bg-red-100 text-red-700'
                  : item.status === 'due-soon'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-ios-gray-100 text-ios-gray-600'
              }`}
            >
              {style.label}
            </span>
          )}
          {item.owner && (
            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">
              {item.owner}
            </span>
          )}
          {showSection && (
            <span className="text-[10px] text-ios-gray-500">{item.sectionTitle}</span>
          )}
        </span>
      </span>
    </button>
  );
}

function ProgressCard({ progress }: { progress: ChecklistProgress }) {
  const barColor =
    progress.overdue > 0 ? 'bg-red-500' : progress.percent === 100 ? 'bg-green-500' : 'bg-indigo-500';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900">Checklist Progress</h2>
        <span className="text-sm font-semibold text-ios-gray-600">
          {progress.done} / {progress.total}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{progress.percent}%</p>
          <p className="text-xs text-ios-gray-600">Complete</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${progress.overdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {progress.overdue}
          </p>
          <p className="text-xs text-ios-gray-600">Overdue</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${progress.dueSoon > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {progress.dueSoon}
          </p>
          <p className="text-xs text-ios-gray-600">Next {DUE_SOON_DAYS}d</p>
        </div>
      </div>

      <div className="h-2 bg-ios-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ChecklistPage() {
  const { dispatch, activeProject, setChecklistItem, setChecklistItems } = useApp();
  const [groupMode, setGroupMode] = useState<GroupMode>('section');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const checklist = useMemo(() => {
    if (!activeProject) return null;
    return buildChecklist(
      activeProject.inputs,
      activeProject.schedule,
      activeProject.checklist ?? {}
    );
  }, [activeProject]);

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-400">
            <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">No Project Selected</h2>
          <p className="text-ios-gray-600 text-sm">Pick a project to see its checklist.</p>
        </div>
      </div>
    );
  }

  const hasSchedule = Boolean(activeProject.schedule);

  const visible = (items: ChecklistItem[]) =>
    hideCompleted ? items.filter((i) => !i.done) : items;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <HamburgerButton />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">Checklist</h1>
            <p className="text-xs text-ios-gray-600 truncate">
              {activeProject.inputs.clientName || 'Untitled Project'}
              {activeProject.inputs.community ? ` · ${activeProject.inputs.community}` : ''}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-ios-gray-100 rounded-lg p-0.5">
            {(['section', 'date'] as GroupMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  groupMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-ios-gray-600'
                }`}
              >
                {mode === 'section' ? 'By Section' : 'By Date'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setHideCompleted((v) => !v)}
            className={`ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              hideCompleted
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-ios-gray-200 text-ios-gray-600'
            }`}
          >
            {hideCompleted ? 'Showing open' : 'Hide done'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasSchedule && (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <p className="text-sm font-semibold text-amber-900 mb-1">Plan not generated yet</p>
            <p className="text-xs text-amber-800 mb-3">
              Due dates come from the move plan. Generate the plan and every date below fills in.
            </p>
            <button
              onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'plan' })}
              className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold min-h-[36px]"
            >
              Go to Plan
            </button>
          </Card>
        )}

        {checklist && <ProgressCard progress={checklist.progress} />}

        {checklist && groupMode === 'section' &&
          checklist.sections.map((section) => {
            const items = visible(section.items);
            if (items.length === 0) return null;
            const isCollapsed = collapsed[section.id] ?? false;
            const allDone = section.doneCount === section.items.length;
            const openIds = section.items.filter((i) => !i.done).map((i) => i.id);

            return (
              <Card key={section.id} className="overflow-hidden">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !isCollapsed }))}
                  className="w-full px-4 py-3 flex items-center gap-3 min-h-[48px] text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-gray-900 truncate">{section.title}</h2>
                      {section.overdueCount > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex-shrink-0">
                          {section.overdueCount} late
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ios-gray-500 mt-0.5">
                      {section.doneCount} of {section.items.length} done
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                      allDone ? 'bg-green-100 text-green-700' : 'bg-ios-gray-100 text-ios-gray-600'
                    }`}
                  >
                    {Math.round((section.doneCount / section.items.length) * 100)}%
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {!isCollapsed && (
                  <div className="px-4 pb-3 divide-y divide-ios-gray-100 border-t border-ios-gray-100">
                    {section.description && (
                      <p className="text-xs text-ios-gray-500 py-2">{section.description}</p>
                    )}
                    {items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onToggle={() => setChecklistItem(activeProject.id, item.id, !item.done)}
                      />
                    ))}
                    {openIds.length > 0 && (
                      <div className="pt-2">
                        <button
                          onClick={() => setChecklistItems(activeProject.id, openIds, true)}
                          className="text-xs font-semibold text-indigo-600 py-2 min-h-[36px]"
                        >
                          Mark all {openIds.length} remaining done
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

        {checklist && groupMode === 'date' &&
          groupByDueDate(visible(checklist.items)).map((group) => (
            <Card key={group.date ?? 'unscheduled'} className="overflow-hidden">
              <div className="px-4 py-2.5 bg-ios-gray-50 border-b border-ios-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-sm">
                  {group.date ? formatDateLabel(group.date) : 'No date on this job'}
                </h2>
                <span className="text-xs text-ios-gray-500">{group.items.length}</span>
              </div>
              <div className="px-4 pb-2 divide-y divide-ios-gray-100">
                {group.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    showSection
                    hideDate
                    onToggle={() => setChecklistItem(activeProject.id, item.id, !item.done)}
                  />
                ))}
              </div>
            </Card>
          ))}

        {checklist && checklist.items.length === 0 && (
          <p className="text-center text-sm text-ios-gray-500 py-8">
            No checklist items apply to this job type.
          </p>
        )}

        {checklist && hideCompleted && checklist.progress.done === checklist.progress.total && checklist.progress.total > 0 && (
          <p className="text-center text-sm text-green-700 font-semibold py-8">
            Everything is checked off.
          </p>
        )}
      </div>
    </div>
  );
}
