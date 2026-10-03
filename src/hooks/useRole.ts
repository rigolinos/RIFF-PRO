import { useMemo } from 'react';
import { useProfile } from '@riff/core/hooks/useProfile';

export function useRole() {
  const { profile, isLoading } = useProfile();

  const role = useMemo(() => {
    return profile?.role ?? null;
  }, [profile?.role]);

  const isProfessional = role === 'professional';
  const isStudent = role === 'student';

  return {
    role,
    isProfessional,
    isStudent,
    isLoading,
  };
}
