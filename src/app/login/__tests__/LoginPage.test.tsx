import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const params = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => params,
}));

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false, error: null as Error | null });
const login = mutation();
const register = mutation();
const confirm = mutation();
const resend = mutation();
vi.mock('@/application/hooks/useAuthMutations', () => ({
  useLoginMutation: () => login,
  useRegisterMutation: () => register,
  useConfirmAccountMutation: () => confirm,
  useResendCodeMutation: () => resend,
}));

import LoginPage from '@/app/login/page';

beforeEach(() => {
  localStorage.clear();
  login.error = null;
  register.error = null;
  confirm.error = null;
  login.mutateAsync.mockReset();
});

const tooMany = (retryAfter: number) =>
  Object.assign(new Error('Demasiados intentos. Inténtalo más tarde.'), { status: 429, retryAfter });

describe('LoginPage', () => {
  it('enlaza a la recuperación de contraseña', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/recuperar');
  });

  it('un 429 en el login muestra el aviso y bloquea el botón durante Retry-After (A07)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      login.mutateAsync.mockRejectedValue(tooMany(30));
      render(<LoginPage />);
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.type(screen.getByLabelText('Correo electrónico'), 'ana@b.cl');
      await user.type(screen.getByLabelText('Contraseña'), 'secreto123');
      const submit = screen.getByRole('button', { name: /^Iniciar sesión$/ });
      await user.click(submit);

      expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument();
      const blocked = screen.getByRole('button', { name: /Espera 30 s/ });
      expect(blocked).toBeDisabled();

      await act(async () => vi.advanceTimersByTime(30_000));
      expect(screen.getByRole('button', { name: /^Iniciar sesión$/ })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cada campo tiene una etiqueta visible', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Correo electrónico')).toBeVisible();
    expect(screen.getByLabelText('Contraseña')).toBeVisible();
  });

  it('el error de credenciales sale en role=alert y los campos lo referencian', () => {
    login.error = new Error('Usuario o contraseña incorrectos');
    render(<LoginPage />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Usuario o contraseña incorrectos');
    expect(alert.id).toBeTruthy();
    expect(screen.getByLabelText('Correo electrónico').getAttribute('aria-describedby')).toContain(alert.id);
    expect(screen.getByLabelText('Contraseña').getAttribute('aria-describedby')).toContain(alert.id);
  });

  it('"Mostrar contraseña" es un botón con aria-pressed', async () => {
    render(<LoginPage />);
    const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'text');
  });

  it('cambiar a "Crear cuenta" deja el foco dentro del formulario', async () => {
    render(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    const form = screen.getByRole('form', { name: 'Crear cuenta' });
    expect(form).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByLabelText('Nombre completo')).toHaveFocus();
  });

  it('"Volver a la tienda" lleva al inicio', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: 'Volver a la tienda' })).toHaveAttribute('href', '/');
  });

  it('enviar usa la misma mutación de login', async () => {
    login.mutateAsync.mockResolvedValue({});
    render(<LoginPage />);
    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(login.mutateAsync).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secreto123' });
  });
});
