import { create } from 'zustand';

import type { Role } from '../types/domain';

interface SessionState {
  role: Role | null;
  setRole: (role: Role | null) => void;
}

// Placeholder for Phase 0: holds only the selected role so the route skeleton
// is navigable. Phase 1 replaces this with real Supabase Auth session state
// (user, access token expiry) driving the same `role` field from `profiles`.
export const useSessionStore = create<SessionState>((set) => ({
  role: null,
  setRole: (role) => set({ role }),
}));
