import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Difficulty, ManifestBlock, Puzzle, PuzzleManifest } from '../src/types/puzzle';
import { createCandidate, stableId } from './lib/generator';

const ROOT = resolve(import.meta.dirname, '..');
const OUTPUT = resolve(ROOT, 'public/puzzles');
const VERSION = 1;
const FIXED_SEED_START = 0x00c0a0a;
const TARGETS: Record<Difficulty, number> = { easy: 300, medium: 400, hard: 300 };
const BLOCK_SIZE = 25;
const order: Difficulty[] = ['easy', 'medium', 'hard'];
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

async function main(): Promise<void> {
  const buckets: Record<Difficulty, Puzzle[]> = { easy: [], medium: [], hard: [] };
  const signatures = new Set<string>();
  let seed = FIXED_SEED_START;
  let attempts = 0;
  while (order.some((difficulty) => buckets[difficulty].length < TARGETS[difficulty])) {
    const candidate = createCandidate(seed++);
    attempts += 1;
    if (candidate && buckets[candidate.difficulty].length < TARGETS[candidate.difficulty] && !signatures.has(candidate.signature)) {
      const bucket = buckets[candidate.difficulty];
      candidate.id = stableId(candidate.difficulty, bucket.length);
      bucket.push(candidate); signatures.add(candidate.signature);
      const total = order.reduce((sum, difficulty) => sum + buckets[difficulty].length, 0);
      if (total % 50 === 0) process.stdout.write(`Gerados ${total}/1000 [${buckets.easy.length}/${buckets.medium.length}/${buckets.hard.length}] (tentativas: ${attempts})\n`);
    }
    if (attempts > 2_000_000) throw new Error(`Não foi possível cumprir a distribuição: ${JSON.stringify(Object.fromEntries(order.map((d) => [d, buckets[d].length])))}`);
  }

  await rm(OUTPUT, { recursive: true, force: true });
  await mkdir(OUTPUT, { recursive: true });
  const blocks: ManifestBlock[] = [];
  for (const difficulty of order) {
    const dir = resolve(OUTPUT, difficulty);
    await mkdir(dir, { recursive: true });
    for (let offset = 0; offset < buckets[difficulty].length; offset += BLOCK_SIZE) {
      const puzzles = buckets[difficulty].slice(offset, offset + BLOCK_SIZE);
      const body = JSON.stringify({ version: VERSION, puzzles });
      const filename = `${difficulty}/${String(offset / BLOCK_SIZE + 1).padStart(2, '0')}.json`;
      await writeFile(resolve(OUTPUT, filename), body);
      const sizes: Record<string, number> = {};
      puzzles.forEach((puzzle) => { sizes[String(puzzle.size)] = (sizes[String(puzzle.size)] ?? 0) + 1; });
      blocks.push({ file: filename, difficulty, count: puzzles.length, ids: puzzles.map((puzzle) => puzzle.id), sizes, checksum: hash(body) });
    }
  }
  const all = order.flatMap((difficulty) => buckets[difficulty]);
  const globalSignature = hash(all.map((puzzle) => `${puzzle.id}:${puzzle.signature}`).join('|'));
  const manifest: PuzzleManifest = {
    version: VERSION,
    generatedAt: '2026-07-14T00:00:00.000Z',
    total: all.length,
    globalSignature,
    counts: { easy: buckets.easy.length, medium: buckets.medium.length, hard: buckets.hard.length },
    blocks,
  };
  await writeFile(resolve(OUTPUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  process.stdout.write(`Base gerada em ${OUTPUT}\nAssinatura: ${globalSignature}\nTentativas: ${attempts}\n`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
