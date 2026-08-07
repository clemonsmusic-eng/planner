import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Shared state for the manual "Add Shift" flow, which two places drive:
 * the button in the Schedule header, and the popover that rises out of the
 * Schedule tab in the bottom bar. Both open the same sheet, which the Schedule
 * page owns — hence the context rather than local state in either one.
 */
interface AddShiftContextValue {
  /** The small popover above the Schedule tab in the bottom bar. */
  menuOpen: boolean;
  toggleMenu: () => void;
  closeMenu: () => void;
  /** The form sheet itself. */
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

const AddShiftContext = createContext<AddShiftContextValue | null>(null);

export function AddShiftProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <AddShiftContext.Provider
      value={{
        menuOpen,
        toggleMenu: () => setMenuOpen((v) => !v),
        closeMenu: () => setMenuOpen(false),
        sheetOpen,
        // Opening the form retires the popover that launched it.
        openSheet: () => { setMenuOpen(false); setSheetOpen(true); },
        closeSheet: () => setSheetOpen(false),
      }}
    >
      {children}
    </AddShiftContext.Provider>
  );
}

export function useAddShift(): AddShiftContextValue {
  const ctx = useContext(AddShiftContext);
  if (!ctx) throw new Error('useAddShift must be used within AddShiftProvider');
  return ctx;
}
