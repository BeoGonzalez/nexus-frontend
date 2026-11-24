import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoGamesCrud } from '../VideoGamesCrud';
import { fetchClient } from '@/infrastructure/api/fetchClient';
import { adjustStockAction, createProductAction } from '@/application/actions/adminGames';
import type { VideoGame } from '@/domain/models';

// Lectura vía BFF (fetchClient) y escritura vía Server Actions con requireAdmin (A01).
vi.mock('@/infrastructure/api/fetchClient', () => ({ fetchClient: vi.fn() }));
vi.mock('@/application/actions/adminGames', () => ({
  createProductAction: vi.fn(),
  adjustStockAction: vi.fn(),
}));

const mockGamesFromAurora: VideoGame[] = [
  {
    id: "aurora-1",
    title: "Cyberpunk 2077 (From Aurora)",
    description: "Cargado directamente de PostgreSQL",
    price_clp: 44990,
    stock: 20,
    platform: { id: "p-pc", name: "PC" },
    genres: [{ id: "g-rpg", name: "RPG" }],
    category: "RPG",
    image_url: "https://example.com/cyberpunk.jpg",
  },
  {
    id: "aurora-2",
    title: "Elden Ring (From Aurora)",
    description: "Cargado directamente de PostgreSQL",
    price_clp: 49990,
    stock: 15,
    platform: { id: "p-ps5", name: "PS5" },
    genres: [{ id: "g-action", name: "Acción" }],
    category: "Acción",
    image_url: "https://example.com/elden.jpg",
  },
  {
    id: "aurora-3",
    title: "The Legend of Zelda (From Aurora)",
    description: "Cargado directamente de PostgreSQL",
    price_clp: 54990,
    stock: 0,
    platform: { id: "p-switch", name: "Nintendo Switch" },
    genres: [{ id: "g-adv", name: "Aventura" }],
    category: "Aventura",
    image_url: "https://example.com/zelda.jpg",
  },
];

