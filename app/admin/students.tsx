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
import { SelectField } from '../../components/admin/SelectField';
import { supabase } from '../../lib/supabase/client';
import type { StudentWithVehicle, Vehicle } from '../../types/domain';

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

function StudentsScreen() {
  const [students, setStudents] = useState<StudentWithVehicle[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [vehicleId, setVehicleId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [studentsRes, vehiclesRes] = await Promise.all([
      supabase
        .from('students')
        .select('id, name, status, vehicle_id, parent_id, vehicles(plate_number, driver_name, status)')
        .order('id', { ascending: false }),
      supabase
        .from('vehicles')
        .select('id, plate_number, driver_name, status, driver_id')
        .order('id', { ascending: false }),
    ]);

    if (studentsRes.error) {
      Alert.alert('Failed to load students', studentsRes.error.message);
    } else {
      setStudents(
        (studentsRes.data ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status,
          vehicleId: row.vehicle_id,
          parentId: row.parent_id,
          vehicle: row.vehicles as unknown as StudentWithVehicle['vehicle'],
        })),
      );
    }

    if (vehiclesRes.error) {
      Alert.alert('Failed to load vehicles', vehiclesRes.error.message);
    } else {
      setVehicles((vehiclesRes.data ?? []).map(toVehicle));
    }

    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function addStudent() {
    if (!name.trim() || vehicleId == null) {
      Alert.alert('Missing fields', 'Enter a name and pick a vehicle.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('students')
      .insert({ name: name.trim(), vehicle_id: vehicleId });
    setSaving(false);
    if (error) {
      Alert.alert('Failed to add student', error.message);
      return;
    }
    setName('');
    setVehicleId(null);
    load();
  }

  function confirmDelete(student: StudentWithVehicle) {
    Alert.alert('Remove student?', student.name, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('students').delete().eq('id', student.id);
          if (error) {
            Alert.alert('Failed to remove student', error.message);
          } else {
            load();
          }
        },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-bg">
      <AdminNav />
      <View className="gap-2 border-b border-border px-4 py-4">
        <Text className="text-lg font-semibold text-text">Add student</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Student name"
          placeholderTextColor="#9ca3b0"
          className="rounded-lg border border-border bg-surface px-4 py-3 text-text"
        />
        <SelectField
          label="Vehicle"
          placeholder="Select a vehicle"
          value={vehicleId}
          onChange={setVehicleId}
          options={vehicles.map((v) => ({
            label: `${v.plateNumber} — ${v.driverName ?? 'No driver'}`,
            value: v.id,
          }))}
        />
        <Pressable
          onPress={addStudent}
          disabled={saving}
          className="items-center rounded-lg bg-accent px-6 py-3 active:opacity-70 disabled:opacity-40"
        >
          {saving ? (
            <ActivityIndicator color="#08090b" />
          ) : (
            <Text className="font-semibold text-bg">Add student</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" color="#34d399" />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(s) => String(s.id)}
          contentContainerClassName="gap-2 p-4"
          ListEmptyComponent={
            <Text className="text-center text-text-muted">No students yet.</Text>
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <View>
                <Text className="text-base font-semibold text-text">{item.name}</Text>
                <Text className="text-text-muted">
                  {item.vehicle?.plateNumber ?? 'No vehicle'} · {item.status ?? 'No status'}
                  {item.parentId ? ' · linked' : ' · unlinked'}
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

export default function Students() {
  return (
    <RoleGuard role="admin">
      <StudentsScreen />
    </RoleGuard>
  );
}
