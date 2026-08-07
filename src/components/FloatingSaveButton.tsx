/**
 * Height a scrolling page has to reserve at its bottom so the floating button
 * doesn't sit on top of the last control. Pair the button with a
 * <FloatingSaveSpacer /> at the end of the scroll container.
 */
export const FLOATING_SAVE_CLEARANCE = 'calc(72px + env(safe-area-inset-bottom))';

/** Blank block that keeps the last row of a page clear of the floating button. */
export function FloatingSaveSpacer() {
  return <div aria-hidden="true" style={{ height: FLOATING_SAVE_CLEARANCE }} />;
}

export function FloatingSaveButton({ onSave, label = 'Save' }: { onSave: () => void; label?: string }) {
  return (
    <button
      onClick={onSave}
      className="fixed right-4 z-40 flex items-center gap-2 px-5 py-3 bg-teal-600 text-white rounded-2xl shadow-xl font-semibold text-sm active:opacity-80 transition-opacity"
      style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
      {label}
    </button>
  );
}
