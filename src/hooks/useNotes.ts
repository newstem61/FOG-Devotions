import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const debug = {
  log: (action: string, ...args: any[]) => {
    console.log(`[Notes:${action}]`, new Date().toISOString(), ...args);
  },
  error: (action: string, error: any) => {
    console.error(`[Notes:${action}:ERROR]`, new Date().toISOString(), error);
  }
};

// Cache for storing notes
const notesCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useNotes(devotionId: number, session: Session | null) {
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  const getCacheKey = useCallback((userId: string, devotionId: number) => {
    return `note:${userId}:${devotionId}`;
  }, []);

  const clearCache = useCallback(() => {
    notesCache.clear();
  }, []);

  const fetchNote = useCallback(async (retryCount = 0) => {
    if (!session?.user?.id || !mountedRef.current) return;

    const requestId = ++requestIdRef.current;
    const cacheKey = getCacheKey(session.user.id, devotionId);
    const cachedNote = notesCache.get(cacheKey);

    // Use cache if valid
    if (cachedNote && Date.now() - cachedNote.timestamp < CACHE_TTL) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setNote(cachedNote.content);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      debug.log('fetchNote:start', { devotionId, requestId, retryCount });

      const { data: noteData, error: fetchError } = await supabase
        .from('devotion_notes')
        .select('content')
        .eq('devotion_id', devotionId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // Only update state if this is still the current request
      if (mountedRef.current && requestId === requestIdRef.current) {
        const content = noteData?.content || '';
        debug.log('fetchNote:success', { devotionId, requestId });
        
        // Update cache
        notesCache.set(cacheKey, {
          content,
          timestamp: Date.now()
        });

        setNote(content);
        setError(null);
      }
    } catch (error: any) {
      debug.error('fetchNote', error);
      
      if (mountedRef.current && requestId === requestIdRef.current) {
        // Use cached data as fallback if available
        if (cachedNote) {
          setNote(cachedNote.content);
        }
        
        setError('Failed to load note');

        // Retry with exponential backoff
        if (retryCount < 3) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
          retryTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              fetchNote(retryCount + 1);
            }
          }, delay);
        }
      }
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [devotionId, session?.user?.id, getCacheKey]);

  const saveNote = async (content: string) => {
    if (!session?.user?.id) {
      throw new Error('Must be signed in to save notes');
    }

    if (isSaving) return;

    const requestId = ++requestIdRef.current;
    const cacheKey = getCacheKey(session.user.id, devotionId);

    try {
      setIsSaving(true);
      setError(null);

      debug.log('saveNote:start', { devotionId, requestId });

      // Optimistic update
      setNote(content);
      notesCache.set(cacheKey, {
        content,
        timestamp: Date.now()
      });

      const { data: existingNote } = await supabase
        .from('devotion_notes')
        .select('id')
        .eq('devotion_id', devotionId)
        .eq('user_id', session.user.id)
        .maybeSingle();

      let saveError;
      if (existingNote) {
        debug.log('saveNote:updating', { devotionId, noteId: existingNote.id });
        const { error } = await supabase
          .from('devotion_notes')
          .update({ content })
          .eq('id', existingNote.id)
          .eq('user_id', session.user.id);
        saveError = error;
      } else {
        debug.log('saveNote:inserting', { devotionId });
        const { error } = await supabase
          .from('devotion_notes')
          .insert([{
            devotion_id: devotionId,
            content,
            user_id: session.user.id
          }]);
        saveError = error;
      }

      if (saveError) throw saveError;

      debug.log('saveNote:success', { devotionId, requestId });
    } catch (error: any) {
      debug.error('saveNote', error);
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError('Failed to save note');
        // Invalidate cache on error
        notesCache.delete(cacheKey);
      }
      throw error;
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setIsSaving(false);
      }
    }
  };

  // Subscribe to realtime changes
  useEffect(() => {
    if (!session?.user?.id) return;

    const subscription = supabase
      .channel('notes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'devotion_notes',
          filter: `user_id=eq.${session.user.id}`
        },
        () => {
          // Clear cache and refetch on any changes
          clearCache();
          fetchNote();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user?.id, fetchNote, clearCache]);

  // Initialize note when devotionId or session changes
  useEffect(() => {
    debug.log('effect:init', { devotionId });
    
    if (session?.user?.id) {
      fetchNote();
    } else {
      setNote('');
      setError(null);
      setIsLoading(false);
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [devotionId, session?.user?.id, fetchNote]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    note,
    setNote,
    isLoading,
    error,
    isSaving,
    saveNote,
    refreshNote: fetchNote,
    clearCache
  };
}