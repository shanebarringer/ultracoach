import { useEffect, useState } from 'react';
import { authClient } from '@/lib/better-auth-client';

interface AuthState {
  user: Record<string, unknown> | null;
  session: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
}

export function useBetterAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: session, error } = await authClient.getSession();
        
        if (error) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            error: error.message || null
          });
          return;
        }

        setAuthState({
          user: session?.user || null,
          session: session || null,
          loading: false,
          error: null
        });
      } catch (error) {
        setAuthState({
          user: null,
          session: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    getSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await authClient.signIn.email({
        email,
        password
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message || null
        }));
        return { success: false, error: error.message };
      }

      setAuthState({
        user: data.user,
        session: data as Record<string, unknown>,
        loading: false,
        error: null
      });

      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name
      });

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message || null
        }));
        return { success: false, error: error.message };
      }

      setAuthState({
        user: data.user,
        session: data as Record<string, unknown>,
        loading: false,
        error: null
      });

      return { success: true, data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      const { error } = await authClient.signOut();

      if (error) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: error.message || null
        }));
        return { success: false, error: error.message };
      }

      setAuthState({
        user: null,
        session: null,
        loading: false,
        error: null
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      return { success: false, error: errorMessage };
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut
  };
}

export default useBetterAuth;