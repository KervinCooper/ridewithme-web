import type { Role } from '../types/domain';

export const ROLE_ROUTES: Record<Role, '/admin' | '/driver' | '/parent'> = {
  admin: '/admin',
  driver: '/driver',
  parent: '/parent',
};
