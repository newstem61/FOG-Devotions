import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProgress } from '../types';

const STORAGE_KEY = 'completed_devotions';

export function useDevotions(session: Session | null, userProgress: UserProgress | null) {
  const [completedDevotions, setCompletedDevotions] = useState<number[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSyncRef = useRef<number[]>([]);

  // Load initial state from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCompletedDevotions(parsed);
        lastSyncRef.current = parsed;
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }, []);

  // Load state from database when user logs in
  useEffect(() => {
    if (userProgress?.completed_devotions) {
      setCompletedDevotions(userProgress.completed_devotions);
      lastSyncRef.current = userProgress.completed_devotions;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userProgress.completed_devotions));
    }
  }, [userProgress]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
      .channel('progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_reading_progress',
          filter: `user_id=eq.${session.user.id}`
        },
        (payload) => {
          const progress = payload.new as UserProgress;
          if (progress?.completed_devotions) {
            setCompletedDevotions(progress.completed_devotions);
            lastSyncRef.current = progress.completed_devotions;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(progress.completed_devotions));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id]);

  // Sync with database when changes occur
  const syncWithDatabase = useCallback(async () => {
    if (!session?.user) return;

    const currentDevotions = completedDevotions;
    if (JSON.stringify(currentDevotions) === JSON.stringify(lastSyncRef.current)) {
      return; // No changes to sync
    }

    setIsSyncing(true);
    try {
      const { error } = await supabase
        .from('user_reading_progress')
        .update({ 
          completed_devotions: currentDevotions,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id);

      if (error) throw error;
      lastSyncRef.current = currentDevotions;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentDevotions));
    } catch (error) {
      console.error('Error syncing with database:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [completedDevotions, session]);

  // Debounced sync with database
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(syncWithDatabase, 1000);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [syncWithDatabase]);

  const toggleDevotion = useCallback((id: number) => {
    setCompletedDevotions(prev => {
      const newState = prev.includes(id) 
        ? prev.filter(devId => devId !== id)
        : [...prev, id];
      return newState;
    });
  }, []);

  const resetDevotions = useCallback(() => {
    setCompletedDevotions([]);
    lastSyncRef.current = [];
    localStorage.setItem(STORAGE_KEY, '[]');
  }, []);

  return {
    completedDevotions,
    toggleDevotion,
    resetDevotions,
    isSyncing
  };
}