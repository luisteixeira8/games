import { describe, expect, it } from 'vitest';
import { classifyDifficulty, difficultyScore } from './difficulty';

describe('dificuldade', () => {
  it('usa métricas de pesquisa e não apenas o tamanho', () => {
    const low = { directDeductions: 30, maxDepth: 6, backtracks: 10, exploredStates: 20, eliminatedCandidates: 100, hypotheses: 3 };
    const high = { directDeductions: 3, maxDepth: 6, backtracks: 1000, exploredStates: 900, eliminatedCandidates: 9000, hypotheses: 300 };
    expect(classifyDifficulty(low, 10)).toBe('easy');
    expect(classifyDifficulty(high, 6)).toBe('hard');
    expect(difficultyScore(high, 6)).toBeGreaterThan(difficultyScore(low, 10));
  });
});