describe('VideoGamesCrud (Sin datos hardcodeados - Conectado a Aurora)', () => {
  const mockGetGames = vi.mocked(fetchClient);
  const mockCreateGame = vi.mocked(createProductAction);
  const mockAdjustStock = vi.mocked(adjustStockAction);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('1. Debe cargar y renderizar los videojuegos devueltos por la base de datos de Aurora', async () => {
    mockGetGames.mockResolvedValueOnce(mockGamesFromAurora);

    render(<VideoGamesCrud />);

    // Título y estado de conexión
    expect(screen.getByRole('heading', { name: /gestión de videojuegos/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/aurora postgresql conectado/i)).toBeInTheDocument();
      expect(screen.getByText(/cyberpunk 2077 \(from aurora\)/i)).toBeInTheDocument();
      expect(screen.getByText(/elden ring \(from aurora\)/i)).toBeInTheDocument();
    });

    // Métricas en base a los datos reales de la BD
    expect(screen.getByText(/total títulos/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // 3 juegos en BD
    expect(screen.getByText('35')).toBeInTheDocument(); // 20 + 15 + 0 unidades de stock
  });

  it('2. Debe mostrar alerta de desconexión sin datos cuando el backend/Aurora está inaccesible', async () => {
    mockGetGames.mockRejectedValueOnce(new Error('Connection refused to http://localhost:8000'));

    render(<VideoGamesCrud />);

    await waitFor(() => {
      expect(screen.getByText(/desconectado de aurora/i)).toBeInTheDocument();
      expect(screen.getByText(/sin conexión con el backend \(docker \/ aurora\)/i)).toBeInTheDocument();
      expect(screen.getByText(/no se han cargado datos porque no hay juegos hardcodeados/i)).toBeInTheDocument();
    });

    // Asegura que no hay ningún juego hardcodeado en pantalla
    expect(screen.queryByText(/phantom liberty/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/shadow of the erdtree/i)).not.toBeInTheDocument();
  });

  it('3. Debe filtrar los videojuegos obtenidos de la base de datos al buscar', async () => {
    mockGetGames.mockResolvedValueOnce(mockGamesFromAurora);
    const user = userEvent.setup();

    render(<VideoGamesCrud />);

    await waitFor(() => {
      expect(screen.getByText(/cyberpunk 2077 \(from aurora\)/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por título/i);
    await user.type(searchInput, 'Zelda');

    expect(screen.getByText(/the legend of zelda \(from aurora\)/i)).toBeInTheDocument();
    expect(screen.queryByText(/cyberpunk 2077 \(from aurora\)/i)).not.toBeInTheDocument();
  });

  it('4. Debe enviar la petición de creación a la API del backend al guardar un juego', async () => {
    mockGetGames.mockResolvedValueOnce(mockGamesFromAurora);
    const user = userEvent.setup();

    const createdGame: VideoGame = {
      id: "aurora-4",
      title: "Metroid Prime 4",
      description: "Nuevo juego creado en Aurora",
      price_clp: 49990,
      stock: 10,
      platform: { id: "p-switch", name: "Nintendo Switch" },
      genres: [{ id: "g-action", name: "Acción" }],
      category: "Acción",
      image_url: "https://example.com/metroid.jpg",
    };
    mockCreateGame.mockResolvedValueOnce({ success: true, data: createdGame });

    render(<VideoGamesCrud />);

    await waitFor(() => {
      expect(screen.getByText(/cyberpunk 2077 \(from aurora\)/i)).toBeInTheDocument();
    });

    // Abrir modal de creación
    const newGameButton = screen.getByRole('button', { name: /nuevo videojuego/i });
    await user.click(newGameButton);

    // Llenar campos requeridos
    const titleInput = screen.getByPlaceholderText(/ej\. cyberpunk 2077/i);
    const descInput = screen.getByPlaceholderText(/sinopsis, mecánicas/i);

    await user.type(titleInput, 'Metroid Prime 4');
    await user.type(descInput, 'Nuevo juego creado en Aurora');

    // Submit
    const submitButton = screen.getByRole('button', { name: /guardar en aurora/i });
    await user.click(submitButton);

    expect(mockCreateGame).toHaveBeenCalledTimes(1);
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Metroid Prime 4',
        description: 'Nuevo juego creado en Aurora',
      })
    );
  });

  it('5. Ajustar stock usa la Server Action con el delta (+1)', async () => {
    mockGetGames.mockResolvedValueOnce(mockGamesFromAurora);
    mockAdjustStock.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();

    render(<VideoGamesCrud />);
    await waitFor(() => expect(screen.getByText(/cyberpunk 2077 \(from aurora\)/i)).toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: /sumar 1 unidad/i })[0]);

    expect(mockAdjustStock).toHaveBeenCalledWith('aurora-1', 1);
    await waitFor(() => expect(screen.getByText('36')).toBeInTheDocument()); // 35 + 1
  });

  it('6. Editar y Eliminar no se ofrecen: el backend no expone esas operaciones', async () => {
    mockGetGames.mockResolvedValueOnce(mockGamesFromAurora);
    render(<VideoGamesCrud />);
    await waitFor(() => expect(screen.getByText(/cyberpunk 2077 \(from aurora\)/i)).toBeInTheDocument());

    expect(screen.queryByTitle(/editar videojuego/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/eliminar videojuego/i)).not.toBeInTheDocument();
    expect(screen.getByText(/editar y eliminar no están disponibles/i)).toBeInTheDocument();
  });

  it('7. La lista se pide al BFF del mismo origen', async () => {
    mockGetGames.mockResolvedValueOnce(mockGamesFromAurora);
    render(<VideoGamesCrud />);
    await waitFor(() => expect(mockGetGames).toHaveBeenCalledWith('/api/v1/catalog/products'));
  });
});
