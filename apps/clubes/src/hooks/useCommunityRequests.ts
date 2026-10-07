import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@riff/core/supabase/client';
import { useProfile } from '@riff/core/hooks/useProfile';

export type NearbyCommunity = {
  type: 'community' | 'request';
  id: string;
  name: string;
  kind: string;
  distance_m: number;
  is_member: boolean;
  requested: boolean;
};

/** Comunidades e pedidos a até 150 m do ponto escolhido (um condomínio por lugar) */
export function useCommunitiesNear(point: { latitude: number; longitude: number } | null) {
  return useQuery({
    queryKey: ['communities-near', point?.latitude, point?.longitude],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('communities_near', { p_lat: point!.latitude, p_lng: point!.longitude });
      if (error) throw error;
      return (data ?? []) as NearbyCommunity[];
    },
    enabled: !!point,
  });
}

/** Pedidos de comunidade da própria pessoa */
export function useMyCommunityRequests() {
  const { profile } = useProfile();
  return useQuery({
    queryKey: ['my-community-requests', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_requests')
        .select('id, name, kind, city, status, created_at, organization_id')
        .eq('requester_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });
}

/** Gestor: quem pediu para entrar na comunidade */
export function usePendingJoinRequests(orgId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['join-requests', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_join_requests')
        .select('id, created_at, profile:profiles!community_join_requests_profile_id_fkey(full_name, avatar_url)')
        .eq('organization_id', orgId!)
        .eq('status', 'pending')
        .order('created_at');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && enabled,
  });
}

export type CommunityRequestInput = {
  name: string;
  kind: 'condo' | 'club';
  address: string;
  city: string | null;
  state: string | null;
  latitude: number;
  longitude: number;
  infrastructure: Record<string, number>;
  units: number | null;
  requesterRole: string;
  sindicoContact: string;
};

const ERRORS: Record<string, string> = {
  community_exists: 'Este condomínio ou clube já está no Riff. Peça para entrar.',
  request_exists: 'Este condomínio ou clube já foi pedido. Avise que você também quer.',
  too_many_requests: 'Você já tem 3 pedidos em análise. Aguarde a resposta da equipe Riff.',
  address_required: 'Escolha o endereço na lista para marcar o ponto.',
  already_member: 'Você já faz parte desta comunidade.',
  request_not_found: 'Pedido não encontrado.',
  forbidden: 'Só o gestor da comunidade responde a esses pedidos.',
};
export const requestErrorMessage = (error: unknown, fallback: string) => {
  const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : '';
  return ERRORS[Object.keys(ERRORS).find((k) => msg.includes(k)) ?? ''] ?? fallback;
};

export function useCommunityRequestActions() {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-community-requests'] });
    void queryClient.invalidateQueries({ queryKey: ['communities-near'] });
  };

  const submit = useMutation({
    mutationFn: async (r: CommunityRequestInput) => {
      const { error } = await supabase.rpc('submit_community_request', {
        p_name: r.name,
        p_kind: r.kind,
        p_address: r.address,
        p_city: r.city ?? '',
        p_state: r.state ?? '',
        p_lat: r.latitude,
        p_lng: r.longitude,
        p_infrastructure: r.infrastructure,
        // NULL = não informado (o banco aceita; o tipo gerado não marca como opcional)
        p_units: r.units as number,
        p_requester_role: r.requesterRole,
        p_sindico_contact: r.sindicoContact,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('cancel_community_request', { p_request: id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const support = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('support_community_request', { p_request: id });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const join = useMutation({
    mutationFn: async (orgId: string) => {
      const { error } = await supabase.rpc('request_to_join', { p_org: orgId });
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const answer = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const { error } = await supabase.rpc('answer_join_request', { p_request: id, p_accept: accept });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['join-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['community-members'] });
    },
  });

  return { submit, cancel, support, join, answer };
}
