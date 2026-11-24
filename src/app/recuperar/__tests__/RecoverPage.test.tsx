import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mutation = () => ({ mutateAsync: vi.fn(), isPending: false, error: null as Error | null });
const forgot = mutation();
const reset = mutation();
vi.mock('@/application/hooks/useAuthMutations', () => ({
  useForgotPasswordMutation: () => forgot,
  useResetPasswordMutation: () => reset,
}));

import RecoverPage from '@/app/recuperar/page';

const STRONG = 'Nueva#Clave2026';

async function requestCode(user = userEvent.setup()) {
  forgot.mutateAsync.mockResolvedValue({ message: 'ok' });
  render(<RecoverPage />);
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@b.cl');
  await user.click(screen.getByRole('button', { name: 'Enviar código' }));
  return user;
}

beforeEach(() => {
  forgot.mutateAsync.mockReset();
  reset.mutateAsync.mockReset();
});

describe('RecoverPage (/recuperar)', () => {
  it('paso 1: pide el correo y muestra un mensaje uniforme (anti-enumeración, A07)', async () => {
    await requestCode();
    expect(forgot.mutateAsync).toHaveBeenCalledWith({ email: 'ana@b.cl' });
    expect(await screen.findByText(/Si la cuenta existe, recibirás un código/)).toBeInTheDocument();
    expect(screen.getByLabelText('Código de verificación')).toBeInTheDocument();
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
  });

  it('muestra el mismo mensaje aunque el backend falle con 4xx (no revela si la cuenta existe)', async () => {
    forgot.mutateAsync.mockRejectedValue(Object.assign(new Error('UserNotFoundException'), { status: 400 }));
    const user = userEvent.setup();
    render(<RecoverPage />);
    await user.type(screen.getByLabelText('Correo electrónico'), 'nadie@b.cl');
    await user.click(screen.getByRole('button', { name: 'Enviar código' }));
    expect(await screen.findByText(/Si la cuenta existe, recibirás un código/)).toBeInTheDocument();
    expect(screen.queryByText(/UserNotFoundException/)).not.toBeInTheDocument();
  });

  it('una contraseña débil no se envía y se explica la política de Cognito', async () => {
    const user = await requestCode();
    await user.type(await screen.findByLabelText('Código de verificación'), '123456');
    await user.type(screen.getByLabelText('Nueva contraseña'), 'corta');
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(reset.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/12 caracteres/);
  });

  it('paso 2: restablece y ofrece ir a iniciar sesión', async () => {
    reset.mutateAsync.mockResolvedValue({ message: 'ok' });
    const user = await requestCode();
    await user.type(await screen.findByLabelText('Código de verificación'), '123456');
    await user.type(screen.getByLabelText('Nueva contraseña'), STRONG);
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(reset.mutateAsync).toHaveBeenCalledWith({
      email: 'ana@b.cl',
      confirmation_code: '123456',
      new_password: STRONG,
    });
    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  });

  it('un 429 bloquea el botón durante Retry-After (A07)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      forgot.mutateAsync.mockRejectedValue(
        Object.assign(new Error('Demasiados intentos. Inténtalo más tarde.'), { status: 429, retryAfter: 20 })
      );
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<RecoverPage />);
      await user.type(screen.getByLabelText('Correo electrónico'), 'ana@b.cl');
      await user.click(screen.getByRole('button', { name: 'Enviar código' }));
      expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Espera 20 s/ })).toBeDisabled();
      await act(async () => vi.advanceTimersByTime(20_000));
      expect(screen.getByRole('button', { name: 'Enviar código' })).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });
});
