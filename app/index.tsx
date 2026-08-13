import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { ROLE_ROUTES } from '../lib/roleRoutes';
import { useSessionStore } from '../stores/session.store';

export default function Index() {
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#34d399" />
      </View>
    );
  }

  if (status === 'signedIn' && role) {
    return <Redirect href={ROLE_ROUTES[role]} />;
  }

  if (status === 'signedIn' && !role) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-bg px-6">
        <Text className="text-center text-text">Your account has no role assigned yet.</Text>
        <Text className="text-center text-text-muted">Contact your admin.</Text>
      </View>
    );
  }

  return <Redirect href="/login" />;
}
