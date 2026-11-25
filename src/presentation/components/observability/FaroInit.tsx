'use client';

import { useEffect } from 'react';
import { initFaro } from '@/infrastructure/observability/faro';

/** Arranca Grafana Faro en el navegador (no renderiza nada). Sin colector configurado no hace nada (ver faro.ts). */
export function FaroInit() {
  useEffect(() => {
    void initFaro();
  }, []);
  return null;
}
