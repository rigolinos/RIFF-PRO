import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useProfile } from '@/hooks/useProfile';

type ViewMode = 'professional' | 'student';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  actualRole: ViewMode | null;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const [viewMode, setViewModeState] = useState<ViewMode>('student');

  useEffect(() => {
    if (!profile) return;
    
    // Default fallback based on profile
    let defaultMode: ViewMode = profile.role === 'professional' ? 'professional' : 'student';
    let currentMode = defaultMode;

    try {
      const saved = localStorage.getItem('riff-mode');
      if (saved === 'professional' || saved === 'student') {
        currentMode = saved as ViewMode;
      } else {
        localStorage.setItem('riff-mode', defaultMode);
      }
    } catch (e) {
      console.error('Error reading riff-mode from localStorage', e);
    }
    
    setViewModeState(currentMode);
  }, [profile]);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
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
