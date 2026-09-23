import { describe, expect, it } from 'vitest';
import { findConflicts, isSolved, nextCellState, regionsAreConnected, type CellState } from './rules';
import { puzzle } from '../test/fixture';

const cells = (...queens: number[]): CellState[] => Array.from({ length: 36 }, (_, index) => queens.includes(index) ? 2 : 0);

describe('regras', () => {
  it('exige exatamente uma coroa por linha, coluna e região', () => {
    const solved = cells(...puzzle.solution.map((column, row) => row * 6 + column));
    expect(isSolved(puzzle, solved)).toBe(true);
    expect(isSolved(puzzle, cells(0, 8, 16, 19, 27))).toBe(false);
  });
  it('deteta conflitos de linha, coluna, região e diagonal adjacente', () => {
    expect(findConflicts(puzzle, cells(0, 1))[0]?.reasons).toContain('linha');
    expect(findConflicts(puzzle, cells(0, 6))[0]?.reasons).toContain('coluna');
    expect(findConflicts(puzzle, cells(2, 7))[0]?.reasons).toEqual(expect.arrayContaining(['região', 'diagonal']));
  });
  it('valida a continuidade ortogonal de todas as regiões', () => {
    expect(regionsAreConnected(puzzle.size, puzzle.regions)).toBe(true);
    expect(regionsAreConnected(2, 'ABBA')).toBe(false);
  });
  it('alterna vazia, X, coroa, vazia', () => {
    expect(nextCellState(0)).toBe(1); expect(nextCellState(1)).toBe(2); expect(nextCellState(2)).toBe(0);
  });
});
