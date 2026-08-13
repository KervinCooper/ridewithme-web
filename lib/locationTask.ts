import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { supabase } from './supabase/client';

export const LOCATION_TASK_NAME = 'onthemuv-background-location';

// The background task runs outside the driver screen's React tree — Android
// can headless-restart the JS context to deliver a background event without
// remounting the app, so the active vehicle id has to survive that (an
// in-memory module variable wouldn't). AsyncStorage does.
const ACTIVE_VEHICLE_KEY = 'onthemuv_active_vehicle_id';

export function setActiveVehicleId(vehicleId: number | null) {
  if (vehicleId == null) {
    return AsyncStorage.removeItem(ACTIVE_VEHICLE_KEY);
  }
  return AsyncStorage.setItem(ACTIVE_VEHICLE_KEY, String(vehicleId));
}

async function getActiveVehicleId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_VEHICLE_KEY);
  return raw ? Number(raw) : null;
}

// Must be defined at module scope, imported once from app/_layout.tsx, so the
// task is registered before startLocationUpdatesAsync is ever called —
// TaskManager requires the definition to exist first, including after a cold
// start while a previous background session is still active.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error || !data) return;

    const vehicleId = await getActiveVehicleId();
    if (vehicleId == null) return;

    const latest = data.locations.at(-1);
    if (!latest) return;

    await supabase.from('rides').upsert(
      {
        vehicle_id: vehicleId,
        current_lat: latest.coords.latitude,
        current_lng: latest.coords.longitude,
        speed: latest.coords.speed ? Math.round(latest.coords.speed * 3.6) : 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vehicle_id' },
    );
  },
);
