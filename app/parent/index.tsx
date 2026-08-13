import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { RoleGuard } from '../../components/RoleGuard';
import { supabase } from '../../lib/supabase/client';
import { useSessionStore } from '../../stores/session.store';
import type { Ride, StudentWithVehicle } from '../../types/domain';

const DEFAULT_REGION = {
  latitude: -26.2,
  longitude: 28.0,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

// Tighter than admin's fleet-wide view — this is a per-child close-up, matching
// the old app's zoom 16 vs admin's zoom 12.
const CHILD_DELTA = 0.02;

function ParentScreen() {
  const userId = useSessionStore((s) => s.session?.user.id);
  const mapRef = useRef<MapView>(null);

  const [student, setStudent] = useState<StudentWithVehicle | null | undefined>(undefined);
  const [ride, setRide] = useState<Ride | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data: studentRow } = await supabase
      .from('students')
      .select('id, name, status, vehicle_id, parent_id, vehicles(plate_number, driver_name, status)')
      .eq('parent_id', userId)
      .maybeSingle();

    if (!studentRow) {
      setStudent(null);
      setRide(null);
      return;
    }

    const nextStudent: StudentWithVehicle = {
      id: studentRow.id,
      name: studentRow.name,
      status: studentRow.status,
      vehicleId: studentRow.vehicle_id,
      parentId: studentRow.parent_id,
      vehicle: studentRow.vehicles as unknown as StudentWithVehicle['vehicle'],
    };
    setStudent(nextStudent);

    if (nextStudent.vehicleId != null) {
      const { data: rideRow } = await supabase
        .from('rides')
        .select('vehicle_id, current_lat, current_lng, speed, updated_at')
        .eq('vehicle_id', nextStudent.vehicleId)
        .maybeSingle();
      setRide(
        rideRow
          ? {
              vehicleId: rideRow.vehicle_id,
              currentLat: rideRow.current_lat,
              currentLng: rideRow.current_lng,
              speed: rideRow.speed,
              updatedAt: rideRow.updated_at,
            }
          : null,
      );
    } else {
      setRide(null);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Refetches the full joined record on any relevant change instead of patching state from
  // the payload directly — the old app's parent screen did `setStudent(payload.new)` on a raw
  // `students` UPDATE, which drops the joined `vehicles` sub-object (a raw payload has no join
  // data), blanking the header/SOS check until a second handler patched it back
  // (docs/BEHAVIOR.md's realtime handler #2/#3). Refetching sidesteps the whole bug class.
  useEffect(() => {
    if (!student) return;
    const channel = supabase
      .channel(`parent-sync-${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [student?.id, load]);

  useEffect(() => {
    if (ride?.currentLat == null || ride?.currentLng == null) return;
    mapRef.current?.animateToRegion(
      {
        latitude: ride.currentLat,
        longitude: ride.currentLng,
        latitudeDelta: CHILD_DELTA,
        longitudeDelta: CHILD_DELTA,
      },
      1500,
    );
  }, [ride?.currentLat, ride?.currentLng]);

  if (student === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#34d399" />
      </View>
    );
  }

  if (student === null) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
        <Text className="text-center text-text">Your account isn&apos;t linked to a child yet.</Text>
        <Text className="text-center text-text-muted">Contact your admin.</Text>
        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="rounded-lg border border-border px-5 py-3 active:opacity-70"
        >
          <Text className="text-text-muted">Sign out</Text>
        </Pressable>
      </View>
    );
  }

  const isSOS = student.vehicle?.status === 'SOS';
  const isFiveMinWarning = student.status === 'Arriving in 5 mins';

  return (
    <View className="flex-1 bg-bg">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={
          ride?.currentLat != null && ride?.currentLng != null
            ? { latitude: ride.currentLat, longitude: ride.currentLng, latitudeDelta: CHILD_DELTA, longitudeDelta: CHILD_DELTA }
            : DEFAULT_REGION
        }
      >
        {ride?.currentLat != null && ride?.currentLng != null && (
          <Marker
            coordinate={{ latitude: ride.currentLat, longitude: ride.currentLng }}
            pinColor="#34d399"
          />
        )}
      </MapView>

      <View className="absolute left-4 right-4 top-14 flex-row items-center justify-between rounded-3xl border border-border bg-surface/95 p-5">
        <View>
          <Text className="text-xl font-black uppercase italic text-text">{student.name}</Text>
          <View className="mt-2 flex-row items-center gap-2">
            <View
              className={`h-2 w-2 rounded-full ${student.status === 'Picked Up' ? 'bg-accent' : 'bg-text-muted'}`}
            />
            <Text className="text-[10px] font-black uppercase text-text-muted">
              {student.status || 'At Home'}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Text className="text-3xl font-black italic text-accent">
            {ride?.speed ?? 0} <Text className="text-[10px] font-normal not-italic text-text">KM/H</Text>
          </Text>
          <Text className="mt-1 text-[10px] font-black uppercase text-text-muted">
            {student.vehicle?.plateNumber}
          </Text>
        </View>
      </View>

      {!ride && !isSOS && (
        <View className="absolute inset-0 items-center justify-center bg-black/60">
          <View className="items-center rounded-3xl border border-border bg-surface p-8">
            <Text className="text-sm font-black uppercase italic text-accent">Vehicle offline</Text>
            <Text className="mt-2 text-[10px] font-bold text-text-muted">
              Awaiting driver ignition...
            </Text>
          </View>
        </View>
      )}

      {isFiveMinWarning && (
        <View className="absolute inset-0 items-center justify-center bg-warn/95 p-8">
          <Text className="mb-2 text-4xl">🔔</Text>
          <Text className="mb-1 text-center text-4xl font-black uppercase italic text-black">
            Driver approaching
          </Text>
          <Text className="mb-8 text-center text-sm font-black uppercase tracking-widest text-black/70">
            Arriving in 5 minutes
          </Text>
          <View className="w-full max-w-sm rounded-3xl border-4 border-black/20 bg-bg p-6">
            <Text className="text-base font-bold text-text">
              Please ensure {student.name} is ready at the pickup point.
            </Text>
          </View>
        </View>
      )}

      {isSOS && (
        <View className="absolute inset-0 items-center justify-center bg-danger/95 p-8">
          <Text className="mb-2 text-4xl">!</Text>
          <Text className="mb-1 text-center text-3xl font-black uppercase italic text-white">
            Route delayed
          </Text>
          <Text className="mb-8 text-center text-sm font-bold uppercase tracking-widest text-white/80">
            Driver has reported an issue
          </Text>
          <View className="w-full max-w-sm rounded-3xl border border-white/30 bg-black/40 p-6">
            <Text className="mb-3 text-xs text-white">
              The dispatch team has been notified and is managing the situation. Your child is
              secure.
            </Text>
            <Text className="text-[10px] font-black uppercase tracking-widest text-accent">
              Do not panic. Updates will follow.
            </Text>
          </View>
        </View>
      )}

      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="absolute bottom-8 right-4 rounded-xl border border-border bg-surface/95 px-4 py-2"
      >
        <Text className="text-[10px] font-black uppercase text-text-muted">Sign out</Text>
      </Pressable>
    </View>
  );
}

export default function Parent() {
  return (
    <RoleGuard role="parent">
      <ParentScreen />
    </RoleGuard>
  );
}
