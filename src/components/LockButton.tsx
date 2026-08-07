/**
 * Project lock toggle, shared by the Input, Plan and Schedule headers.
 *
 * The open state draws the shackle swung clear to the right of the body rather
 * than standing over it, so locked and unlocked read apart at a glance.
 */
export function LockButton({ isLocked, onToggle }: { isLocked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
        isLocked ? 'bg-teal-100 text-teal-700' : 'bg-ios-gray-100 text-ios-gray-500'
      }`}
      aria-label={isLocked ? 'Unlock project' : 'Lock project'}
    >
      {isLocked ? <LockClosedIcon /> : <LockOpenIcon />}
    </button>
  );
}

function LockClosedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
    </svg>
  );
}

/**
 * The shackle is stroked and the body filled over the top of it, which hides
 * the leg that runs down inside the body and leaves the free leg hanging to the
 * right of it.
 */
function LockOpenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5">
      <path
        d="M11.5 10.5V6.75a4.75 4.75 0 019.5 0V10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
      />
      <rect x="0.5" y="9.6" width="18" height="14.4" rx="1.7" fill="currentColor" />
    </svg>
  );
}
