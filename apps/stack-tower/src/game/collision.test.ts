import { describe, expect, it } from 'vitest';
import { calculatePlacement } from './collision';

describe('calculatePlacement', () => {
  it('calcula a sobreposição e corta a área à direita', () => {
    const result = calculatePlacement(40, 100, 20, 100, 5);
    expect(result).toMatchObject({
      overlap: 80,
      x: 40,
      width: 80,
      cutX: 120,
      cutWidth: 20,
      perfect: false,
      gameOver: false
    });
  });

  it('calcula o corte à esquerda sem produzir larguras negativas', () => {
    const result = calculatePlacement(-10, 100, 20, 100, 5);
    expect(result.x).toBe(20);
    expect(result.width).toBe(70);
    expect(result.cutX).toBe(-10);
    expect(result.cutWidth).toBe(30);
  });

  it('alinha automaticamente dentro da tolerância perfeita', () => {
    const result = calculatePlacement(23, 98, 20, 100, 5, 102);
    expect(result.perfect).toBe(true);
    expect(result.x).toBe(20);
    expect(result.width).toBe(100);
    expect(result.cutWidth).toBe(0);
  });

  it('deteta game over quando a sobreposição é zero', () => {
    const result = calculatePlacement(120, 30, 20, 100, 5);
    expect(result.gameOver).toBe(true);
    expect(result.overlap).toBe(0);
    expect(result.width).toBe(0);
  });
});
