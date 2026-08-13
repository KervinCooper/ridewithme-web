import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { supabase } from '../../lib/supabase/client';
import { ROLE_ROUTES } from '../../lib/roleRoutes';
import { useSessionStore } from '../../stores/session.store';

export default function Login() {
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'signedIn' && role) {
    return <Redirect href={ROLE_ROUTES[role]} />;
  }

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    }
    // No navigation here — the auth listener in app/_layout.tsx updates the
    // session store, and the `status === 'signedIn'` check above redirects.
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-bg px-6">
      <Text className="mb-2 text-center text-3xl font-bold text-text">onthemuv</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#9ca3b0"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        className="rounded-lg border border-border bg-surface px-4 py-3 text-text"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#9ca3b0"
        secureTextEntry
        className="rounded-lg border border-border bg-surface px-4 py-3 text-text"
      />
      {error ? <Text className="text-center text-danger">{error}</Text> : null}
      <Pressable
        onPress={handleSignIn}
        disabled={loading || !email || !password}
        className="items-center rounded-lg bg-accent px-6 py-4 active:opacity-70 disabled:opacity-40"
      >
        {loading ? (
          <ActivityIndicator color="#08090b" />
        ) : (
          <Text className="text-lg font-semibold text-bg">Sign in</Text>
        )}
      </Pressable>
    </View>
  );
}
