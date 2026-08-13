import { Redirect } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { supabase } from '../../lib/supabase/client';
import { useSessionStore } from '../../stores/session.store';

export default function DriverPlaceholder() {
  const status = useSessionStore((s) => s.status);

  if (status !== 'signedIn') {
    return <Redirect href="/login" />;
  }

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
      <Text className="text-2xl font-bold text-text">Driver Terminal</Text>
      <Text className="text-center text-text-muted">
        Placeholder — manifest, GO LIVE, and SOS land in Phase 3.
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
