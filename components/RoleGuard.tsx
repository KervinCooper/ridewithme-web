import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useSessionStore } from '../stores/session.store';
import type { Role } from '../types/domain';

export function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const status = useSessionStore((s) => s.status);
  const userRole = useSessionStore((s) => s.role);

  if (status !== 'signedIn' || userRole !== role) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}
