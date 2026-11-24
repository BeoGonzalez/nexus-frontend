import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@/presentation/components/theme/ThemeToggle';

function mockMatchMedia(dark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? dark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
  });

  it('es un grupo de radio "Tema" con tres opciones', () => {
    render(<ThemeToggle />);
    const group = screen.getByRole('radiogroup', { name: 'Tema' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Oscuro' })).not.toBeChecked();
  });

  it('al elegir Oscuro guarda la preferencia y aplica el tema', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('radio', { name: 'Oscuro' }));
    expect(localStorage.getItem('nexus-theme')).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
  });

  it('las flechas mueven la selección', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    screen.getByRole('radio', { name: 'Sistema' }).focus();
    // Hold the key: in a real browser keyup arrives after Radix moves focus (it defers with setTimeout).
    await user.keyboard('{ArrowRight>}');
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Claro' })).toBeChecked());
    await user.keyboard('{/ArrowRight}');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('arranca con la preferencia guardada', () => {
    localStorage.setItem('nexus-theme', 'dark');
    render(<ThemeToggle />);
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeChecked();
  });
});
