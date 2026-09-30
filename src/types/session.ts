import type { Tables } from '@/integrations/supabase/types';

export type SessionWithJoins = Tables<'sessions'> & {
  professional?: Tables<'profiles'>;
  category?: Tables<'categories'>;
  bookings?: Tables<'bookings'>[];
};
