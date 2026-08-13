import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { RoleGuard } from '../../components/RoleGuard';
import { LOCATION_TASK_NAME, setActiveVehicleId } from '../../lib/locationTask';
import { enqueue, startOfflineQueueListener } from '../../lib/offlineQueue';
import { supabase } from '../../lib/supabase/client';
import { useSessionStore } from '../../stores/session.store';
import type { Student, Vehicle } from '../../types/domain';

const THEME_STORAGE_KEY = 'onthemuv_driver_theme';

const dayTheme = {
  pageBg: 'bg-zinc-100',
  pageText: 'text-black',
  card: 'bg-white border-zinc-300',
  textMuted: 'text-zinc-500',
  highlight: 'text-accent-2',
  dropBtn: 'bg-black text-white border-black',
  warnBtn: 'bg-yellow-100 text-yellow-800 border-yellow-300',
};

const nightTheme = {
  pageBg: 'bg-bg',
  pageText: 'text-text',
  card: 'bg-surface border-border',
  textMuted: 'text-text-muted',
  highlight: 'text-accent',
  dropBtn: 'bg-surface2 text-text border-border',
  warnBtn: 'bg-warn/20 text-warn border-warn/40',
};

function toVehicle(row: {
  id: number;
  plate_number: string;
  driver_name: string | null;
  status: string;
  driver_id: string | null;
}): Vehicle {
  return {
    id: row.id,
    plateNumber: row.plate_number,
    driverName: row.driver_name,
    status: row.status as Vehicle['status'],
    driverId: row.driver_id,
  };
}

