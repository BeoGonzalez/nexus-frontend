// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ user: null as null | { is_admin?: boolean; role?: string } }));
vi.mock('@/infrastructure/bff/session', () => ({
  getSessionUser: vi.fn(async () => state.user),
  isAdminUser: (u: { is_admin?: boolean } | null) => Boolean(u?.is_admin),
}));
vi.mock('@/components/admin/VideoGamesCrud', () => ({ VideoGamesCrud: () => null }));

import AdminDashboardPage from '../page';
import AdminGamesPage from '../games/page';
import AdminUsersPage from '../users/page';
import AdminSettingsPage from '../settings/page';

const PAGES = [
  ['/admin', AdminDashboardPage],
  ['/admin/games', AdminGamesPage],
  ['/admin/users', AdminUsersPage],
  ['/admin/settings', AdminSettingsPage],
] as const;

afterEach(() => {
  state.user = null;
});

describe('cada página de /admin autoriza en el servidor (A01)', () => {
  it.each(PAGES)('%s no renderiza contenido a un usuario sin rol admin', async (_path, Page) => {
    state.user = { is_admin: false, role: 'customer' };
    expect(await Page()).toBeNull();
  });

  it.each(PAGES)('%s no renderiza contenido sin sesión', async (_path, Page) => {
    state.user = null;
    expect(await Page()).toBeNull();
  });

  it.each(PAGES)('%s renderiza para un administrador', async (_path, Page) => {
    state.user = { is_admin: true };
    expect(await Page()).not.toBeNull();
  });
});
