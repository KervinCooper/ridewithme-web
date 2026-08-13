import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { supabase } from '../lib/supabase/client';
import type { Role } from '../types/domain';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface SessionState {
  session: Session | null;
  role: Role | null;
  status: AuthStatus;
  handleSession: (session: Session | null) => Promise<void>;
}

// role is DB-constrained to admin/driver/parent (or null) by the
// profiles_role_check constraint added in the Phase 1 migration.
export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  role: null,
  status: 'loading',
  handleSession: async (session) => {
    if (!session) {
      set({ session: null, role: null, status: 'signedOut' });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to load profile role', error);
    }

    set({ session, role: (data?.role as Role | null) ?? null, status: 'signedIn' });
  },
}));