function DriverScreen() {
  const userId = useSessionStore((s) => s.session?.user.id);

  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [isDayMode, setIsDayMode] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (saved === 'day') setIsDayMode(true);
    });
  }, []);

  function toggleTheme() {
    const next = !isDayMode;
    setIsDayMode(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next ? 'day' : 'night');
  }

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('vehicles')
      .select('id, plate_number, driver_name, status, driver_id')
      .eq('driver_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        const v = data ? toVehicle(data) : null;
        setVehicle(v);
        if (v) setSosActive(v.status === 'SOS');
      });
  }, [userId]);

  const fetchManifest = useCallback(async () => {
    if (!vehicle) return;
    const { data } = await supabase
      .from('students')
      .select('id, name, status, vehicle_id, parent_id')
      .eq('vehicle_id', vehicle.id)
      .order('status', { ascending: false })
      .order('name', { ascending: true });
    setStudents(
      (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        vehicleId: row.vehicle_id,
        parentId: row.parent_id,
      })),
    );
  }, [vehicle]);

  useEffect(() => {
    if (vehicle) fetchManifest();
  }, [vehicle, fetchManifest]);

  useEffect(() => {
    const subscription = startOfflineQueueListener(fetchManifest);
    return () => subscription.remove();
  }, [fetchManifest]);

  // GO LIVE starts the background task (lib/locationTask.ts) rather than a foreground-only
  // watch — one code path that keeps updating whether the app is foregrounded or not, instead
  // of a parallel foreground implementation to maintain alongside it.
  useEffect(() => {
    if (!vehicle) return;

    if (isLive) {
      (async () => {
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status !== 'granted') {
          Alert.alert('Location permission needed', 'Enable location access to go live.');
          setIsLive(false);
          return;
        }
        const bg = await Location.requestBackgroundPermissionsAsync();
        if (bg.status !== 'granted') {
          Alert.alert(
            'Background location needed',
            'Allow "Always" location access so tracking continues while the app is backgrounded.',
          );
          setIsLive(false);
          return;
        }
        await setActiveVehicleId(vehicle.id);
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
          foregroundService: {
            notificationTitle: 'onthemuv is tracking this trip',
            notificationBody: `${vehicle.plateNumber} — tap to return to the app`,
          },
        });
      })();
    } else {
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then((started) => {
        if (started) Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      });
      setActiveVehicleId(null);
    }
  }, [isLive, vehicle]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 4000);
  }

  // Only treats a failure as "offline, queue it" when the device is actually
  // disconnected — a real error (bad data, RLS) still surfaces immediately
  // rather than being silently swallowed into the queue forever.
  async function isOffline() {
    const state = await Network.getNetworkStateAsync();
    return !state.isConnected;
  }

  async function toggleSOS() {
    if (!vehicle) return;
    const newStatus = sosActive ? 'ACTIVE' : 'SOS';
    const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', vehicle.id);
    if (error) {
      if (await isOffline()) {
        await enqueue({ type: 'vehicleStatus', vehicleId: vehicle.id, status: newStatus });
        setSosActive(!sosActive);
        showToast('Saved locally — will sync when back online.');
      } else {
        Alert.alert('Failed to update SOS', error.message);
      }
      return;
    }
    setSosActive(!sosActive);
  }

  async function updateStatus(id: number, status: string, name: string) {
    const { error } = await supabase.from('students').update({ status }).eq('id', id);
    if (error) {
      if (await isOffline()) {
        setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
        await enqueue({ type: 'studentStatus', studentId: id, status });
        showToast('Saved locally — will sync when back online.');
      } else {
        Alert.alert('Failed to update status', error.message);
      }
      return;
    }
    fetchManifest();
    if (status === 'Dropped') {
      showToast(`Marked ${name} as dropped off.`);
    } else if (status === 'Arriving in 5 mins') {
      showToast(`Marked 5-minute warning for ${name}.`);
    }
  }

  function resetManifest() {
    if (!vehicle) return;
    Alert.alert(
      'Start new shift?',
      "This will reset all passengers to 'WAITING'.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('students')
              .update({ status: 'WAITING FOR PICKUP' })
              .eq('vehicle_id', vehicle.id);
            if (error) {
              if (await isOffline()) {
                setStudents((prev) => prev.map((s) => ({ ...s, status: 'WAITING FOR PICKUP' })));
                await enqueue({ type: 'bulkReset', vehicleId: vehicle.id });
                showToast('Saved locally — will sync when back online.');
              } else {
                Alert.alert('Failed to reset route', error.message);
              }
              return;
            }
            fetchManifest();
            showToast('Route reset for new shift.');
          },
        },
      ],
    );
  }

  const t = isDayMode ? dayTheme : nightTheme;

  if (vehicle === undefined) {
    return (
      <View className={`flex-1 items-center justify-center ${nightTheme.pageBg}`}>
        <ActivityIndicator color="#34d399" />
      </View>
    );
  }

  if (vehicle === null) {
    return (
      <View className={`flex-1 items-center justify-center gap-4 px-6 ${nightTheme.pageBg}`}>
        <Text className={`text-center ${nightTheme.pageText}`}>
          Your account isn&apos;t linked to a vehicle yet.
        </Text>
        <Text className={`text-center ${nightTheme.textMuted}`}>Contact your admin.</Text>
        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="rounded-lg border border-border px-5 py-3 active:opacity-70"
        >
          <Text className={nightTheme.textMuted}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${t.pageBg}`}>
      {toast ? (
        <View className="absolute left-4 right-4 top-4 z-50 rounded-2xl bg-accent p-4">
          <Text className="text-center font-bold uppercase text-bg">✓ {toast}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerClassName="gap-4 p-4 pb-10">
        <View className="flex-row justify-end gap-2">
          <Pressable
            onPress={() => supabase.auth.signOut()}
            className={`rounded-xl border px-4 py-2 ${t.card}`}
          >
            <Text className={`text-[10px] font-black uppercase ${t.pageText}`}>Sign out</Text>
          </Pressable>
          <Pressable onPress={toggleTheme} className={`rounded-xl border px-4 py-2 ${t.card}`}>
            <Text className={`text-[10px] font-black uppercase ${t.pageText}`}>
              {isDayMode ? '☀ Day' : '☾ Night'}
            </Text>
          </Pressable>
        </View>

        <View
          className={`items-center rounded-3xl border-2 p-6 ${
            sosActive
              ? 'border-danger bg-danger/20'
              : isLive
                ? 'border-accent bg-transparent'
                : t.card
          }`}
        >
          <Text className={`mb-1 text-3xl font-black uppercase italic ${t.pageText}`}>
            {vehicle.plateNumber}
          </Text>
          <Text className={`mb-4 text-sm font-bold uppercase tracking-widest ${t.textMuted}`}>
            {vehicle.driverName ?? ''}
          </Text>
          <View className="w-full flex-row gap-2">
            <Pressable
              onPress={() => setIsLive(!isLive)}
              className={`flex-1 items-center rounded-2xl py-5 ${isLive ? t.card : 'bg-accent'}`}
            >
              <Text className={`text-lg font-black uppercase ${isLive ? t.pageText : 'text-bg'}`}>
                {isLive ? 'END SHIFT' : 'GO LIVE'}
              </Text>
            </Pressable>
            <Pressable
              onPress={toggleSOS}
              className={`flex-1 items-center rounded-2xl py-5 ${
                sosActive ? 'bg-danger' : 'border border-danger/40 bg-danger/10'
              }`}
            >
              <Text className={`text-lg font-black uppercase ${sosActive ? 'text-white' : 'text-danger'}`}>
                {sosActive ? 'SOS ACTIVE' : 'SOS / DELAY'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={resetManifest} className={`items-center rounded-2xl border py-4 ${t.card}`}>
          <Text className={`text-xs font-black uppercase tracking-widest ${t.textMuted}`}>
            🔄 Start new shift (reset route)
          </Text>
        </Pressable>

        {students.map((s) => (
          <View key={s.id} className={`gap-3 rounded-3xl border p-5 ${t.card}`}>
            <View>
              <Text className={`text-2xl font-black italic uppercase ${t.pageText}`}>{s.name}</Text>
              <Text
                className={`mt-1 text-sm font-black uppercase ${
                  s.status === 'Picked Up'
                    ? t.highlight
                    : s.status === 'Arriving in 5 mins'
                      ? 'text-warn'
                      : t.textMuted
                }`}
              >
                {s.status ?? 'WAITING FOR PICKUP'}
              </Text>
            </View>

            {s.status !== 'Picked Up' && s.status !== 'Dropped' && (
              <>
                {s.status !== 'Arriving in 5 mins' && (
                  <Pressable
                    onPress={() => updateStatus(s.id, 'Arriving in 5 mins', s.name)}
                    className={`items-center rounded-2xl border py-3 ${t.warnBtn}`}
                  >
                    <Text className="text-sm font-black uppercase">🔔 Send 5 min warning</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => updateStatus(s.id, 'Picked Up', s.name)}
                  className="items-center rounded-2xl bg-accent py-5"
                >
                  <Text className="text-lg font-black uppercase text-bg">Pick up passenger</Text>
                </Pressable>
              </>
            )}

            {s.status === 'Picked Up' && (
              <Pressable
                onPress={() => updateStatus(s.id, 'Dropped', s.name)}
                className={`items-center rounded-2xl border py-5 ${t.dropBtn}`}
              >
                <Text className="text-lg font-black uppercase">Drop off</Text>
              </Pressable>
            )}

            {s.status === 'Dropped' && (
              <Pressable
                onPress={() => updateStatus(s.id, 'WAITING FOR PICKUP', s.name)}
                className="items-center rounded-2xl border border-border py-3"
              >
                <Text className={`text-xs font-black uppercase ${t.textMuted}`}>↺ Undo drop off</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function Driver() {
  return (
    <RoleGuard role="driver">
      <DriverScreen />
    </RoleGuard>
  );
}
