import { useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { Card } from '../components/Card';
import { formatDateLabel } from '../lib/dateUtils';
import {
  buildChecklistView,
  groupByDueDate,
  checklistToText,
  type ChecklistItemView,
  type ChecklistItemStatus,
  type ChecklistView,
} from '../lib/checklist';
import { ANCHOR_LABELS, CHECKLIST_OWNERS, CHECKLIST_STANDING_NOTE } from '../lib/checklistData';
import type { ChecklistAnchor, ChecklistOwner } from '../types';

type Filter = 'all' | 'open' | 'overdue' | 'done';
type Grouping = 'section' | 'date';

// ─── Status styling ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<ChecklistItemStatus, { label: string; chip: string; text: string }> = {
  'done':      { label: 'Done',     chip: 'bg-green-100 text-green-700',   text: 'text-ios-gray-400' },
  'overdue':   { label: 'Overdue',  chip: 'bg-red-100 text-red-700',       text: 'text-red-600' },
  'due-today': { label: 'Today',    chip: 'bg-amber-100 text-amber-800',   text: 'text-amber-700' },
  'due-soon':  { label: '',         chip: '',                              text: 'text-amber-700' },
  'upcoming':  { label: '',         chip: '',                              text: 'text-ios-gray-500' },
  'no-date':   { label: 'No date',  chip: 'bg-ios-gray-100 text-ios-gray-600', text: 'text-ios-gray-400' },
};

