import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useSessionStore } from '../stores/session.store';
import type { Role } from '../types/domain';

const PORTALS: { role: Role; label: string; href: '/driver' | '/parent' | '/admin' }[] = [
  { role: 'driver', label: 'Driver Portal', href: '/driver' },
  { role: 'parent', label: 'Parent Portal', href: '/parent' },
  { role: 'admin', label: 'Admin Portal', href: '/admin' },
];

export default function Landing() {
  const role = useSessionStore((s) => s.role);
  const setRole = useSessionStore((s) => s.setRole);

  useEffect(() => {
    if (role) {
      router.replace(PORTALS.find((p) => p.role === role)?.href ?? '/');
    }
  }, [role]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
      <Text className="mb-2 text-3xl font-bold text-text">onthemuv</Text>
      <Text className="mb-8 text-center text-text-muted">
        Phase 0 scaffold — tap a portal to preview its placeholder screen.
        {'\n'}Real login lands in Phase 1.
      </Text>
      {PORTALS.map((portal) => (
        <Pressable
          key={portal.role}
          onPress={() => {
            setRole(portal.role);
            router.push(portal.href);
          }}
          className="w-full max-w-sm rounded-lg border border-border bg-surface px-6 py-4 active:opacity-70"
        >
          <Text className="text-center text-lg font-semibold text-text">
            {portal.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
