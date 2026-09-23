import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from './GameEngine';

describe('GameEngine', () => {
  it('inicia com uma base e um bloco em movimento', () => {
    const engine = new GameEngine(vi.fn(), vi.fn());
    engine.start();
    const snapshot = engine.getSnapshot();
    expect(snapshot.phase).toBe('playing');
    expect(snapshot.blocks).toHaveLength(1);
    expect(snapshot.movingBlock?.level).toBe(1);
  });

  it('pausa e retoma sem alterar a posição', () => {
    const engine = new GameEngine(vi.fn(), vi.fn());
    engine.start();
    engine.togglePause();
    const x = engine.getSnapshot().movingBlock?.x;
    engine.update(1);
    expect(engine.getSnapshot().movingBlock?.x).toBe(x);
    engine.togglePause();
    expect(engine.getSnapshot().phase).toBe('playing');
  });

  it('redimensiona proporcionalmente os blocos existentes', () => {
    const engine = new GameEngine(vi.fn(), vi.fn());
    engine.start();
    const before = engine.getSnapshot().blocks[0].width;
    engine.resize(780);
    expect(engine.getSnapshot().blocks[0].width).toBeCloseTo(before * 2);
  });

  it('remove completamente a torre ao voltar ao menu', () => {
    const engine = new GameEngine(vi.fn(), vi.fn());
    engine.start();
    engine.showMenu();
    const snapshot = engine.getSnapshot();
    expect(snapshot.phase).toBe('menu');
    expect(snapshot.blocks).toHaveLength(0);
    expect(snapshot.movingBlock).toBeNull();
    expect(snapshot.score).toBe(0);
  });
});
