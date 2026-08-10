import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * The project documents menu — Furniture Inventory, Floor Plans, Photos —
 * which rises above the project folder in the bottom bar and folds back into it.
 * Shared state because the button that opens it and the folder that dismisses it
 * are separate controls.
 */
interface ProjectDocsContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const ProjectDocsContext = createContext<ProjectDocsContextValue | null>(null);

export function ProjectDocsProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ProjectDocsContext.Provider
      value={{ isOpen, toggle: () => setIsOpen((v) => !v), close: () => setIsOpen(false) }}
    >
      {children}
    </ProjectDocsContext.Provider>
  );
}

export function useProjectDocs(): ProjectDocsContextValue {
  const ctx = useContext(ProjectDocsContext);
  if (!ctx) throw new Error('useProjectDocs must be used within ProjectDocsProvider');
  return ctx;
}
