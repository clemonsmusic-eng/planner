/**
 * Bottom-sheet confirmation for a destructive action.
 *
 * Sits at z-[60] with the panel above the scrim — a scrim painted over the
 * panel dims it and swallows every tap.
 */
export function ConfirmSheet({
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative mt-auto lg:m-auto lg:max-w-lg lg:w-full bg-white rounded-t-3xl lg:rounded-3xl">
        <div className="px-5 pt-5 pb-4">
          <h2 className="text-lg font-bold text-teal-900 mb-1">{title}</h2>
          <p className="text-sm text-ios-gray-600 leading-snug">{message}</p>
        </div>
        <div className="px-4 pb-4 space-y-2">
          <button
            onClick={onConfirm}
            className="w-full min-h-[48px] rounded-xl bg-red-600 text-white font-semibold active:opacity-80 lg:hover:opacity-90"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="w-full min-h-[48px] rounded-xl border border-ios-gray-300 text-teal-900 font-semibold active:bg-ios-gray-50"
          >
            Cancel
          </button>
        </div>
        <div className="h-2" />
      </div>
    </div>
  );
}
