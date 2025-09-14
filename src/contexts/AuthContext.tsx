import { createContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  signUp: (email: string, password: string, username: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check active session
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        
        if (activeSession) {
          setSession(activeSession);
          setUser(activeSession.user);
          setIsAuthenticated(true);
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            if (currentSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
              setSession(currentSession);
              setUser(currentSession.user);
              setIsAuthenticated(true);
            }

            if (event === 'SIGNED_OUT') {
              setSession(null);
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        );

        setIsInitialized(true);

        // Cleanup subscription
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setIsInitialized(true);
      }
    };

    initAuth();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, username: string) => {
    try {
      // Check if username is already taken
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingProfile) {
        return {
          success: false,
          error: 'Username is already taken',
        };
      }

      // Register the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      // Create a user profile only if user was created successfully
      if (data.user && !data.user.identities?.length === false) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            { 
              id: data.user.id, 
              username, 
              email,
              created_at: new Date().toISOString() 
            },
          ], {
            onConflict: 'id'
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't return error here as the user account was created successfully
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    }
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isInitialized,
        user,
        session,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}