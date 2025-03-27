import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Event bus for state synchronization
type Listener = () => void;
const listeners = new Set<Listener>();

export const stateEvents = {
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  notify: () => {
    listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in state event listener:', error);
      }
    });
  }
};

// Track active requests and subscriptions
const activeRequests = new Map<string, AbortController>();
const activeSubscriptions = new Set<() => void>();

// Create Supabase client with improved session handling
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: false
  }
});

// Create an abortable request with ID
export function createAbortableRequest(id?: string) {
  const requestId = id || Math.random().toString(36).substring(7);
  const controller = new AbortController();
  
  // Cleanup any existing request with same ID
  const existing = activeRequests.get(requestId);
  if (existing) {
    try {
      existing.abort();
    } catch (e) {
      console.warn('Error aborting existing request:', e);
    }
  }
  
  activeRequests.set(requestId, controller);
  return { controller, requestId };
}

// Remove a request from tracking
export function removeRequest(requestId: string) {
  activeRequests.delete(requestId);
}

// Cancel all active requests
export function cancelAllRequests() {
  activeRequests.forEach((controller, id) => {
    try {
      controller.abort();
      activeRequests.delete(id);
    } catch (e) {
      console.warn(`Error aborting request ${id}:`, e);
    }
  });
}

// Add a subscription to be tracked
export function addSubscription(unsubscribe: () => void) {
  activeSubscriptions.add(unsubscribe);
  return () => {
    activeSubscriptions.delete(unsubscribe);
    unsubscribe();
  };
}

// Cancel all active subscriptions
export function cancelAllSubscriptions() {
  activeSubscriptions.forEach(unsubscribe => {
    try {
      unsubscribe();
    } catch (e) {
      console.warn('Error cancelling subscription:', e);
    }
  });
  activeSubscriptions.clear();
}

// Initialize auth with proper error handling
export async function initializeAuth(retries = 3): Promise<any> {
  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.warn(`Auth initialization attempt ${i + 1} failed:`, error);
      lastError = error;
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }

  console.error('Auth initialization failed after retries:', lastError);
  return null;
}

// Clean up auth state
export async function terminateSession() {
  try {
    // Cancel all pending operations
    cancelAllRequests();
    cancelAllSubscriptions();

    // Clear all Supabase subscriptions
    await supabase.removeAllChannels();

    // Sign out from Supabase
    await supabase.auth.signOut({
      scope: 'global'
    });

    // Clear storage
    localStorage.clear();
    sessionStorage.clear();

    // Notify state changes
    stateEvents.notify();
  } catch (error) {
    console.error('Error during session termination:', error);
    // Still notify state changes even if cleanup fails
    stateEvents.notify();
    throw error;
  }
}

// Set up auth state change handler
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') {
    cancelAllRequests();
    cancelAllSubscriptions();
    stateEvents.notify();
  }
});