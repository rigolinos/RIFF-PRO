import { createContext, useContext, useState, ReactNode } from 'react';
import { useProfile } from '@riff/core/hooks/useProfile';

type ViewMode = 'professional' | 'student';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  actualRole: ViewMode | null;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

function readSavedMode(): ViewMode | null {
  try {
    const saved = localStorage.getItem('riff-mode');
    return saved === 'professional' || saved === 'student' ? saved : null;
  } catch (e) {
    console.error('Error reading riff-mode from localStorage', e);
    return null;
  }
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  // Modo escolhido pelo usuário; sem escolha salva, segue o papel do perfil.
  const [savedMode, setSavedMode] = useState<ViewMode | null>(readSavedMode);
  const defaultMode: ViewMode = profile?.role === 'professional' ? 'professional' : 'student';
  const viewMode = savedMode ?? defaultMode;

  const handleSetViewMode = (mode: ViewMode) => {
    setSavedMode(mode);
    try {
      localStorage.setItem('riff-mode', mode);
    } catch (e) {
      console.error('Error writing riff-mode to localStorage', e);
    }
  };

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode: handleSetViewMode, actualRole: profile?.role as ViewMode | null }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
};
