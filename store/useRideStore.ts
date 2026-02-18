import { create } from 'zustand';

interface RideState {
  driverLocation: { lat: number; lng: number } | null;
  setLocation: (loc: { lat: number; lng: number }) => void;
}

export const useRideStore = create<RideState>((set) => ({
  driverLocation: null,
  setLocation: (loc) => set({ driverLocation: loc }),
}));