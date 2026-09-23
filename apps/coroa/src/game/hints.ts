import type { GameState } from './state';
import type { Puzzle } from '../types/puzzle';
import { regionAt, type CellState } from './rules';

export interface Hint { level: 1 | 2 | 3 | 4; message: string; index?: number; unit?: { type: 'linha' | 'coluna' | 'região'; value: number }; proposed?: CellState }

export function getHint(puzzle: Puzzle, state: GameState): Hint {
  const level = Math.min(4, state.hints + 1) as 1 | 2 | 3 | 4;
  const emptySolutionRow = puzzle.solution.findIndex((column, row) => state.cells[row * puzzle.size + column] !== 2);
  const row = Math.max(0, emptySolutionRow);
  const correctIndex = row * puzzle.size + puzzle.solution[row]!;
  if (level === 1) return { level, message: `Look at row ${row + 1}: the crown still needs a place.`, unit: { type: 'linha', value: row } };
  const impossible = state.cells.findIndex((value, index) => value === 0 && index !== correctIndex && Math.floor(index / puzzle.size) === row);
  const index = impossible >= 0 ? impossible : state.cells.findIndex((value, i) => value === 0 && i % puzzle.size !== puzzle.solution[Math.floor(i / puzzle.size)]);
  if (level === 2) return { level, index, message: `The highlighted cell cannot contain a crown. Check its row, column, and region.` };
  if (level === 3) return { level, index, proposed: 1, message: 'I can place an X in that impossible cell.' };
  return { level, index: correctIndex, proposed: 2, message: `Last resort: reveal the crown in row ${row + 1}.` };
}

export function unitContains(puzzle: Puzzle, index: number, hint: Hint | null): boolean {
  if (!hint?.unit) return false;
  if (hint.unit.type === 'linha') return Math.floor(index / puzzle.size) === hint.unit.value;
  if (hint.unit.type === 'coluna') return index % puzzle.size === hint.unit.value;
  return regionAt(puzzle, index) === hint.unit.value;
}
