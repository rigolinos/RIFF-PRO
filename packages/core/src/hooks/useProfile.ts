import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useAuth } from './useAuth';
import type { TablesUpdate } from '@riff/core/supabase/types';

type ProfileUpdates = TablesUpdate<'profiles'> & TablesUpdate<'profile_private'>;

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch public profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profileData) return null;

      // Fetch private PII data (only owner can read this due to RLS)
      const { data: privateData } = await supabase
        .from('profile_private')
        .select('email, phone, whatsapp_number, pix_key, pix_key_type, credential_number')
        .eq('profile_id', profileData.id)
        .single();

      // Merge the two for the frontend to consume transparently
      return {
        ...profileData,
        ...(privateData || {})
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: ProfileUpdates) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Separate public vs private fields
      const { email, phone, whatsapp_number, pix_key, pix_key_type, credential_number, profile_id: _profile_id, user_id: _user_id, ...publicUpdates } = updates as ProfileUpdates;

      const profileId = profileQuery.data?.id;

      // Update public fields if there are any
      if (Object.keys(publicUpdates).length > 0) {
        const { error: publicError } = await supabase
          .from('profiles')
          .update(publicUpdates)
          .eq('user_id', user.id);

        if (publicError) throw publicError;
      }

      // Update private fields if there are any and we know the profile_id
      if (profileId && (email !== undefined || phone !== undefined || whatsapp_number !== undefined || pix_key !== undefined || pix_key_type !== undefined || credential_number !== undefined)) {
        
        // Filter out undefined values for the private update
        const privateUpdates: TablesUpdate<'profile_private'> = {};
        if (email !== undefined) privateUpdates.email = email;
        if (phone !== undefined) privateUpdates.phone = phone;
        if (whatsapp_number !== undefined) privateUpdates.whatsapp_number = whatsapp_number;
        if (pix_key !== undefined) privateUpdates.pix_key = pix_key;
        if (pix_key_type !== undefined) privateUpdates.pix_key_type = pix_key_type;
        if (credential_number !== undefined) privateUpdates.credential_number = credential_number;

        const { error: privateError } = await supabase
          .from('profile_private')
          .update(privateUpdates)
          .eq('profile_id', profileId);

        if (privateError) throw privateError;
      }
      
      return updates; // Return the requested updates to simulate successful response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });

  return {
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
    updateProfile: updateProfile.mutateAsync,
    isUpdating: updateProfile.isPending,
  };
}
