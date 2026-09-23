import type { Difficulty, SolverMetrics } from '../types/puzzle';

/** Limites auditáveis; o tamanho é apenas um pequeno fator no resultado. */
export function difficultyScore(metrics: SolverMetrics, size: number): number {
  return metrics.hypotheses * 12 + metrics.backtracks * 2 + metrics.maxDepth + Math.ceil(metrics.exploredStates / 4) + Math.ceil(metrics.eliminatedCandidates / 30) + Math.max(0, size - 6) * 2 - metrics.directDeductions;
}

export function classifyDifficulty(metrics: SolverMetrics, size: number): Difficulty {
  const score = difficultyScore(metrics, size);
  // Calibrado sobre o gerador v1: dedução quase linear até 520; pesquisa
  // moderada até 3 200; acima disso há ramificação substancial.
  if (score <= 520) return 'easy';
  if (score <= 3_200) return 'medium';
  return 'hard';
}
