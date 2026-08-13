import { Redirect } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { supabase } from '../../lib/supabase/client';
import { useSessionStore } from '../../stores/session.store';

export default function AdminPlaceholder() {
  const status = useSessionStore((s) => s.status);

  if (status !== 'signedIn') {
    return <Redirect href="/login" />;
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
      <Text className="text-2xl font-bold text-text">Fleet Command</Text>
      <Text className="text-center text-text-muted">
        Placeholder — live map, vehicle/student CRUD land in Phase 2.
      </Text>
      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="mt-6 rounded-lg border border-border px-5 py-3 active:opacity-70"
      >
        <Text className="text-text-muted">Sign out</Text>
      </Pressable>
    </View>
  );
}
