import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useSessionStore } from '../../stores/session.store';

export default function AdminPlaceholder() {
  const setRole = useSessionStore((s) => s.setRole);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
      <Text className="text-2xl font-bold text-text">Fleet Command</Text>
      <Text className="text-center text-text-muted">
        Placeholder — live map, vehicle/student CRUD land in Phase 2.
      </Text>
      <Pressable
        onPress={() => {
          setRole(null);
          router.replace('/');
        }}
        className="mt-6 rounded-lg border border-border px-5 py-3 active:opacity-70"
      >
        <Text className="text-text-muted">← Back to landing</Text>
      </Pressable>
    </View>
  );
}
