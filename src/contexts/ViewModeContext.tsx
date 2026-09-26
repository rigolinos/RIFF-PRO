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
  const [viewMode, setViewMode] = useState<ViewMode>('student');

  useEffect(() => {
    if (profile?.role) {
      const savedMode = localStorage.getItem('viewMode') as ViewMode;
      if (savedMode && (savedMode === 'professional' || savedMode === 'student') && profile.role === 'professional') {
        setViewMode(savedMode);
      } else {
        setViewMode(profile.role as ViewMode);
        localStorage.setItem('viewMode', profile.role);
      }
    }
  }, [profile?.role]);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
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
