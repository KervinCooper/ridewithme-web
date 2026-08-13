import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AdminNav } from '../../components/admin/AdminNav';
import { RoleGuard } from '../../components/RoleGuard';
import { SelectField } from '../../components/admin/SelectField';
import { supabase } from '../../lib/supabase/client';

type LinkOption = { id: number; label: string };

function AccountsScreen() {
  const [role, setRole] = useState<'driver' | 'parent'>('driver');
  const [vehicles, setVehicles] = useState<LinkOption[]>([]);
  const [students, setStudents] = useState<LinkOption[]>([]);
  const [linkId, setLinkId] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [vehiclesRes, studentsRes] = await Promise.all([
      supabase.from('vehicles').select('id, plate_number, driver_name').order('id', { ascending: false }),
      supabase.from('students').select('id, name').order('id', { ascending: false }),
    ]);
    if (vehiclesRes.error) {
      Alert.alert('Failed to load vehicles', vehiclesRes.error.message);
    } else {
      setVehicles(
        (vehiclesRes.data ?? []).map((v) => ({
          id: v.id,
          label: `${v.plate_number} — ${v.driver_name ?? 'No driver'}`,
        })),
      );
    }
    if (studentsRes.error) {
      Alert.alert('Failed to load students', studentsRes.error.message);
    } else {
      setStudents((studentsRes.data ?? []).map((s) => ({ id: s.id, label: s.name })));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function switchRole(next: 'driver' | 'parent') {
    setRole(next);
    setLinkId(null);
  }

  async function createAccount() {
    if (!email.trim() || !password || linkId == null) {
      Alert.alert(
        'Missing fields',
        `Enter an email, password, and pick a ${role === 'driver' ? 'vehicle' : 'student'} to link.`,
      );
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('create-account', {
      body: { email: email.trim(), password, role, linkId },
    });
    setSaving(false);

    if (error) {
      Alert.alert('Failed to create account', error.message);
      return;
    }
    if (data?.error) {
      Alert.alert('Failed to create account', data.error);
      return;
    }

    Alert.alert('Account created', `${role === 'driver' ? 'Driver' : 'Parent'} account is ready.`);
    setEmail('');
    setPassword('');
    setLinkId(null);
  }

  const linkOptions = role === 'driver' ? vehicles : students;

  return (
    <View className="flex-1 bg-bg">
      <AdminNav />
      <ScrollView contentContainerClassName="gap-3 p-4">
        <Text className="text-lg font-semibold text-text">Create account</Text>

        <View className="flex-row gap-2">
          <Pressable
            onPress={() => switchRole('driver')}
            className={`flex-1 items-center rounded-lg border border-border py-3 ${role === 'driver' ? 'bg-accent' : 'bg-surface'}`}
          >
            <Text className={role === 'driver' ? 'font-semibold text-bg' : 'text-text'}>Driver</Text>
          </Pressable>
          <Pressable
            onPress={() => switchRole('parent')}
            className={`flex-1 items-center rounded-lg border border-border py-3 ${role === 'parent' ? 'bg-accent' : 'bg-surface'}`}
          >
            <Text className={role === 'parent' ? 'font-semibold text-bg' : 'text-text'}>Parent</Text>
          </Pressable>
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#9ca3b0"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          className="rounded-lg border border-border bg-surface px-4 py-3 text-text"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Initial password"
          placeholderTextColor="#9ca3b0"
          secureTextEntry
          className="rounded-lg border border-border bg-surface px-4 py-3 text-text"
        />

        <SelectField
          label={role === 'driver' ? 'Vehicle to link' : 'Student to link'}
          placeholder={role === 'driver' ? 'Select a vehicle' : 'Select a student'}
          value={linkId}
          onChange={setLinkId}
          options={linkOptions.map((o) => ({ label: o.label, value: o.id }))}
        />

        <Pressable
          onPress={createAccount}
          disabled={saving}
          className="items-center rounded-lg bg-accent px-6 py-4 active:opacity-70 disabled:opacity-40"
        >
          {saving ? (
            <ActivityIndicator color="#08090b" />
          ) : (
            <Text className="text-lg font-semibold text-bg">Create account</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

export default function Accounts() {
  return (
    <RoleGuard role="admin">
      <AccountsScreen />
    </RoleGuard>
  );
}
