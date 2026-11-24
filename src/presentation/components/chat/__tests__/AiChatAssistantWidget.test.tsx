import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// No network and no LLM: the assistant hook and health query are mocked (the real one streams from Groq).
type Msg = { role: 'user' | 'assistant'; content: string };
const assistant = {
  messages: [{ role: 'assistant', content: 'Hola, soy el asistente.' }] as Msg[],
  isLoading: false,
  error: null as string | null,
  recommendedProducts: [] as Array<{ id: string; title: string; price_clp?: number }>,
  sendMessage: vi.fn(),
  clearChat: vi.fn(),
};
vi.mock('@/application/hooks/useAiAssistant', () => ({ useAiAssistant: () => assistant }));
vi.mock('@/application/hooks/useAssistantQuery', () => ({
  useAssistantHealthQuery: () => ({ data: { status: 'healthy' }, isError: false, isLoading: false }),
}));
vi.mock('@/presentation/components/3d/ChatBotOrb', () => ({ default: () => <span data-testid="orb" /> }));

import { AiChatAssistantWidget } from '@/presentation/components/chat/AiChatAssistantWidget';

beforeEach(() => {
  assistant.messages = [{ role: 'assistant', content: 'Hola, soy el asistente.' }];
  assistant.isLoading = false;
  assistant.recommendedProducts = [];
  assistant.sendMessage.mockReset();
});

describe('AiChatAssistantWidget', () => {
  it('el lanzador abre un diálogo llamado "Asistente Nexus"', async () => {
    render(<AiChatAssistantWidget catalog={[]} />);
    const launcher = screen.getByRole('button', { name: 'Abrir asistente' });
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(launcher);
    expect(await screen.findByRole('dialog', { name: 'Asistente Nexus' })).toBeInTheDocument();
    expect(launcher).toHaveAttribute('aria-expanded', 'true');
  });

  it('Esc lo cierra y devuelve el foco al lanzador', async () => {
    render(<AiChatAssistantWidget catalog={[]} />);
    const launcher = screen.getByRole('button', { name: 'Abrir asistente' });
    await userEvent.click(launcher);
    await screen.findByRole('dialog', { name: 'Asistente Nexus' });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(launcher).toHaveFocus();
  });

  it('una respuesta nueva se anuncia una vez en aria-live polite', async () => {
    const { rerender } = render(<AiChatAssistantWidget catalog={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente' }));
    const live = document.querySelector('[aria-live="polite"][data-assistant-live]') as HTMLElement;
    expect(live).not.toBeNull();

    assistant.messages = [...assistant.messages, { role: 'user', content: 'Un RPG' }, { role: 'assistant', content: 'Prueba Ruta Norte.' }];
    assistant.isLoading = true; // still streaming: nothing announced yet
    rerender(<AiChatAssistantWidget catalog={[]} />);
    expect(live).not.toHaveTextContent('Prueba Ruta Norte.');

    assistant.isLoading = false;
    rerender(<AiChatAssistantWidget catalog={[]} />);
    expect(live).toHaveTextContent('Prueba Ruta Norte.');
  });

  it('enviar usa el mismo sendMessage', async () => {
    render(<AiChatAssistantWidget catalog={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Asistente Nexus' });
    await userEvent.type(within(dialog).getByLabelText('Mensaje para el asistente'), 'Algo de terror');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Enviar mensaje' }));
    expect(assistant.sendMessage).toHaveBeenCalledWith('Algo de terror');
  });

  it('limita el mensaje a 2000 caracteres y expone un contador accesible (LLM10)', async () => {
    render(<AiChatAssistantWidget catalog={[]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir asistente' }));
    const dialog = await screen.findByRole('dialog', { name: 'Asistente Nexus' });
    const input = within(dialog).getByLabelText('Mensaje para el asistente');
    expect(input).toHaveAttribute('maxLength', '2000');

    const counterId = input.getAttribute('aria-describedby');
    expect(counterId).toBeTruthy();
    const counter = document.getElementById(counterId!)!;
    expect(counter).toHaveTextContent('2000 caracteres restantes');

    await userEvent.type(input, 'Hola');
    expect(counter).toHaveTextContent('1996 caracteres restantes');
  });

  it('se oculta mientras otro panel ocupa la pantalla', () => {
    render(<AiChatAssistantWidget catalog={[]} hidden />);
    expect(screen.queryByRole('button', { name: 'Abrir asistente' })).not.toBeInTheDocument();
  });
});
