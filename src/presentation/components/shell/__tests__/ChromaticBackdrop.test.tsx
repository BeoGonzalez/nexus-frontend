import { describe, it, expect } from 'vitest';
import { useEffect } from 'react';
import { render, screen, act } from '@testing-library/react';
import { BackdropFocusProvider, useBackdropFocus } from '@/presentation/providers/BackdropFocusProvider';
import { ChromaticBackdrop } from '@/presentation/components/shell/ChromaticBackdrop';

const grabbed: { setFocus: (src: string | null) => void } = { setFocus: () => {} };
function Grab() {
  const { setFocus } = useBackdropFocus();
  useEffect(() => {
    grabbed.setFocus = setFocus;
  }, [setFocus]);
  return null;
}
const setter = (src: string | null) => grabbed.setFocus(src);

describe('ChromaticBackdrop', () => {
  it('sin foco muestra solo el campo neutro, sin imagen', () => {
    const { container } = render(
      <BackdropFocusProvider><Grab /><ChromaticBackdrop /></BackdropFocusProvider>,
    );
    expect(screen.getByTestId('backdrop-fallback')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('con foco renderiza la portada decorativa', () => {
    const { container } = render(
      <BackdropFocusProvider><Grab /><ChromaticBackdrop /></BackdropFocusProvider>,
    );
    act(() => setter('https://x.amazonaws.com/a.jpg'));
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
