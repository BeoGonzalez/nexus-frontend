import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SessionProvider, useSession } from '@/presentation/providers/SessionProvider';

function Probe() {
  const { user, loggedIn, logout, ready } = useSession();
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="name">{user?.name ?? 'anon'}</span>
      <span data-testid="logged">{String(loggedIn)}</span>
      <button onClick={() => void logout()}>salir</button>
    </div>
  );
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe('SessionProvider (sesión en cookie HttpOnly)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('restaura el perfil desde /auth/me usando la cookie (sin Authorization desde JS)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ name: 'Ana' }));
    render(<SessionProvider><Probe /></SessionProvider>);
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Ana'));
    expect(screen.getByTestId('logged')).toHaveTextContent('true');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/auth\/me$/);
    expect(init.credentials).toBe('same-origin');
    expect(init.headers).toBeUndefined();
  });

  it('si /auth/me responde 401 queda como anónimo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, 401));
    render(<SessionProvider><Probe /></SessionProvider>);
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(screen.getByTestId('name')).toHaveTextContent('anon');
    expect(screen.getByTestId('logged')).toHaveTextContent('false');
  });

  it('no marca ready hasta que el BFF resuelve la sesión', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));
    render(<SessionProvider><Probe /></SessionProvider>);
    expect(screen.getByTestId('ready')).toHaveTextContent('false');
  });

  it('purga tokens heredados de localStorage', async () => {
    localStorage.setItem('nexus_token', 't');
    localStorage.setItem('nexus_refresh_token', 'r');
    localStorage.setItem('nexus_dev_admin_active', 'true');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, 401));
    render(<SessionProvider><Probe /></SessionProvider>);
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(localStorage.getItem('nexus_token')).toBeNull();
    expect(localStorage.getItem('nexus_refresh_token')).toBeNull();
    expect(localStorage.getItem('nexus_dev_admin_active')).toBeNull();
  });

  it('logout invalida la sesión en el servidor (POST /auth/logout)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ name: 'Ana' }))
      .mockResolvedValueOnce(json({ success: true }));
    render(<SessionProvider><Probe /></SessionProvider>);
    await waitFor(() => expect(screen.getByTestId('name')).toHaveTextContent('Ana'));
    await act(async () => screen.getByText('salir').click());
    expect(screen.getByTestId('logged')).toHaveTextContent('false');
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/auth\/logout$/);
    expect(init.method).toBe('POST');
  });
});
