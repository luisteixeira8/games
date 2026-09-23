import type { Puzzle, SolverMetrics } from '../types/puzzle';
import { regionAt } from '../game/rules';

export interface SolveResult { solutions: number[][]; metrics: SolverMetrics }

const blankMetrics = (): SolverMetrics => ({ directDeductions: 0, maxDepth: 0, backtracks: 0, exploredStates: 0, eliminatedCandidates: 0, hypotheses: 0 });

/** Resolve por linhas com MRV, propagação e interrupção ao encontrar `limit` soluções. */
export function solvePuzzle(puzzle: Pick<Puzzle, 'size' | 'regions'>, limit = 2): SolveResult {
  const metrics = blankMetrics();
  const solutions: number[][] = [];
  const assignment = Array<number>(puzzle.size).fill(-1);
  const usedColumns = new Set<number>();
  const usedRegions = new Set<number>();

  const candidatesFor = (row: number): number[] => {
    const candidates: number[] = [];
    for (let column = 0; column < puzzle.size; column += 1) {
      const region = regionAt(puzzle as Puzzle, row * puzzle.size + column);
      if (usedColumns.has(column) || usedRegions.has(region)) { metrics.eliminatedCandidates += 1; continue; }
      let adjacent = false;
      for (const nearRow of [row - 1, row + 1]) {
        if (nearRow >= 0 && nearRow < puzzle.size && (assignment[nearRow] ?? -1) >= 0 && Math.abs(assignment[nearRow]! - column) === 1) adjacent = true;
      }
      if (adjacent) { metrics.eliminatedCandidates += 1; continue; }
      candidates.push(column);
    }
    return candidates;
  };

  const search = (depth: number): void => {
    if (solutions.length >= limit) return;
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);
    metrics.exploredStates += 1;
    let selectedRow = -1;
    let selectedCandidates: number[] = [];
    for (let row = 0; row < puzzle.size; row += 1) {
      if ((assignment[row] ?? -1) >= 0) continue;
      const candidates = candidatesFor(row);
      if (candidates.length === 0) { metrics.backtracks += 1; return; }
      if (selectedRow < 0 || candidates.length < selectedCandidates.length) {
        selectedRow = row; selectedCandidates = candidates;
      }
    }
    if (selectedRow < 0) { solutions.push([...assignment]); return; }
    if (selectedCandidates.length === 1) metrics.directDeductions += 1;
    else metrics.hypotheses += 1;
    for (const column of selectedCandidates) {
      const before = solutions.length;
      const region = regionAt(puzzle as Puzzle, selectedRow * puzzle.size + column);
      assignment[selectedRow] = column; usedColumns.add(column); usedRegions.add(region);
      search(depth + 1);
      assignment[selectedRow] = -1; usedColumns.delete(column); usedRegions.delete(region);
      if (solutions.length === before) metrics.backtracks += 1;
      if (solutions.length >= limit) return;
    }
  };
  search(0);
  return { solutions, metrics };
}

export function countSolutions(puzzle: Pick<Puzzle, 'size' | 'regions'>, limit = 2): number {
  return solvePuzzle(puzzle, limit).solutions.length;
}
