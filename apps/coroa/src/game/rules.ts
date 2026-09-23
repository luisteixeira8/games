import type { Puzzle } from '../types/puzzle';

export type CellState = 0 | 1 | 2;
export type ConflictReason = 'linha' | 'coluna' | 'região' | 'diagonal';
export interface Conflict { index: number; reasons: ConflictReason[] }

export const cellIndex = (size: number, row: number, column: number) => row * size + column;
export const regionAt = (puzzle: Puzzle, index: number): number => puzzle.regions.charCodeAt(index) - 65;

export function nextCellState(state: CellState): CellState {
  return ((state + 1) % 3) as CellState;
}

export function findConflicts(puzzle: Puzzle, cells: readonly CellState[]): Conflict[] {
  const queens = cells.flatMap((value, index) => value === 2 ? [index] : []);
  const reasons = new Map<number, Set<ConflictReason>>();
  const add = (a: number, b: number, reason: ConflictReason) => {
    if (!reasons.has(a)) reasons.set(a, new Set());
    if (!reasons.has(b)) reasons.set(b, new Set());
    reasons.get(a)?.add(reason);
    reasons.get(b)?.add(reason);
  };
  for (let i = 0; i < queens.length; i += 1) {
    const a = queens[i]!;
    const ar = Math.floor(a / puzzle.size);
    const ac = a % puzzle.size;
    for (let j = i + 1; j < queens.length; j += 1) {
      const b = queens[j]!;
      const br = Math.floor(b / puzzle.size);
      const bc = b % puzzle.size;
      if (ar === br) add(a, b, 'linha');
      if (ac === bc) add(a, b, 'coluna');
      if (regionAt(puzzle, a) === regionAt(puzzle, b)) add(a, b, 'região');
      if (Math.abs(ar - br) === 1 && Math.abs(ac - bc) === 1) add(a, b, 'diagonal');
    }
  }
  return [...reasons].map(([index, value]) => ({ index, reasons: [...value] }));
}

export function isSolved(puzzle: Puzzle, cells: readonly CellState[]): boolean {
  if (findConflicts(puzzle, cells).length > 0) return false;
  const rows = new Set<number>();
  const columns = new Set<number>();
  const regions = new Set<number>();
  cells.forEach((value, index) => {
    if (value !== 2) return;
    rows.add(Math.floor(index / puzzle.size));
    columns.add(index % puzzle.size);
    regions.add(regionAt(puzzle, index));
  });
  return rows.size === puzzle.size && columns.size === puzzle.size && regions.size === puzzle.size;
}

export function regionsAreConnected(size: number, encoded: string): boolean {
  if (encoded.length !== size * size) return false;
  for (let region = 0; region < size; region += 1) {
    const cells = [...encoded].flatMap((char, index) => char.charCodeAt(0) - 65 === region ? [index] : []);
    if (cells.length === 0) return false;
    const seen = new Set<number>([cells[0]!]);
    const queue = [cells[0]!];
    while (queue.length) {
      const current = queue.shift()!;
      const row = Math.floor(current / size);
      const col = current % size;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
        const nr = row + dr; const nc = col + dc;
        const next = nr * size + nc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && encoded[next] === encoded[current] && !seen.has(next)) {
          seen.add(next); queue.push(next);
        }
      }
    }
    if (seen.size !== cells.length) return false;
  }
  return true;
}
