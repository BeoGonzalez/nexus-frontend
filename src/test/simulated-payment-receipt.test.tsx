import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DigitalReceiptCard } from '@/presentation/components/checkout/DigitalReceiptCard';
import type { DigitalReceipt } from '@/domain/models';

const mockReceipt: DigitalReceipt = {
  folio: 'BOL-2026-NEXUS-84920',
  order_id: 'ord-sim-test-1234',
  created_at: '2026-10-27T05:00:00.000Z',
  customer_name: 'Alex Gamer',
  customer_email: 'alex.gamer@nexus-store.cl',
  payment_method: {
    brand: 'Visa Sandbox',
    last4: '4242',
    type: 'SIMULATED_CARD',
  },
  transaction_id: 'SIM-TXN-2026-ABC123',
  items: [
    {
      product_id: 'prod-spiderman-2',
      title: "Marvel's Spider-Man 2",
      quantity: 1,
      unit_price_clp: 49990,
      subtotal_clp: 49990,
    },
    {
      product_id: 'prod-gow-ragnarok',
      title: 'God of War Ragnarök',
      quantity: 1,
      unit_price_clp: 44990,
      subtotal_clp: 44990,
    },
  ],
  subtotal_neto_clp: 79815,
  iva_clp: 15165,
  total_clp: 94980,
  license_keys: [
    {
      product_id: 'prod-spiderman-2',
      product_title: "Marvel's Spider-Man 2",
      key: 'NEXUS-SPID-ERM2-7777',
    },
    {
      product_id: 'prod-gow-ragnarok',
      product_title: 'God of War Ragnarök',
      key: 'NEXUS-KRAT-OS99-8888',
    },
  ],
  issuer: {
    company: 'NEXUS DIGITAL STORE SpA',
    rut: '76.892.140-K',
    address: 'Av. Providencia 1208, Of. 601, Santiago, Chile',
    activity: 'Venta de Software y Licencias Digitales',
  },
  email_sent: true,
  email_sent_at: '2026-10-27T05:00:01.000Z',
};

describe('Simulated Payment & Electronic Boleta / Receipt Component', () => {
  it('1. Debe renderizar el encabezado fiscal con RUT, Folio y Emisor', () => {
    render(<DigitalReceiptCard receipt={mockReceipt} onClose={vi.fn()} />);

    expect(screen.getByText('¡Pago Simulado Exitoso!')).toBeInTheDocument();
    expect(screen.getByText(/N° BOL-2026-NEXUS-84920/)).toBeInTheDocument();
    expect(screen.getByText(/76.892.140-K/)).toBeInTheDocument();
    expect(screen.getByText(/NEXUS DIGITAL STORE/)).toBeInTheDocument();
  });

  it('2. Debe mostrar los datos del cliente, transacción simulada y método de pago', () => {
    render(<DigitalReceiptCard receipt={mockReceipt} onClose={vi.fn()} />);

    expect(screen.getByText('Alex Gamer')).toBeInTheDocument();
    expect(screen.getAllByText('alex.gamer@nexus-store.cl').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/SIM-TXN-2026-ABC123/)).toBeInTheDocument();
    expect(screen.getByText(/Visa Sandbox/)).toBeInTheDocument();
    expect(screen.getByText(/•••• 4242/)).toBeInTheDocument();
  });

  it('3. Debe detallar los juegos comprados y el desglose de IVA (19%) y Total en CLP', () => {
    render(<DigitalReceiptCard receipt={mockReceipt} onClose={vi.fn()} />);

    expect(screen.getAllByText("Marvel's Spider-Man 2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('God of War Ragnarök').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/79.815/)).toBeInTheDocument(); // Subtotal neto
    expect(screen.getByText(/15.165/)).toBeInTheDocument(); // IVA 19%
    expect(screen.getByText(/94.980 CLP/)).toBeInTheDocument(); // Total CLP
  });

  it('4. Debe presentar las claves de activación únicas para cada juego', () => {
    render(<DigitalReceiptCard receipt={mockReceipt} onClose={vi.fn()} />);

    expect(screen.getByText('NEXUS-SPID-ERM2-7777')).toBeInTheDocument();
    expect(screen.getByText('NEXUS-KRAT-OS99-8888')).toBeInTheDocument();
  });

  it('5. Debe permitir copiar las claves con interacción accesible', async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<DigitalReceiptCard receipt={mockReceipt} onClose={vi.fn()} />);

    const copyButtons = screen.getAllByRole('button', { name: /copiar/i });
    expect(copyButtons.length).toBeGreaterThan(0);

    fireEvent.click(copyButtons[0]);
    expect(writeTextMock).toHaveBeenCalled();
  });

  it('6. Debe disparar la función onClose al hacer clic en Finalizar', () => {
    const handleClose = vi.fn();
    render(<DigitalReceiptCard receipt={mockReceipt} onClose={handleClose} />);

    const finishButton = screen.getByRole('button', { name: /FINALIZAR Y VOLVER A LA TIENDA/i });
    fireEvent.click(finishButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
