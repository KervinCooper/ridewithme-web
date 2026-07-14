import { create } from "zustand";
import type { Ride, Vehicle } from "@/types/domain";

interface RideState {
  rides: Record<number, Ride>; // keyed by vehicleId
  vehicleStatuses: Record<number, Vehicle["status"]>;
  setRide: (ride: Ride) => void;
  setVehicleStatus: (vehicleId: number, status: Vehicle["status"]) => void;
  reset: () => void;
}

export const useRideStore = create<RideState>((set) => ({
  rides: {},
  vehicleStatuses: {},
  setRide: (ride) =>
    set((s) => ({ rides: { ...s.rides, [ride.vehicleId]: ride } })),
  setVehicleStatus: (vehicleId, status) =>
    set((s) => ({
      vehicleStatuses: { ...s.vehicleStatuses, [vehicleId]: status },
    })),
  reset: () => set({ rides: {}, vehicleStatuses: {} }),
}));
