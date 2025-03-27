import { supabase } from './supabase';
import { UserProgress } from '../types';
import { stateEvents } from './supabase';
import { startOfDay, formatISO } from 'date-fns';

function log(action: string, ...args: any[]) {
  console.log(`[Progress:${action}]`, new Date().toISOString(), ...args);
}

export async function getUserProgress(userId: string): Promise<UserProgress | null> {
  try {
    log('getUserProgress:start', { userId });
    
    const { data, error } = await supabase
      .from('user_reading_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      log('getUserProgress:error', { error });
      if (error.code === 'PGRST116') {
        log('getUserProgress:initializing', { userId });
        return initializeUserProgress(userId);
      }
      throw error;
    }
    
    log('getUserProgress:success', { data });
    return data;
  } catch (error: any) {
    log('getUserProgress:catch', { error });
    return null;
  }
}

export async function initializeUserProgress(userId: string): Promise<UserProgress | null> {
  try {
    log('initializeUserProgress:start', { userId });
    
    // Get today's date at start of day
    const today = startOfDay(new Date());
    // Set start date to today (first devotion starts today)
    const startDateStr = formatISO(today, { representation: 'date' });
    
    log('initializeUserProgress:dates', { 
      today: formatISO(today, { representation: 'date' }),
      startDate: startDateStr
    });

    const { data, error } = await supabase
      .from('user_reading_progress')
      .upsert([{
        user_id: userId,
        start_date: startDateStr,
        current_devotion: 1,
        completed_devotions: []
      }], {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      log('initializeUserProgress:error', { error });
      throw error;
    }
    
    log('initializeUserProgress:success', { data });
    return data;
  } catch (error) {
    log('initializeUserProgress:catch', { error });
    return null;
  }
}

export async function updateUserProgress(
  userId: string,
  completedDevotions: number[]
): Promise<UserProgress | null> {
  try {
    log('updateUserProgress:start', { userId, completedDevotions });
    
    const { data, error } = await supabase
      .from('user_reading_progress')
      .update({ 
        completed_devotions: completedDevotions,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      log('updateUserProgress:error', { error });
      throw error;
    }
    
    log('updateUserProgress:success', { data });
    return data;
  } catch (error) {
    log('updateUserProgress:catch', { error });
    return null;
  }
}

export async function resetUserProgress(userId: string): Promise<UserProgress | null> {
  try {
    log('resetUserProgress:start', { userId });
    
    // Get today's date at start of day
    const today = startOfDay(new Date());
    // Set start date to today (first devotion starts today)
    const startDateStr = formatISO(today, { representation: 'date' });

    log('resetUserProgress:dates', {
      today: formatISO(today, { representation: 'date' }),
      startDate: startDateStr
    });

    // Start a Supabase transaction
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    // Delete all notes with retries
    let retries = 3;
    let notesDeleted = false;
    
    while (retries > 0 && !notesDeleted) {
      log('resetUserProgress:deletingNotes', { attempt: 4 - retries });
      
      const { error: deleteError } = await supabase
        .from('devotion_notes')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        log('resetUserProgress:deleteError', { deleteError, retriesLeft: retries - 1 });
        retries--;
        if (retries === 0) throw deleteError;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // Verify deletion
      const { data: remainingNotes, error: countError } = await supabase
        .from('devotion_notes')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      if (countError) {
        log('resetUserProgress:countError', { countError });
        throw countError;
      }

      if (!remainingNotes || remainingNotes.length === 0) {
        notesDeleted = true;
        log('resetUserProgress:notesDeleted');
        break;
      }

      log('resetUserProgress:deletionIncomplete', { 
        remainingCount: remainingNotes.length,
        retriesLeft: retries - 1 
      });
      
      retries--;
      if (retries === 0) {
        throw new Error(`Failed to delete all notes. ${remainingNotes.length} notes remaining.`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Reset progress
    const { data: progress, error: progressError } = await supabase
      .from('user_reading_progress')
      .update({ 
        start_date: startDateStr,
        current_devotion: 1,
        completed_devotions: [],
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (progressError) {
      log('resetUserProgress:progressError', { progressError });
      throw progressError;
    }

    log('resetUserProgress:success', { progress });

    // Force a page refresh
    window.location.reload();

    return progress;
  } catch (error) {
    log('resetUserProgress:catch', { error });
    throw error;
  }
}

export async function clearUserData(): Promise<void> {
  try {
    log('clearUserData:start');
    
    // First clear local storage
    log('clearUserData:clearingStorage');
    localStorage.clear();
    sessionStorage.clear();

    // Sign out from Supabase
    log('clearUserData:signingOut');
    const { error } = await supabase.auth.signOut({
      scope: 'global'
    });
    
    if (error) {
      log('clearUserData:error', { error });
      throw error;
    }

    log('clearUserData:success');
    
    // Notify all components to reset their state
    stateEvents.notify();

    // Force a page refresh
    window.location.reload();
  } catch (error) {
    log('clearUserData:catch', { error });
    // Notify components even if cleanup fails
    stateEvents.notify();
    throw error;
  }
}