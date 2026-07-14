import { create } from "zustand";
import type { Role, Vehicle, StudentWithVehicle } from "@/types/domain";

interface SessionState {
  role: Role | null;
  admin: { authenticated: boolean } | null;
  driver: Vehicle | null;
  parent: StudentWithVehicle | null;
  setRole: (role: Role | null) => void;
  setAdmin: (admin: SessionState["admin"]) => void;
  setDriver: (driver: Vehicle | null) => void;
  setParent: (parent: StudentWithVehicle | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  role: null,
  admin: null,
  driver: null,
  parent: null,
  setRole: (role) => set({ role }),
  setAdmin: (admin) => set({ admin }),
  setDriver: (driver) => set({ driver }),
  setParent: (parent) => set({ parent }),
  clear: () => set({ role: null, admin: null, driver: null, parent: null }),
}));
