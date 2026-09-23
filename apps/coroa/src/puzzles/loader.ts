import type { Difficulty, Puzzle, PuzzleBlock, PuzzleManifest } from '../types/puzzle';

let manifestPromise: Promise<PuzzleManifest> | undefined;
const blockCache = new Map<string, Promise<PuzzleBlock>>();
const dataUrl = (file: string) => `${import.meta.env.BASE_URL}puzzles/${file}`;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status}).`);
  return response.json() as Promise<T>;
}

function validateManifest(value: PuzzleManifest): void {
  if (value.version !== 1 || value.total <= 0 || !Array.isArray(value.blocks) || value.blocks.some((block) => !block.file || block.count !== block.ids.length)) throw new Error('The puzzle manifest has an invalid schema.');
}

function validateBlock(value: PuzzleBlock): void {
  if (value.version !== 1 || !Array.isArray(value.puzzles) || value.puzzles.some((puzzle) => !puzzle.id || puzzle.regions.length !== puzzle.size * puzzle.size || puzzle.solution.length !== puzzle.size)) throw new Error('The puzzle block has an invalid schema.');
}

export function loadManifest(): Promise<PuzzleManifest> {
  manifestPromise ??= fetchJson<PuzzleManifest>(dataUrl('manifest.json')).then((value) => { if (import.meta.env.DEV) validateManifest(value); return value; });
  return manifestPromise;
}

export function loadBlock(file: string): Promise<PuzzleBlock> {
  let request = blockCache.get(file);
  if (!request) { request = fetchJson<PuzzleBlock>(dataUrl(file)).then((value) => { if (import.meta.env.DEV) validateBlock(value); return value; }); blockCache.set(file, request); }
  return request;
}

export async function loadPuzzleById(id: string): Promise<Puzzle> {
  const manifest = await loadManifest();
  const block = manifest.blocks.find((entry) => entry.ids.includes(id));
  if (!block) throw new Error(`Puzzle “${id}” does not exist.`);
  const data = await loadBlock(block.file);
  const puzzle = data.puzzles.find((entry) => entry.id === id);
  if (!puzzle) throw new Error(`Puzzle “${id}” is missing from its data block.`);
  return puzzle;
}

export function dailyIndex(date: Date, total: number): number {
  const localDay = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 2166136261;
  for (const char of localDay) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) % total;
}

export async function loadDailyPuzzle(date = new Date()): Promise<Puzzle> {
  const manifest = await loadManifest();
  const index = dailyIndex(date, manifest.total);
  let offset = index;
  for (const block of manifest.blocks) {
    if (offset < block.count) return loadPuzzleById(block.ids[offset]!);
    offset -= block.count;
  }
  throw new Error('Invalid daily puzzle manifest.');
}

export async function loadRandomPuzzle(difficulty: Difficulty, recentIds: readonly string[]): Promise<Puzzle> {
  const manifest = await loadManifest();
  const blocks = manifest.blocks.filter((block) => block.difficulty === difficulty);
  const candidates = blocks.flatMap((block) => block.ids).filter((id) => !recentIds.includes(id));
  const pool = candidates.length ? candidates : blocks.flatMap((block) => block.ids);
  const id = pool[Math.floor(Math.random() * pool.length)]!;
  return loadPuzzleById(id);
}

export function clearPuzzleCacheForTests(): void { manifestPromise = undefined; blockCache.clear(); }
