import { Pressable, Text, View } from 'react-native';

import { RoleGuard } from '../../components/RoleGuard';
import { supabase } from '../../lib/supabase/client';

export default function DriverPlaceholder() {
  return (
    <RoleGuard role="driver">
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
    </RoleGuard>
  );
}
