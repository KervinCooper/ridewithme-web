import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useSessionStore } from '../../stores/session.store';

export default function DriverPlaceholder() {
  const setRole = useSessionStore((s) => s.setRole);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
      <Text className="text-2xl font-bold text-text">Driver Terminal</Text>
      <Text className="text-center text-text-muted">
        Placeholder — manifest, GO LIVE, and SOS land in Phase 3.
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
