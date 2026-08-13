import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';

import { AdminNav } from '../../components/admin/AdminNav';
import { RoleGuard } from '../../components/RoleGuard';
import { darkMapStyle } from '../../lib/darkMapStyle';
import { supabase } from '../../lib/supabase/client';
import type { RideWithVehicle, StudentWithVehicle, Vehicle } from '../../types/domain';

const SPEEDING_THRESHOLD_KMH = 80;

const DEFAULT_REGION = {
  latitude: -26.2,
  longitude: 28.0,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

type VehicleRow = {
  id: number;
  plate_number: string;
  driver_name: string | null;
  status: string;
  driver_id: string | null;
};

function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    driverName: row.driver_name,
    status: row.status as Vehicle['status'],
    driverId: row.driver_id,
  };
}

function FleetCommandScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [students, setStudents] = useState<StudentWithVehicle[]>([]);
  const [rides, setRides] = useState<RideWithVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [vehiclesRes, studentsRes, ridesRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, plate_number, driver_name, status, driver_id')
        .order('id', { ascending: false }),
      supabase
        .from('students')
        .select('id, name, status, vehicle_id, parent_id, vehicles(plate_number, driver_name, status)')
        .order('id', { ascending: false }),
      supabase
        .from('rides')
        .select('vehicle_id, current_lat, current_lng, speed, updated_at, vehicles(plate_number, driver_name, status)'),
    ]);

    if (vehiclesRes.data) setVehicles(vehiclesRes.data.map(toVehicle));
    if (studentsRes.data) {
      setStudents(
        studentsRes.data.map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status,
          vehicleId: row.vehicle_id,
          parentId: row.parent_id,
          vehicle: row.vehicles as unknown as StudentWithVehicle['vehicle'],
        })),
      );
    }
    if (ridesRes.data) {
      setRides(
        ridesRes.data.map((row) => ({
          vehicleId: row.vehicle_id,
          currentLat: row.current_lat,
          currentLng: row.current_lng,
          speed: row.speed,
          updatedAt: row.updated_at,
          vehicle: row.vehicles as unknown as RideWithVehicle['vehicle'],
        })),
      );
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Refetch-on-any-change rather than patching state from the payload directly —
  // deliberately simpler than the old parent screen's payload-merge approach,
  // which is exactly what caused the join-drop bug noted in docs/BEHAVIOR.md.
  useEffect(() => {
    const channel = supabase
      .channel('admin-fleet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const mappedRides = rides.filter((r) => r.currentLat != null && r.currentLng != null);

  const alerts = vehicles.map((vehicle) => {
    const ride = rides.find((r) => r.vehicleId === vehicle.id);
    const isSpeeding = !!ride && (ride.speed ?? 0) > SPEEDING_THRESHOLD_KMH;
    const level = vehicle.status === 'SOS' ? 'sos' : isSpeeding ? 'speeding' : 'clear';
    return { vehicle, ride, level: level as 'sos' | 'speeding' | 'clear' };
  });

  if (loading) {
    return (
      <View className="flex-1 bg-bg">
        <AdminNav />
        <ActivityIndicator className="mt-8" color="#34d399" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <AdminNav />
      <View className="h-72 border-b border-border">
        <MapView style={{ flex: 1 }} initialRegion={DEFAULT_REGION} customMapStyle={darkMapStyle}>
          {mappedRides.map((ride) => (
            <Marker
              key={ride.vehicleId ?? undefined}
              coordinate={{ latitude: ride.currentLat!, longitude: ride.currentLng! }}
              pinColor="#34d399"
            >
              <Callout>
                <View>
                  <Text>{ride.vehicle?.plateNumber ?? 'Unknown plate'}</Text>
                  <Text>{ride.speed ?? 0} km/h</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
        <View className="absolute left-3 top-3 rounded-md bg-surface/90 px-3 py-1.5">
          <Text className="text-text-muted">Active vehicles on map: {mappedRides.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="gap-6 p-4">
        <View className="gap-2">
          <Text className="text-lg font-semibold text-text">Live alerts</Text>
          {alerts.length === 0 ? (
            <Text className="text-text-muted">No vehicles yet.</Text>
          ) : (
            alerts.map(({ vehicle, ride, level }) => (
              <View
                key={vehicle.id}
                className={`flex-row items-center justify-between rounded-lg border px-4 py-3 ${
                  level === 'sos'
                    ? 'border-danger bg-danger/10'
                    : level === 'speeding'
                      ? 'border-warn bg-warn/10'
                      : 'border-border bg-surface'
                }`}
              >
                <Text className="text-text">
                  {vehicle.plateNumber} — {vehicle.driverName ?? 'No driver'}
                </Text>
                <Text
                  className={
                    level === 'sos' ? 'text-danger' : level === 'speeding' ? 'text-warn' : 'text-accent'
                  }
                >
                  {level === 'sos'
                    ? 'SOS Triggered'
                    : level === 'speeding'
                      ? `Speed (${ride?.speed ?? 0}km/h)`
                      : 'Clear'}
                </Text>
              </View>
            ))
          )}
        </View>

        <View className="gap-2">
          <Text className="text-lg font-semibold text-text">Live route</Text>
          {students.length === 0 ? (
            <Text className="text-text-muted">No students yet.</Text>
          ) : (
            students.map((student) => (
              <View
                key={student.id}
                className={`flex-row items-center justify-between rounded-lg border px-4 py-3 ${
                  student.status === 'Picked Up' ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                }`}
              >
                <Text className="text-text">
                  {student.name} — {student.vehicle?.plateNumber ?? 'No vehicle'}
                </Text>
                <Text className="text-text-muted">{student.status ?? 'Waiting'}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default function FleetCommand() {
  return (
    <RoleGuard role="admin">
      <FleetCommandScreen />
    </RoleGuard>
  );
}
