import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { clearPuzzleCacheForTests } from './puzzles/loader';
import { puzzle } from './test/fixture';

const otherPuzzle = { ...puzzle, id: 'CR-F-0002', seed: puzzle.seed + 1, signature: 'fixture-2' };
const thirdPuzzle = { ...puzzle, id: 'CR-F-0003', seed: puzzle.seed + 2, signature: 'fixture-3' };
const manifest = { version: 1, generatedAt: '', total: 3, globalSignature: 'x', counts: { easy: 3, medium: 0, hard: 0 }, blocks: [{ file: 'easy/01.json', difficulty: 'easy', count: 3, ids: [puzzle.id, otherPuzzle.id, thirdPuzzle.id], sizes: { 6: 3 }, checksum: 'x' }] };
let clipboardWrite: ReturnType<typeof vi.fn>;

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null, key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => { values.delete(key); }, setItem: (key, value) => { values.set(key, value); } };
}

function mockNetwork() {
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => ({ ok: true, status: 200, json: async () => String(input).endsWith('manifest.json') ? manifest : { version: 1, puzzles: [puzzle, otherPuzzle, thirdPuzzle] } })));
}

beforeEach(() => {
  const storage = memoryStorage();
  Object.defineProperty(window, 'localStorage', { configurable: true, value: storage });
  vi.stubGlobal('localStorage', storage);
  clearPuzzleCacheForTests(); mockNetwork();
  clipboardWrite = vi.fn(async () => undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboardWrite } });
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); clearPuzzleCacheForTests(); });

async function openDaily() {
  render(<App/>);
  fireEvent.click(await screen.findByRole('button', { name: /Play now/ }));
  expect(await screen.findByRole('heading', { name: /Level 000[1-3]/ })).toBeInTheDocument();
  expect(screen.getByText('Easy', { selector: '.difficulty' })).toBeInTheDocument();
}

describe('percursos principais', () => {
  it('apresenta uma página inicial antes de carregar o jogo', async () => {
    render(<App/>);
    expect(screen.getByRole('heading', { name: /Find the place.*crown/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Play now/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start a level/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toHaveAttribute('aria-pressed', 'true');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('abre o desafio diário, faz jogadas e recupera o progresso após atualização', async () => {
    const user = userEvent.setup(); await openDaily();
    const first = screen.getByRole('gridcell', { name: /Row 1, column 1/ });
    await user.click(first); expect(first).toHaveTextContent('×');
    await waitFor(() => expect(localStorage.getItem('coroa:v1')).toContain('CR-F-000'));
    cleanup(); clearPuzzleCacheForTests(); mockNetwork(); render(<App/>);
    fireEvent.click(await screen.findByRole('button', { name: /Play now/ }));
    expect(await screen.findByRole('gridcell', { name: /Row 1, column 1/ })).toHaveTextContent('×');
  });

  it('resolve o puzzle e copia um resultado sem revelar a solução', async () => {
    const user = userEvent.setup(); await openDaily();
    for (const [row, column] of puzzle.solution.entries()) {
      const cell = screen.getByRole('gridcell', { name: new RegExp(`Row ${row + 1}, column ${column + 1}`) });
      await user.click(cell); await user.click(cell);
    }
    expect(await screen.findByRole('heading', { name: 'Crown claimed' })).toBeInTheDocument();
    const write = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(screen.getByRole('button', { name: 'Copy result' }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    const copied = write.mock.calls[0]?.[0] ?? '';
    expect(copied).toMatch(/CR-F-000[1-3]/); expect(copied).not.toContain(puzzle.solution.join(','));
    await user.click(screen.getByRole('button', { name: 'Go to home page' }));
    expect(screen.getByRole('heading', { name: /Find the place.*crown/i })).toBeInTheDocument();
  });

  it('inicia jogo livre, altera o tema e abre as instruções', async () => {
    const user = userEvent.setup(); await openDaily();
    await user.click(screen.getByRole('button', { name: 'Free play' }));
    await waitFor(() => expect(screen.getByText('Free play', { selector: '.eyebrow' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Free play' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const darkTheme = screen.getByRole('radio', { name: 'Dark' });
    await user.click(darkTheme);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(darkTheme).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'How to play' }));
    expect(screen.getByText(/one crown in every row/i)).toBeInTheDocument();
  });

  it('permite jogar integralmente com teclado e desfazer', async () => {
    await openDaily(); const first = screen.getByRole('gridcell', { name: /Row 1, column 1/ });
    first.focus(); fireEvent.keyDown(first, { key: 'x' }); expect(first).toHaveTextContent('×');
    fireEvent.keyDown(first, { key: 'q' }); expect(first).toHaveTextContent('♛');
    fireEvent.keyDown(first, { key: 'ArrowRight' }); expect(screen.getByRole('gridcell', { name: /Row 1, column 2/ })).toHaveFocus();
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    await act(async () => undefined); expect(first).toHaveTextContent('×');
  });

  it('marca várias células com X ao arrastar com rato ou toque', async () => {
    await openDaily();
    const first = screen.getByRole('gridcell', { name: /Row 1, column 1/ });
    const second = screen.getByRole('gridcell', { name: /Row 1, column 2/ });
    const third = screen.getByRole('gridcell', { name: /Row 1, column 3/ });
    fireEvent.pointerDown(first, { button: 0, buttons: 1, pointerId: 1, clientX: 0, clientY: 0, pointerType: 'touch' });
    fireEvent.pointerMove(second, { buttons: 1, pointerId: 1, clientX: 10, clientY: 0, pointerType: 'touch' });
    fireEvent.pointerMove(third, { buttons: 1, pointerId: 1, clientX: 20, clientY: 0, pointerType: 'touch' });
    fireEvent.pointerUp(window, { button: 0, pointerId: 1, pointerType: 'touch' });
    expect(first).toHaveTextContent('×'); expect(second).toHaveTextContent('×'); expect(third).toHaveTextContent('×');
  });

  it('torna o tabuleiro inativo durante a pausa e foca a ação de continuar', async () => {
    const user = userEvent.setup(); await openDaily();
    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('dialog', { name: 'Game paused' })).toBeInTheDocument();
    expect(document.querySelector('.board-interaction')).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Continue' })).toHaveFocus();
  });

  it('fecha o modal e inicia outro nível depois de concluir um jogo livre', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const user = userEvent.setup(); await openDaily();
    await user.click(screen.getByRole('button', { name: 'Free play' }));
    await screen.findByText('Free play', { selector: '.eyebrow' });
    const currentLevel = screen.getByRole('heading', { name: /Level 000[1-3]/ }).textContent;
    for (const [row, column] of otherPuzzle.solution.entries()) {
      const cell = screen.getByRole('gridcell', { name: new RegExp(`Row ${row + 1}, column ${column + 1}`) });
      await user.click(cell); await user.click(cell);
    }
    expect(await screen.findByRole('heading', { name: 'Crown claimed' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Play another level' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Level 000[1-3]/ }).textContent).not.toBe(currentLevel));
    expect(screen.queryByRole('heading', { name: 'Crown claimed' })).not.toBeInTheDocument();
  });
});
