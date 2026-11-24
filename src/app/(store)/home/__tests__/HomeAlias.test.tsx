import { describe, it, expect, vi } from 'vitest';

const permanentRedirect = vi.fn();
vi.mock('next/navigation', () => ({ permanentRedirect: (url: string) => permanentRedirect(url) }));

import HomeAlias from '@/app/(store)/home/page';

describe('/home', () => {
  it('redirige de forma permanente al inicio en /', () => {
    HomeAlias();
    expect(permanentRedirect).toHaveBeenCalledWith('/');
  });
});