const OWNER_STYLES: Record<ChecklistOwner, string> = {
  'Dir. Bus. Dev': 'bg-purple-50 text-purple-700',
  'Dir. Ops':      'bg-indigo-50 text-indigo-700',
  'PM':            'bg-blue-50 text-blue-700',
  'Specialist':    'bg-green-50 text-green-700',
  'Movers':        'bg-orange-50 text-orange-700',
  'Client':        'bg-teal-50 text-teal-700',
  'Community':     'bg-pink-50 text-pink-700',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ChecklistPage() {
  const {
    state,
    dispatch,
    activeProject,
    generateAndSaveSchedule,
    toggleChecklistItem,
    restoreChecklistItems,
    resetChecklistProgress,
  } = useApp();

  const [filter, setFilter] = useState<Filter>('open');
  const [grouping, setGrouping] = useState<Grouping>('section');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [detailItem, setDetailItem] = useState<ChecklistItemView | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Recomputed whenever the plan, the template, or stored progress changes —
  // due dates always track the current schedule.
  const view: ChecklistView | null = useMemo(
    () => (activeProject ? buildChecklistView(activeProject, state.checklistTemplate) : null),
    [activeProject, state.checklistTemplate]
  );

  if (!activeProject || !view) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">No Project Selected</h2>
          <p className="text-ios-gray-600 text-sm">Pick a project to see its checklist.</p>
        </div>
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'inputs' })}
          className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-semibold min-h-[44px]"
        >
          Go to Projects
        </button>
      </div>
    );
  }

  const hiddenCount = activeProject.checklist?.excludedItemIds?.length ?? 0;

  function matchesFilter(item: ChecklistItemView): boolean {
    switch (filter) {
      case 'open':    return !item.done;
      case 'overdue': return item.status === 'overdue';
      case 'done':    return item.done;
      default:        return true;
    }
  }

  async function copyChecklist() {
    if (!activeProject || !view) return;
    try {
      await navigator.clipboard.writeText(checklistToText(activeProject, view));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context) — nothing useful to do.
    }
  }

  const dateGroups = grouping === 'date' ? groupByDueDate(view) : [];

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className="sticky top-0 z-10 bg-white border-b border-ios-gray-200 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 12px)', paddingBottom: '12px' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold text-gray-900 leading-tight truncate">Checklist</h1>
              <p className="text-xs text-ios-gray-600 truncate">
                {activeProject.inputs.clientName || 'Untitled'}
                {activeProject.inputs.community ? ` · ${activeProject.inputs.community}` : ''}
              </p>
            </div>
            <button
              onClick={copyChecklist}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-ios-gray-600 active:bg-ios-gray-100 flex-shrink-0"
              aria-label="Copy checklist as text"
            >
              {copied ? (
                <CheckIcon className="w-5 h-5 text-green-600" />
              ) : (
                <CopyIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
            {([
              ['open', `Open ${view.total - view.completed}`],
              ['overdue', `Overdue ${view.overdueCount}`],
              ['done', `Done ${view.completed}`],
              ['all', `All ${view.total}`],
            ] as [Filter, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-ios-gray-100 text-ios-gray-600 active:bg-ios-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="w-px bg-ios-gray-200 mx-0.5 flex-shrink-0" />
            <button
              onClick={() => setGrouping(grouping === 'section' ? 'date' : 'section')}
              className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-ios-gray-100 text-ios-gray-600 active:bg-ios-gray-200 flex items-center gap-1"
            >
              {grouping === 'section' ? 'By Section' : 'By Date'}
              <SwapIcon className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <ProgressCard view={view} />

          {/* Standing instruction from the head of the PM Checklist */}
          <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100">
            <InfoIcon className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-900 leading-snug">{CHECKLIST_STANDING_NOTE}</p>
          </div>

          {view.isUndated && (
            <button
              onClick={() => generateAndSaveSchedule(activeProject.id)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-left active:bg-amber-100"
            >
              <InfoIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-900">Plan not generated</p>
                <p className="text-xs text-amber-700">
                  Due dates come from the move plan. Tap to generate it.
                </p>
              </div>
            </button>
          )}

          {view.total === 0 ? (
            <EmptyState onEdit={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'settings' })} />
          ) : grouping === 'section' ? (
            view.sections.map((section) => {
              const items = section.items.filter(matchesFilter);
              if (items.length === 0) return null;
              const isCollapsed = collapsed[section.id] ?? false;
              return (
                <Card key={section.id} className="overflow-hidden">
                  <button
                    onClick={() => setCollapsed((c) => ({ ...c, [section.id]: !isCollapsed }))}
                    className="w-full px-4 py-3 flex items-center gap-3 min-h-[52px] text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-gray-900 text-sm truncate">{section.name}</h2>
                        {section.overdueCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex-shrink-0">
                            {section.overdueCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ios-gray-500">
                        {section.completed}/{section.total} complete
                        {section.nextDueDate && ` · next ${formatDateLabel(section.nextDueDate)}`}
                      </p>
                    </div>
                    <SectionRing completed={section.completed} total={section.total} />
                    <ChevronIcon
                      className={`w-5 h-5 text-ios-gray-400 flex-shrink-0 transition-transform ${
                        isCollapsed ? '' : 'rotate-180'
                      }`}
                    />
                  </button>

                  {!isCollapsed && (
                    <div className="border-t border-ios-gray-100">
                      {section.groups.map((group, gi) => {
                        const groupItems = group.items.filter(matchesFilter);
                        if (groupItems.length === 0) return null;
                        return (
                          <div key={group.name ?? `g-${gi}`}>
                            {group.name && (
                              <div className="px-4 py-1.5 bg-ios-gray-50 border-b border-ios-gray-100">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-ios-gray-500">
                                  {group.name}
                                </p>
                              </div>
                            )}
                            {groupItems.map((item) => (
                              <ItemRow
                                key={item.id}
                                item={item}
                                onToggle={() => toggleChecklistItem(activeProject.id, item.id)}
                                onOpen={() => setDetailItem(item)}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          ) : (
            dateGroups.map((group, gi) => {
              const items = group.items.filter(matchesFilter);
              if (items.length === 0) return null;
              return (
                <Card key={group.date ?? `undated-${gi}`} className="overflow-hidden">
                  <div className="px-4 py-2.5 bg-ios-gray-50 border-b border-ios-gray-100 flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 text-sm">
                      {group.date ? formatDateLabel(group.date) : 'No date'}
                    </h2>
                    <span className="text-xs text-ios-gray-500">{items.length}</span>
                  </div>
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      showSection
                      onToggle={() => toggleChecklistItem(activeProject.id, item.id)}
                      onOpen={() => setDetailItem(item)}
                    />
                  ))}
                </Card>
              );
            })
          )}

          {/* Footer actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setAddOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-indigo-600 text-indigo-600 font-semibold text-sm min-h-[44px] active:bg-indigo-50"
            >
              <PlusIcon className="w-4 h-4" />
              Add Item
            </button>
            {hiddenCount > 0 && (
              <button
                onClick={() => restoreChecklistItems(activeProject.id)}
                className="w-full py-2.5 text-xs font-semibold text-ios-gray-600 active:text-gray-900"
              >
                Restore {hiddenCount} removed item{hiddenCount === 1 ? '' : 's'}
              </button>
            )}
            {view.completed > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear all checkmarks, due-date overrides, and notes on this checklist?')) {
                    resetChecklistProgress(activeProject.id);
                  }
                }}
                className="w-full py-2.5 text-xs font-semibold text-red-600 active:text-red-700"
              >
                Reset Progress
              </button>
            )}
          </div>
        </div>
      </div>

      {detailItem && (
        <ItemDetailSheet
          item={detailItem}
          projectId={activeProject.id}
          onClose={() => setDetailItem(null)}
        />
      )}

      {addOpen && (
        <AddItemSheet
          projectId={activeProject.id}
          sections={view.sections.map((s) => ({ id: s.id, name: s.name }))}
          onClose={() => setAddOpen(false)}
        />
      )}
    </>
  );
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function ProgressCard({ view }: { view: ChecklistView }) {
  const pct = Math.round(view.percentComplete);
  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <ProgressRing percent={pct} />
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-gray-900 leading-tight">
            {view.completed}
            <span className="text-base font-semibold text-ios-gray-500"> / {view.total}</span>
          </p>
          <p className="text-xs text-ios-gray-600 mb-2">tasks complete</p>
          <div className="flex flex-wrap gap-1.5">
            {view.overdueCount > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                {view.overdueCount} overdue
              </span>
            )}
            {view.overdueCount === 0 && view.total > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Nothing overdue
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-ios-gray-100" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-indigo-600 transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
        {percent}%
      </span>
    </div>
  );
}

function SectionRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const r = 10;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);
  const complete = completed === total;
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90 flex-shrink-0">
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="3" className="stroke-ios-gray-100" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={complete ? 'stroke-green-500' : 'stroke-indigo-500'}
      />
    </svg>
  );
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  showSection = false,
  onToggle,
  onOpen,
}: {
  item: ChecklistItemView;
  showSection?: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const style = STATUS_STYLES[item.status];
  const overdue = item.status === 'overdue';

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-b border-ios-gray-100 last:border-0 ${
        overdue ? 'bg-red-50/40' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className="w-11 h-11 -ml-2 -my-1 flex items-center justify-center flex-shrink-0"
        aria-label={item.done ? 'Mark incomplete' : 'Mark complete'}
        aria-pressed={item.done}
      >
        <span
          className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center transition-colors ${
            item.done
              ? 'bg-indigo-600 border-indigo-600'
              : overdue
              ? 'border-red-400'
              : 'border-ios-gray-300'
          }`}
        >
          {item.done && <CheckIcon className="w-3.5 h-3.5 text-white" />}
        </span>
      </button>

      <button onClick={onOpen} className="flex-1 min-w-0 text-left py-0.5">
        <p
          className={`text-sm leading-snug ${
            item.done ? 'text-ios-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {item.text}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className={`text-xs ${style.text}`}>
            {item.dueDate ? formatDateLabel(item.dueDate) : 'No date'}
          </span>
          {style.label && !item.done && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${style.chip}`}>
              {style.label}
            </span>
          )}
          {item.isDueDateOverridden && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-ios-gray-100 text-ios-gray-600">
              Custom
            </span>
          )}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${OWNER_STYLES[item.owner]}`}>
            {item.owner}
          </span>
          {showSection && (
            <span className="text-[10px] text-ios-gray-400 truncate">
              {item.group ? `${item.sectionName} · ${item.group}` : item.sectionName}
            </span>
          )}
        </div>
        {item.note && (
          <p className="text-xs text-ios-gray-500 mt-1 line-clamp-2">{item.note}</p>
        )}
      </button>
    </div>
  );
}

// ─── Detail sheet ─────────────────────────────────────────────────────────────

function ItemDetailSheet({
  item,
  projectId,
  onClose,
}: {
  item: ChecklistItemView;
  projectId: string;
  onClose: () => void;
}) {
  const { setChecklistDueDate, setChecklistNote, removeChecklistItem } = useApp();
  const [note, setNote] = useState(item.note);

  function saveAndClose() {
    if (note !== item.note) setChecklistNote(projectId, item.id, note);
    onClose();
  }

  const offsetLabel =
    item.offsetDays === 0
      ? `on ${item.anchorLabel}`
      : `${Math.abs(item.offsetDays)} day${Math.abs(item.offsetDays) === 1 ? '' : 's'} ${
          item.offsetDays < 0 ? 'before' : 'after'
        } ${item.anchorLabel}`;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={saveAndClose} aria-hidden="true" />
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="sticky top-0 bg-white px-4 pt-3 pb-2 border-b border-ios-gray-100">
          <div className="w-10 h-1 bg-ios-gray-300 rounded-full mx-auto mb-3" />
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-semibold text-gray-900 leading-snug">{item.text}</p>
            <button
              onClick={saveAndClose}
              className="text-sm font-semibold text-indigo-600 flex-shrink-0 pt-0.5"
            >
              Done
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Where the date comes from */}
          <div className="bg-ios-gray-50 rounded-xl p-3">
            <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1">
              Scheduled From Plan
            </p>
            <p className="text-sm text-gray-900">Due {offsetLabel}</p>
            {item.offsetMode === 'workday' && item.offsetDays !== 0 && (
              <p className="text-xs text-ios-gray-500 mt-0.5">Counted in workdays (weekends skipped)</p>
            )}
          </div>

          {/* Due date override */}
          <div>
            <label className="block text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1.5">
              Due Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={item.dueDate ?? ''}
                onChange={(e) => setChecklistDueDate(projectId, item.id, e.target.value || null)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-ios-gray-200 text-sm text-gray-900 min-h-[44px]"
              />
              {item.isDueDateOverridden && (
                <button
                  onClick={() => setChecklistDueDate(projectId, item.id, null)}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold text-indigo-600 border border-indigo-200 min-h-[44px] whitespace-nowrap"
                >
                  Use Plan
                </button>
              )}
            </div>
            {item.isDueDateOverridden && (
              <p className="text-xs text-ios-gray-500 mt-1.5">
                Overridden — this date no longer follows the plan.
              </p>
            )}
          </div>

          {/* Owner + section */}
          <div className="flex gap-2">
            <div className="flex-1">
              <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1.5">Owner</p>
              <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${OWNER_STYLES[item.owner]}`}>
                {item.owner}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1.5">Section</p>
              <span className="text-xs text-gray-900">{item.sectionName}</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1.5">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note for this task…"
              className="w-full px-3 py-2.5 rounded-xl border border-ios-gray-200 text-sm text-gray-900 resize-none"
            />
          </div>

          {item.completedAt && (
            <p className="text-xs text-ios-gray-500">
              Completed {new Date(item.completedAt).toLocaleString()}
            </p>
          )}

          <button
            onClick={() => {
              removeChecklistItem(projectId, item.id, item.isCustom);
              onClose();
            }}
            className="w-full py-3 rounded-xl text-sm font-semibold text-red-600 border border-red-200 min-h-[44px] active:bg-red-50"
          >
            {item.isCustom ? 'Delete Item' : 'Remove From This Project'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Add item sheet ───────────────────────────────────────────────────────────

function AddItemSheet({
  projectId,
  sections,
  onClose,
}: {
  projectId: string;
  sections: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const { addChecklistItem } = useApp();
  const [text, setText] = useState('');
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? '');
  const [owner, setOwner] = useState<ChecklistOwner>('PM');
  const [anchor, setAnchor] = useState<ChecklistAnchor>('move-day');
  const [offsetDays, setOffsetDays] = useState(0);

  function submit() {
    if (!text.trim() || !sectionId) return;
    addChecklistItem(projectId, {
      id: `custom-${crypto.randomUUID()}`,
      sectionId,
      text: text.trim(),
      anchor,
      offsetDays,
      offsetMode: 'calendar',
      owner,
    });
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="sticky top-0 bg-white px-4 pt-3 pb-2 border-b border-ios-gray-100">
          <div className="w-10 h-1 bg-ios-gray-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="text-sm font-semibold text-ios-gray-600">
              Cancel
            </button>
            <p className="text-base font-bold text-gray-900">Add Item</p>
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="text-sm font-semibold text-indigo-600 disabled:text-ios-gray-300"
            >
              Add
            </button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1.5">
              Task
            </label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              placeholder="What needs to happen?"
              className="w-full px-3 py-2.5 rounded-xl border border-ios-gray-200 text-sm min-h-[44px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1.5">
              Section
            </label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-ios-gray-200 text-sm bg-white min-h-[44px]"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1.5">
              Owner
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CHECKLIST_OWNERS.map((o) => (
                <button
                  key={o}
                  onClick={() => setOwner(o)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    owner === o ? 'bg-indigo-600 text-white' : 'bg-ios-gray-100 text-ios-gray-600'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ios-gray-500 uppercase tracking-wider mb-1.5">
              Due Relative To
            </label>
            <select
              value={anchor}
              onChange={(e) => setAnchor(e.target.value as ChecklistAnchor)}
              className="w-full px-3 py-2.5 rounded-xl border border-ios-gray-200 text-sm bg-white min-h-[44px] mb-2"
            >
              {Object.entries(ANCHOR_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={offsetDays}
                onChange={(e) => setOffsetDays(parseInt(e.target.value, 10) || 0)}
                className="w-24 px-3 py-2.5 rounded-xl border border-ios-gray-200 text-sm min-h-[44px]"
              />
              <span className="text-xs text-ios-gray-600">
                days {offsetDays < 0 ? 'before' : offsetDays > 0 ? 'after' : 'from'}{' '}
                {ANCHOR_LABELS[anchor]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onEdit }: { onEdit: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-12 gap-4">
      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center">
        <CheckCircleIcon className="w-8 h-8 text-indigo-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Nothing on the Checklist</h2>
        <p className="text-ios-gray-600 text-sm px-6">
          No template sections apply to this move type. Adjust the template in Settings.
        </p>
      </div>
      <button
        onClick={onEdit}
        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm min-h-[44px]"
      >
        Edit Template
      </button>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}

function CheckCircleIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

function CopyIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
      <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
    </svg>
  );
}

function SwapIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M2.24 6.8a.75.75 0 001.06-.04l1.95-2.1v8.59a.75.75 0 001.5 0V4.66l1.95 2.1a.75.75 0 101.1-1.02l-3.25-3.5a.75.75 0 00-1.1 0L2.2 5.74a.75.75 0 00.04 1.06zm8 6.4a.75.75 0 00-.04 1.06l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75a.75.75 0 00-1.5 0v8.59l-1.95-2.1a.75.75 0 00-1.06-.04z" clipRule="evenodd" />
    </svg>
  );
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  );
}
