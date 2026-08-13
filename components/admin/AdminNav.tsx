import { Link, usePathname } from 'expo-router';
import { Pressable, ScrollView, Text } from 'react-native';

import { supabase } from '../../lib/supabase/client';

const TABS = [
  { href: '/admin', label: 'Map' },
  { href: '/admin/vehicles', label: 'Vehicles' },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/accounts', label: 'Accounts' },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="max-h-14 flex-none border-b border-border bg-surface"
      contentContainerClassName="items-center gap-2 px-4 py-3"
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link key={tab.href} href={tab.href} asChild>
            <Pressable
              className={`rounded-md px-3 py-2 ${active ? 'bg-accent' : 'bg-surface2'}`}
            >
              <Text className={active ? 'font-semibold text-bg' : 'text-text-muted'}>
                {tab.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="ml-auto rounded-md border border-border px-3 py-2"
      >
        <Text className="text-text-muted">Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
