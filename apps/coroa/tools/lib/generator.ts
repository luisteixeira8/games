import type { Difficulty, Puzzle } from '../../src/types/puzzle';
import { canonicalSignature } from '../../src/puzzles/canonical';
import { classifyDifficulty } from '../../src/puzzles/difficulty';
import { solvePuzzle } from '../../src/puzzles/solver';
import { regionsAreConnected } from '../../src/game/rules';

export class Random {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 0x9e3779b9; }
  next(): number {
    let value = this.state;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }
  int(max: number): number { return Math.floor(this.next() * max); }
  shuffle<T>(input: readonly T[]): T[] {
    const result = [...input];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.int(i + 1); [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}

export function generateSolution(size: number, random: Random): number[] | null {
  const columns = Array.from({ length: size }, (_, index) => index);
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const solution = random.shuffle(columns);
    if (solution.every((column, row) => row === 0 || Math.abs(column - solution[row - 1]!) !== 1)) return solution;
  }
  return null;
}

export function buildConnectedRegions(size: number, solution: readonly number[], random: Random): string {
  const regions = Array<number>(size * size).fill(-1);
  const queue: { index: number; region: number; priority: number }[] = [];
  const enqueueNeighbours = (index: number, region: number, priority: number) => {
    const row = Math.floor(index / size); const col = index % size;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nr = row + dr; const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        const next = nr * size + nc;
        if ((regions[next] ?? -1) < 0) queue.push({ index: next, region, priority: priority + 0.65 + random.next() * 0.9 });
      }
    }
  };
  solution.forEach((column, row) => {
    const index = row * size + column; regions[index] = row; enqueueNeighbours(index, row, 0);
  });
  let remaining = size * size - size;
  while (remaining > 0) {
    queue.sort((a, b) => a.priority - b.priority);
    const current = queue.shift();
    if (!current) throw new Error('Crescimento de regiões bloqueado');
    if ((regions[current.index] ?? -1) >= 0) continue;
    regions[current.index] = current.region; remaining -= 1;
    enqueueNeighbours(current.index, current.region, current.priority);
  }
  return regions.map((region) => String.fromCharCode(65 + region)).join('');
}

function refineForUniqueness(size: number, target: readonly number[], initial: string, random: Random): { regions: string; result: ReturnType<typeof solvePuzzle> } | null {
  let regions = initial;
  for (let step = 0; step < 180; step += 1) {
    const result = solvePuzzle({ size, regions }, 2);
    if (result.solutions.length === 1) return { regions, result };
    if (result.solutions.length === 0) return null;
    const alternative = result.solutions[1]!;
    let changed = false;
    for (const row of random.shuffle(Array.from({ length: size }, (_, index) => index))) {
      const column = alternative[row]!;
      if (column === target[row]) continue;
      const index = row * size + column;
      const source = regions[index]!;
      const neighbours: number[] = [];
      for (const [dr, dc] of random.shuffle([[-1, 0], [1, 0], [0, -1], [0, 1]] as const)) {
        const nr = row + dr; const nc = column + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) neighbours.push(nr * size + nc);
      }
      for (const neighbour of neighbours) {
        const destination = regions[neighbour]!;
        if (destination === source) continue;
        const chars = [...regions]; chars[index] = destination;
        const candidate = chars.join('');
        if (regionsAreConnected(size, candidate)) {
          regions = candidate; changed = true; break;
        }
      }
      if (changed) break;
    }
    if (!changed) return null;
  }
  return null;
}

function sizeForSeed(seed: number): number {
  return 6 + (seed * 2654435761 >>> 0) % 5;
}

export function createCandidate(seed: number): Puzzle | null {
  const random = new Random(seed ^ 0xc0a0a123);
  const size = sizeForSeed(seed);
  const solution = generateSolution(size, random);
  if (!solution) return null;
  const initial = buildConnectedRegions(size, solution, random);
  if (!regionsAreConnected(size, initial)) return null;
  const refined = refineForUniqueness(size, solution, initial, random);
  if (!refined) return null;
  const { regions, result: solved } = refined;
  const difficulty = classifyDifficulty(solved.metrics, size);
  const signature = canonicalSignature(size, regions, solved.solutions[0]!);
  return { id: '', size, difficulty, seed, regions, solution: solved.solutions[0]!, metrics: solved.metrics, signature };
}

export function stableId(difficulty: Difficulty, ordinal: number): string {
  const prefix: Record<Difficulty, string> = { easy: 'F', medium: 'M', hard: 'D' };
  return `CR-${prefix[difficulty]}-${String(ordinal + 1).padStart(4, '0')}`;
}
