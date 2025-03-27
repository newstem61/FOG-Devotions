import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, initializeAuth, stateEvents } from '../lib/supabase';
import { UserProgress } from '../types';
import { getUserProgress } from '../lib/progress';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  const resetState = useCallback(() => {
    if (mountedRef.current) {
      setSession(null);
      setUserProgress(null);
      setIsLoading(false);
    }
  }, []);

  const loadUserProgress = useCallback(async (userId: string) => {
    if (!mountedRef.current) return;
    
    try {
      const progress = await getUserProgress(userId);
      if (mountedRef.current) {
        setUserProgress(progress);
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    }
  }, []);

  const handleAuthChange = useCallback(async (_event: string, session: Session | null) => {
    if (!mountedRef.current) return;

    setSession(session);
    
    if (session?.user) {
      await loadUserProgress(session.user.id);
    } else {
      setUserProgress(null);
    }
  }, [loadUserProgress]);

  useEffect(() => {
    mountedRef.current = true;
    let unsubscribeAuth: (() => void) | undefined;

    const initialize = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      try {
        const session = await initializeAuth();
        if (mountedRef.current) {
          await handleAuthChange('INITIAL', session);
        }

        // Set up auth subscription
        const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
        unsubscribeAuth = subscription.unsubscribe;

      } catch (error) {
        console.error('Auth initialization failed:', error);
        resetState();
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          initializingRef.current = false;
        }
      }
    };

    initialize();

    // Subscribe to global state reset events
    const unsubscribeEvents = stateEvents.subscribe(resetState);

    return () => {
      mountedRef.current = false;
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      unsubscribeEvents();
    };
  }, [handleAuthChange, resetState]);

  return {
    session,
    userProgress,
    isLoading,
    setUserProgress
  };
}