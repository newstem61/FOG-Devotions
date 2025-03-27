import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { updateUserProgress } from '../lib/progress';

export function useProgress(session: Session | null) {
  const [completedDevotions, setCompletedDevotions] = useState<number[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load completed devotions from local storage
  useEffect(() => {
    const saved = localStorage.getItem('completed_devotions');
    if (saved) {
      setCompletedDevotions(JSON.parse(saved));
    }
  }, []);

  // Save to local storage and sync with server
  useEffect(() => {
    localStorage.setItem('completed_devotions', JSON.stringify(completedDevotions));

    if (session?.user) {
      const syncProgress = async () => {
        setIsSyncing(true);
        try {
          await updateUserProgress(session.user.id, completedDevotions.length, completedDevotions);
        } catch (error) {
          console.error('Error syncing progress:', error);
        } finally {
          setIsSyncing(false);
        }
      };

      syncProgress();
    }
  }, [completedDevotions, session]);

  const toggleComplete = (id: number) => {
    setCompletedDevotions(prev => 
      prev.includes(id) ? prev.filter(devId => devId !== id) : [...prev, id]
    );
  };

  return {
    completedDevotions,
    setCompletedDevotions,
    toggleComplete,
    isSyncing
  };
}