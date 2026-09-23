import { describe, expect, it } from 'vitest';
import { countSolutions, solvePuzzle } from './solver';
import { puzzle } from '../test/fixture';

describe('solucionador', () => {
  it('encontra a única solução sem confiar na solução guardada', () => {
    const result = solvePuzzle({ size: puzzle.size, regions: puzzle.regions }, 2);
    expect(result.solutions).toEqual([puzzle.solution]);
    expect(result.metrics.exploredStates).toBeGreaterThan(0);
  });
  it('interrompe depois de duas soluções', () => {
    const rows = 'A'.repeat(6) + 'B'.repeat(6) + 'C'.repeat(6) + 'D'.repeat(6) + 'E'.repeat(6) + 'F'.repeat(6);
    expect(countSolutions({ size: 6, regions: rows }, 2)).toBe(2);
  });
  it('rejeita um puzzle sem solução', () => expect(countSolutions({ size: 2, regions: 'AAAA' }, 2)).toBe(0));
});
