import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AdminNav } from '../../components/admin/AdminNav';
import { RoleGuard } from '../../components/RoleGuard';
import { supabase } from '../../lib/supabase/client';
import type { Vehicle } from '../../types/domain';

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

function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, plate_number, driver_name, status, driver_id')
      .order('id', { ascending: false });
    if (error) {
      Alert.alert('Failed to load vehicles', error.message);
    } else {
      setVehicles((data ?? []).map(toVehicle));
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function addVehicle() {
    if (!plate.trim() || !driverName.trim()) {
      Alert.alert('Missing fields', 'Enter a plate number and driver name.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('vehicles')
      .insert({ plate_number: plate.trim().toUpperCase(), driver_name: driverName.trim() });
    setSaving(false);
    if (error) {
      Alert.alert('Failed to add vehicle', error.message);
      return;
    }
    setPlate('');
    setDriverName('');
    load();
  }

  function confirmDelete(vehicle: Vehicle) {
    Alert.alert(
      'Delete vehicle?',
      `${vehicle.plateNumber} — this will affect any linked students.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('vehicles').delete().eq('id', vehicle.id);
            if (error) {
              Alert.alert('Failed to delete vehicle', error.message);
            } else {
              load();
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <AdminNav />
      <View className="gap-2 border-b border-border px-4 py-4">
        <Text className="text-lg font-semibold text-text">Add vehicle</Text>
        <TextInput
          value={plate}
          onChangeText={setPlate}
          placeholder="Plate number"
          placeholderTextColor="#9ca3b0"
          autoCapitalize="characters"
          className="rounded-lg border border-border bg-surface px-4 py-3 text-text"
        />
        <TextInput
          value={driverName}
          onChangeText={setDriverName}
          placeholder="Driver name"
          placeholderTextColor="#9ca3b0"
          className="rounded-lg border border-border bg-surface px-4 py-3 text-text"
        />
        <Pressable
          onPress={addVehicle}
          disabled={saving}
          className="items-center rounded-lg bg-accent px-6 py-3 active:opacity-70 disabled:opacity-40"
        >
          {saving ? (
            <ActivityIndicator color="#08090b" />
          ) : (
            <Text className="font-semibold text-bg">Add vehicle</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" color="#34d399" />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(v) => String(v.id)}
          contentContainerClassName="gap-2 p-4"
          ListEmptyComponent={
            <Text className="text-center text-text-muted">No vehicles yet.</Text>
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <View>
                <Text className="text-base font-semibold text-text">{item.plateNumber}</Text>
                <Text className="text-text-muted">
                  {item.driverName ?? 'No driver name'} · {item.status}
                  {item.driverId ? ' · linked' : ' · unlinked'}
                </Text>
              </View>
              <Pressable onPress={() => confirmDelete(item)} className="px-2 py-1">
                <Text className="text-danger">Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

export default function Vehicles() {
  return (
    <RoleGuard role="admin">
      <VehiclesScreen />
    </RoleGuard>
  );
}
