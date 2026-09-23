import { describe, expect, it } from 'vitest';
import { nextStreak, pointsForPlacement } from './scoring';

describe('scoring', () => {
  it('incrementa e reinicia a sequência perfeita', () => {
    expect(nextStreak(2, true)).toBe(3);
    expect(nextStreak(8, false)).toBe(0);
  });

  it('atribui bónus progressivo com limite', () => {
    expect(pointsForPlacement(0)).toBe(1);
    expect(pointsForPlacement(3)).toBe(2);
    expect(pointsForPlacement(99)).toBe(5);
  });
});
