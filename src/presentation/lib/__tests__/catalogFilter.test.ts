import { describe, it, expect } from 'vitest';
import type { VideoGame } from '@/domain/models';
import {
  filterCatalog,
  deriveFacets,
  parseFilters,
  filtersToSearch,
  type CatalogFilters,
} from '@/presentation/lib/catalogFilter';

// Local fixture for the unit test only — never shipped.
const games: VideoGame[] = [
  {
    id: '1',
    title: 'Ruta Norte',
    price_clp: 1,
    stock: 1,
    platform: { id: 'p1', name: 'PS5' },
    genres: [{ id: 'g1', name: 'Acción' }],
    description: 'Una aventura de mundo abierto',
  },
  {
    id: '2',
    title: 'Faro',
    price_clp: 1,
    stock: 1,
    platform: { id: 'p2', name: 'PC' },
    genres: [{ id: 'g2', name: 'RPG' }],
  },
  {
    id: '3',
    title: 'Marea Baja',
    price_clp: 1,
    stock: 1,
    platform: { id: 'p1', name: 'PS5' },
    genres: [{ id: 'g2', name: 'RPG' }],
  },
];

const none: CatalogFilters = { q: '', platforms: [], genres: [] };

describe('filterCatalog', () => {
  it('sin filtros devuelve todo', () => {
    expect(filterCatalog(games, none)).toHaveLength(3);
  });

  it('busca por título sin distinguir mayúsculas', () => {
    expect(filterCatalog(games, { ...none, q: '  FARO ' }).map((g) => g.id)).toEqual(['2']);
  });

  it('dos plataformas se combinan como unión', () => {
    expect(filterCatalog(games, { ...none, platforms: ['PS5', 'PC'] })).toHaveLength(3);
    expect(filterCatalog(games, { ...none, platforms: ['PC'] }).map((g) => g.id)).toEqual(['2']);
  });

  it('el género también coincide por la descripción (comportamiento heredado)', () => {
    expect(filterCatalog(games, { ...none, genres: ['mundo abierto'] }).map((g) => g.id)).toEqual(['1']);
  });

  it('plataforma y género se combinan como intersección', () => {
    expect(filterCatalog(games, { ...none, platforms: ['PS5'], genres: ['RPG'] }).map((g) => g.id)).toEqual(['3']);
  });
});

describe('deriveFacets', () => {
  it('saca plataformas y géneros reales con su conteo', () => {
    const f = deriveFacets(games);
    expect(f.platforms).toEqual([
      { value: 'PC', count: 1 },
      { value: 'PS5', count: 2 },
    ]);
    expect(f.genres).toEqual([
      { value: 'Acción', count: 1 },
      { value: 'RPG', count: 2 },
    ]);
  });

  it('no inventa valores cuando faltan', () => {
    const f = deriveFacets([{ id: 'x', title: 'X', price_clp: 1, stock: 1 }]);
    expect(f.platforms).toEqual([]);
    expect(f.genres).toEqual([]);
  });
});

describe('parseFilters / filtersToSearch', () => {
  it('ida y vuelta conserva los filtros', () => {
    const f: CatalogFilters = { q: 'faro', platforms: ['PS5', 'PC'], genres: ['RPG'] };
    expect(parseFilters(new URLSearchParams(filtersToSearch(f)))).toEqual(f);
  });

  it('usa parámetros repetidos plataforma y genero', () => {
    expect(filtersToSearch({ q: '', platforms: ['PS5', 'PC'], genres: [] })).toBe('plataforma=PS5&plataforma=PC');
  });

  it('filtros vacíos dan cadena vacía', () => {
    expect(filtersToSearch(none)).toBe('');
  });

  it('ignora valores vacíos en la URL', () => {
    expect(parseFilters(new URLSearchParams('plataforma=&q='))).toEqual(none);
  });
});
