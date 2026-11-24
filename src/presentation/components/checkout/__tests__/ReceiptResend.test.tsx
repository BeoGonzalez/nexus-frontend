import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DigitalReceipt } from '@/domain/models';
import { DigitalReceiptCard } from '@/presentation/components/checkout/DigitalReceiptCard';

const receipt: DigitalReceipt = {
  folio: 'BOL-1', order_id: 'o1', created_at: '2026-11-22T10:00:00.000Z', customer_name: 'Ana', customer_email: 'ana@example.com',
  payment_method: { brand: 'Visa Sandbox', last4: '4242', type: 'SIMULATED_CARD' }, transaction_id: 'SIM-1',
  items: [], subtotal_neto_clp: 0, iva_clp: 0, total_clp: 0, license_keys: [],
  issuer: { company: 'X', rut: '1', address: 'a', activity: 'b' }, email_sent: true, email_sent_at: '2026-11-22T10:00:01.000Z',
};

describe('DigitalReceiptCard reenvío', () => {
  it('si reenviar falla, muestra el motivo', async () => {
    const onResend = vi.fn().mockRejectedValue(new Error('Sin permiso para ese correo'));
    render(<DigitalReceiptCard receipt={receipt} onClose={vi.fn()} onResendEmail={onResend} />);
    await userEvent.click(screen.getByRole('button', { name: /Reenviar correo/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sin permiso para ese correo');
  });
});
