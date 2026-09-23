import type { Completion } from '../storage/persistence';

export function completionRate(history: readonly Completion[], startedCount: number): number {
  return startedCount <= 0 ? 0 : Math.min(100, Math.round((new Set(history.map((item) => item.id)).size / startedCount) * 100));
}

export function bestTimes(history: readonly Completion[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of history) {
    const key = `${item.size}×${item.size} · ${item.difficulty}`;
    result[key] = Math.min(result[key] ?? Number.POSITIVE_INFINITY, item.seconds);
  }
  return result;
}
