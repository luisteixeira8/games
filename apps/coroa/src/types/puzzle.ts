export type Difficulty = 'easy' | 'medium' | 'hard';

export interface SolverMetrics {
  directDeductions: number;
  maxDepth: number;
  backtracks: number;
  exploredStates: number;
  eliminatedCandidates: number;
  hypotheses: number;
}

export interface Puzzle {
  id: string;
  size: number;
  difficulty: Difficulty;
  seed: number;
  /** Região de cada célula, em ordem de leitura. */
  regions: string;
  /** Coluna da rainha em cada linha. */
  solution: number[];
  metrics: SolverMetrics;
  signature: string;
}

export interface PuzzleBlock {
  version: number;
  puzzles: Puzzle[];
}

export interface ManifestBlock {
  file: string;
  difficulty: Difficulty;
  count: number;
  ids: string[];
  sizes: Record<string, number>;
  checksum: string;
}

export interface PuzzleManifest {
  version: number;
  generatedAt: string;
  total: number;
  globalSignature: string;
  counts: Record<Difficulty, number>;
  blocks: ManifestBlock[];
}
