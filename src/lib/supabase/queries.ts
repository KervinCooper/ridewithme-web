import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";
import type {
  Vehicle,
  Student,
  StudentWithVehicle,
  Ride,
  RideWithVehicle,
} from "@/types/domain";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type StudentRow = Database["public"]["Tables"]["students"]["Row"];
type RideRow = Database["public"]["Tables"]["rides"]["Row"];
type StudentJoinedRow = StudentRow & {
  vehicles: Pick<VehicleRow, "plate_number" | "driver_name" | "status"> | null;
};
type RideJoinedRow = RideRow & {
  vehicles: Pick<VehicleRow, "plate_number" | "driver_name" | "status"> | null;
};

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    driverName: row.driver_name,
    status: row.status as Vehicle["status"],
  };
}

function toStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    parentPhone: row.parent_phone,
    vehicleId: row.vehicle_id,
    status: row.status as Student["status"],
  };
}

function toRide(row: RideRow): Ride {
  return {
    vehicleId: row.vehicle_id,
    currentLat: row.current_lat,
    currentLng: row.current_lng,
    speed: row.speed,
    updatedAt: row.updated_at,
  };
}

function toStudentWithVehicle(row: StudentJoinedRow): StudentWithVehicle {
  return {
    ...toStudent(row),
    vehicle: row.vehicles
      ? {
          plateNumber: row.vehicles.plate_number,
          driverName: row.vehicles.driver_name,
          status: row.vehicles.status as Vehicle["status"],
        }
      : null,
  };
}

function toRideWithVehicle(row: RideJoinedRow): RideWithVehicle {
  return {
    ...toRide(row),
    vehicle: row.vehicles
      ? {
          plateNumber: row.vehicles.plate_number,
          driverName: row.vehicles.driver_name,
          status: row.vehicles.status as Vehicle["status"],
        }
      : null,
  };
}

// ---- Auth ----
// NOTE: plaintext PIN comparison, matches current DB schema exactly (see
// docs/BEHAVIOR.md). Phase 6.5 replaces these with SECURITY DEFINER RPCs
// against hashed PIN columns — call sites in features/auth stay the same.

export async function authenticateAdmin(
  username: string,
  pin: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("admins")
    .select("id")
    .eq("username", username.toUpperCase().trim())
    .eq("pin", pin.trim())
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function authenticateDriver(
  plateNumber: string,
  pin: string
): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("plate_number", plateNumber.toUpperCase().trim())
    .eq("pin", pin.trim())
    .maybeSingle();
  if (error) throw error;
  return data ? toVehicle(data) : null;
}

export async function authenticateParent(
  phone: string
): Promise<StudentWithVehicle | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*, vehicles(plate_number, driver_name, status)")
    .eq("parent_phone", phone.trim())
    .single();
  // .single() errors when zero (or >1) rows match — treated as "not found",
  // matching the original unguarded `.single()` call's effective behavior.
  if (error || !data) return null;
  return toStudentWithVehicle(data);
}

// ---- Reads (admin dashboard) ----

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toVehicle);
}

export async function getStudents(): Promise<StudentWithVehicle[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*, vehicles(plate_number, driver_name, status)")
    .order("id", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toStudentWithVehicle);
}

export async function getRides(): Promise<RideWithVehicle[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("*, vehicles(plate_number, driver_name, status)");
  if (error) throw error;
  return (data ?? []).map(toRideWithVehicle);
}

// ---- Reads (driver manifest) ----

export async function getStudentsByVehicle(
  vehicleId: number
): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("status", { ascending: false })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toStudent);
}

// ---- Reads (parent tracking) ----

export async function getRideForVehicle(
  vehicleId: number
): Promise<Ride | null> {
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .maybeSingle();
  if (error) throw error;
  return data ? toRide(data) : null;
}

// ---- Writes (admin CRUD) ----

export async function addVehicle(input: {
  plateNumber: string;
  driverName: string;
  pin: string;
}): Promise<void> {
  const { error } = await supabase.from("vehicles").insert([
    {
      plate_number: input.plateNumber.toUpperCase(),
      driver_name: input.driverName,
      pin: input.pin,
      status: "ACTIVE",
    },
  ]);
  if (error) throw error;
}

export async function deleteVehicle(id: number): Promise<void> {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

export async function addStudent(input: {
  name: string;
  parentPhone: string;
  vehicleId: number;
}): Promise<void> {
  const { error } = await supabase.from("students").insert([
    {
      name: input.name,
      parent_phone: input.parentPhone,
      vehicle_id: input.vehicleId,
      status: "WAITING FOR PICKUP",
    },
  ]);
  if (error) throw error;
}

export async function deleteStudent(id: number): Promise<void> {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

// ---- Writes (driver) ----

export async function upsertRideLocation(
  vehicleId: number,
  lat: number,
  lng: number,
  speedKmh: number
): Promise<void> {
  const { error } = await supabase.from("rides").upsert(
    {
      vehicle_id: vehicleId,
      current_lat: lat,
      current_lng: lng,
      speed: speedKmh,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "vehicle_id" }
  );
  if (error) throw error;
}

export async function setVehicleStatus(
  vehicleId: number,
  status: Vehicle["status"]
): Promise<void> {
  const { error } = await supabase
    .from("vehicles")
    .update({ status })
    .eq("id", vehicleId);
  if (error) throw error;
}

export async function updateStudentStatus(
  studentId: number,
  status: Student["status"]
): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", studentId);
  if (error) throw error;
}

export async function resetVehicleManifest(vehicleId: number): Promise<void> {
  const { error } = await supabase
    .from("students")
    .update({ status: "WAITING FOR PICKUP" })
    .eq("vehicle_id", vehicleId);
  if (error) throw error;
}

// ---- Realtime (parent live sync) ----
// Kept here (not in the subscribing hook) so Supabase access stays confined
// to this one file per PART A's rules. features/tracking/useRealtimeRides
// (Phase 3) owns state updates; this just wires/tears down the channel.
// Mirrors the exact subscription shape audited in docs/BEHAVIOR.md, including
// the known edge case where a raw `students` UPDATE payload has no `vehicles`
// join — callers must not assume `onStudentChange` includes vehicle info.

export function subscribeToParentSync(
  studentId: number,
  vehicleId: number,
  handlers: {
    onRideChange: (ride: Ride) => void;
    onStudentChange: (student: Student) => void;
    onVehicleStatusChange: (status: Vehicle["status"]) => void;
  }
): RealtimeChannel {
  return supabase
    .channel(`parent-sync-${studentId}`)
    .on<RideRow>(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rides",
        filter: `vehicle_id=eq.${vehicleId}`,
      },
      (payload) => handlers.onRideChange(toRide(payload.new as RideRow))
    )
    .on<StudentRow>(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "students",
        filter: `id=eq.${studentId}`,
      },
      (payload) =>
        handlers.onStudentChange(toStudent(payload.new as StudentRow))
    )
    .on<VehicleRow>(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "vehicles",
        filter: `id=eq.${vehicleId}`,
      },
      (payload) =>
        handlers.onVehicleStatusChange(
          (payload.new as VehicleRow).status as Vehicle["status"]
        )
    )
    .subscribe();
}

export function unsubscribeChannel(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
