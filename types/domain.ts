export type Role = 'admin' | 'driver' | 'parent';

export type VehicleStatus = 'ACTIVE' | 'SOS';

export interface Profile {
  id: string;
  role: Role;
}

export interface Vehicle {
  id: number;
  plateNumber: string;
  driverName: string | null;
  status: VehicleStatus;
  driverId: string | null;
}

// `status` is a free-text column on the live DB (default 'Not picked'), not the fixed
// enum docs/BEHAVIOR.md's old-app audit assumed — kept as `string | null` rather than a
// union until Phase 3/5 nail down the exact set of values the new app itself writes.
export interface Student {
  id: number;
  name: string;
  status: string | null;
  vehicleId: number | null;
  parentId: string | null;
}

export interface StudentWithVehicle extends Student {
  vehicle: Pick<Vehicle, 'plateNumber' | 'driverName' | 'status'> | null;
}

export interface Ride {
  vehicleId: number | null;
  currentLat: number | null;
  currentLng: number | null;
  speed: number | null;
  updatedAt: string | null;
}

export interface RideWithVehicle extends Ride {
  vehicle: Pick<Vehicle, 'plateNumber' | 'driverName' | 'status'> | null;
}

export type AlertLevel = 'sos' | 'speeding' | 'five-minute-warning' | 'clear';

export interface Alert {
  level: AlertLevel;
  vehicleId: number;
  message: string;
}
