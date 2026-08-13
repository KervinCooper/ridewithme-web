import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../lib/locationTask'; // registers the background task — must run before any GO LIVE
import { supabase } from '../lib/supabase/client';
import { useSessionStore } from '../stores/session.store';

export default function RootLayout() {
  const handleSession = useSessionStore((s) => s.handleSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => handleSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.subscription.unsubscribe();
  }, [handleSession]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#08090b' },
        }}
      />
    </SafeAreaProvider>
  );
}
