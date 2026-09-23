import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearPuzzleCacheForTests, dailyIndex, loadManifest, loadPuzzleById } from './loader';
import { puzzle } from '../test/fixture';

const manifest = { version: 1, generatedAt: '', total: 1, globalSignature: 'x', counts: { easy: 1, medium: 0, hard: 0 }, blocks: [{ file: 'easy/01.json', difficulty: 'easy', count: 1, ids: [puzzle.id], sizes: { 6: 1 }, checksum: 'x' }] };
afterEach(() => { vi.unstubAllGlobals(); clearPuzzleCacheForTests(); });

describe('carregamento progressivo', () => {
  it('seleciona o desafio diário deterministicamente', () => expect(dailyIndex(new Date(2026, 6, 14), 1000)).toBe(dailyIndex(new Date(2026, 6, 14), 1000)));
  it('carrega primeiro o manifesto e mantém blocos em cache', async () => {
    const fetcher = vi.fn(async (url: string) => ({ ok: true, json: async () => url.endsWith('manifest.json') ? manifest : { version: 1, puzzles: [puzzle] } }));
    vi.stubGlobal('fetch', fetcher);
    await loadManifest(); await loadPuzzleById(puzzle.id); await loadPuzzleById(puzzle.id);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
