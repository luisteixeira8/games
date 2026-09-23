import type { GameState } from '../game/state';
import type { Difficulty } from '../types/puzzle';

export type Theme = 'light' | 'dark' | 'system';
export interface Completion { id: string; difficulty: Difficulty; size: number; seconds: number; errors: number; hints: number; date: string; mode: 'daily' | 'free' }
export interface Settings { theme: Theme; sound: boolean; immediateValidation: boolean }
export interface StoredData {
  version: 1; games: Record<string, GameState>; completed: Completion[]; recent: string[];
  dailyDates: string[]; bestStreak: number; settings: Settings;
}
const KEY = 'coroa:v1';
export const defaultData = (): StoredData => ({ version: 1, games: {}, completed: [], recent: [], dailyDates: [], bestStreak: 0, settings: { theme: 'light', sound: false, immediateValidation: true } });

export function loadStoredData(storage: Pick<Storage, 'getItem'> = localStorage): StoredData {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? '') as Partial<StoredData>;
    const base = defaultData();
    if (parsed.version !== 1) return base;
    return {
      ...base, ...parsed,
      games: parsed.games && typeof parsed.games === 'object' ? parsed.games : {},
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      dailyDates: Array.isArray(parsed.dailyDates) ? parsed.dailyDates : [],
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
    };
  } catch { return defaultData(); }
}

export function saveStoredData(data: StoredData, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try { storage.setItem(KEY, JSON.stringify(data)); } catch { /* modo privado ou quota excedida */ }
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function streakForDates(dates: readonly string[], today = new Date()): number {
  const set = new Set(dates); let streak = 0; const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (set.has(localDateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}
