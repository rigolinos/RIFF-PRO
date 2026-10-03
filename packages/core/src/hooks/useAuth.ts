import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@riff/core/supabase/client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('useAuth: Error getting session:', error);
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'professional' | 'student') => {
    if (!email || !password || !fullName) {
      return { error: { message: 'Todos os campos são obrigatórios' } };
    }

    if (password.length < 6) {
      return { error: { message: 'A senha deve ter pelo menos 6 caracteres' } };
    }

    const redirectUrl = `${window.location.origin}/login?confirmed=true`;
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedFullName = fullName.trim();

    const { error } = await supabase.auth.signUp({
      email: sanitizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: sanitizedFullName,
          role: role,
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!email || !password) {
      return { error: { message: 'Email e senha são obrigatórios' } };
    }

    const sanitizedEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    });

    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
