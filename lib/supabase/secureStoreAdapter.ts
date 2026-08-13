import * as SecureStore from 'expo-secure-store';

// expo-secure-store backs onto the iOS Keychain / Android Keystore, which caps
// individual values at ~2048 bytes. A serialized Supabase session (access +
// refresh token + user metadata) is usually well under that, but if Phase 1
// auth work starts seeing SecureStore write failures on large sessions, this
// adapter is the place to add chunking (split across `${key}_0`, `${key}_1`...).
export const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
