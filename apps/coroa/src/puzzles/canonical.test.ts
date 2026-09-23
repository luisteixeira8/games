import { describe, expect, it } from 'vitest';
import { canonicalRepresentation, canonicalSignature } from './canonical';
import { puzzle } from '../test/fixture';

function rotate(size: number, regions: string, solution: number[]): [string, number[]] {
  const chars = Array<string>(size * size); const next = Array<number>(size);
  for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) chars[col * size + size - 1 - row] = regions[row * size + col]!;
  solution.forEach((col, row) => { next[col] = size - 1 - row; });
  return [chars.join(''), next];
}

describe('canonização', () => {
  it('normaliza identificadores de regiões', () => {
    const renamed = [...puzzle.regions].map((char) => String.fromCharCode(75 - (char.charCodeAt(0) - 65))).join('');
    expect(canonicalRepresentation(6, renamed, puzzle.solution)).toBe(canonicalRepresentation(6, puzzle.regions, puzzle.solution));
  });
  it('deteta rotações e reflexões como duplicados', () => {
    const [regions, solution] = rotate(6, puzzle.regions, puzzle.solution);
    expect(canonicalSignature(6, regions, solution)).toBe(canonicalSignature(6, puzzle.regions, puzzle.solution));
  });
});
