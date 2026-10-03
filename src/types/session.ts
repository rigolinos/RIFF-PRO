import type { Tables } from '@riff/core/supabase/types';

export type SessionWithJoins = Tables<'sessions'> & {
  professional?: Tables<'profiles'>;
  category?: Tables<'categories'>;
  bookings?: Tables<'bookings'>[];
};
