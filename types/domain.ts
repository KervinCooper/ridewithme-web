export type Role = 'admin' | 'driver' | 'parent';

export type VehicleStatus = 'ACTIVE' | 'SOS';

export type StudentStatus =
  | 'WAITING FOR PICKUP'
  | 'Arriving in 5 mins'
  | 'Picked Up'
  | 'Dropped';

export interface Profile {
  id: string;
  role: Role;
}

export interface Vehicle {
  id: number;
  plateNumber: string;
  driverName: string;
  status: VehicleStatus;
}

export interface Student {
  id: number;
  name: string;
  parentPhone: string;
  vehicleId: number;
  status: StudentStatus | null;
}

export interface StudentWithVehicle extends Student {
  vehicle: Pick<Vehicle, 'plateNumber' | 'driverName' | 'status'> | null;
}

export interface Ride {
  vehicleId: number;
  currentLat: number;
  currentLng: number;
  speed: number;
  updatedAt: string;
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
