import { Pressable, Text, View } from 'react-native';

import { RoleGuard } from '../../components/RoleGuard';
import { supabase } from '../../lib/supabase/client';

export default function ParentPlaceholder() {
  return (
    <RoleGuard role="parent">
      <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
        <Text className="text-2xl font-bold text-text">Parent Tracker</Text>
        <Text className="text-center text-text-muted">
          Placeholder — live map and realtime tracking land in Phase 5.
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
