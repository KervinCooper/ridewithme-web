import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function LoginPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
      <Text className="text-2xl font-bold text-text">Sign in</Text>
      <Text className="text-center text-text-muted">
        Placeholder — Supabase Auth (email/password per role) lands in Phase 1.
      </Text>
      <Pressable
        onPress={() => router.replace('/')}
        className="mt-6 rounded-lg border border-border px-5 py-3 active:opacity-70"
      >
        <Text className="text-text-muted">← Back to landing</Text>
      </Pressable>
    </View>
  );
}
