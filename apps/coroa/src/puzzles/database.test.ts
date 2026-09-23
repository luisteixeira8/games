// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PuzzleBlock, PuzzleManifest } from '../types/puzzle';
import { regionsAreConnected } from '../game/rules';
import { solvePuzzle } from './solver';

describe('base integral', () => {
  it('contém 1.000 puzzles válidos e de solução única', async () => {
    const root = resolve(process.cwd(), 'public/puzzles');
    const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8')) as PuzzleManifest;
    expect(manifest.counts).toEqual({ easy: 300, medium: 400, hard: 300 }); expect(manifest.total).toBe(1000);
    let total = 0; const signatures = new Set<string>();
    for (const info of manifest.blocks) {
      const block = JSON.parse(await readFile(resolve(root, info.file), 'utf8')) as PuzzleBlock;
      for (const puzzle of block.puzzles) {
        expect(regionsAreConnected(puzzle.size, puzzle.regions)).toBe(true);
        expect(solvePuzzle({ size: puzzle.size, regions: puzzle.regions }, 2).solutions).toHaveLength(1);
        signatures.add(puzzle.signature); total += 1;
      }
    }
    expect(total).toBe(1000); expect(signatures.size).toBe(1000);
  }, 120_000);
});
