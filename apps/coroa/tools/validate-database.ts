import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { Difficulty, Puzzle, PuzzleBlock, PuzzleManifest, SolverMetrics } from '../src/types/puzzle';
import { canonicalSignature } from '../src/puzzles/canonical';
import { classifyDifficulty } from '../src/puzzles/difficulty';
import { regionsAreConnected } from '../src/game/rules';
import { solvePuzzle } from '../src/puzzles/solver';

const ROOT = resolve(import.meta.dirname, '..');
const DATA = resolve(ROOT, 'public/puzzles');
const expected: Record<Difficulty, number> = { easy: 300, medium: 400, hard: 300 };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

function metricSummary(puzzles: Puzzle[], key: keyof SolverMetrics): { min: number; max: number; average: number } {
  const values = puzzles.map((puzzle) => puzzle.metrics[key]);
  return { min: Math.min(...values), max: Math.max(...values), average: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) };
}

async function main(): Promise<void> {
  const started = performance.now();
  const errors: string[] = [];
  const manifest = JSON.parse(await readFile(resolve(DATA, 'manifest.json'), 'utf8')) as PuzzleManifest;
  const puzzles: Puzzle[] = [];
  for (const blockInfo of manifest.blocks) {
    let body: string;
    try { body = await readFile(resolve(DATA, blockInfo.file), 'utf8'); }
    catch { errors.push(`Ficheiro ausente: ${blockInfo.file}`); continue; }
    if (hash(body) !== blockInfo.checksum) errors.push(`Checksum inválido: ${blockInfo.file}`);
    let block: PuzzleBlock;
    try { block = JSON.parse(body) as PuzzleBlock; }
    catch { errors.push(`JSON corrompido: ${blockInfo.file}`); continue; }
    if (block.version !== manifest.version || !Array.isArray(block.puzzles)) errors.push(`Esquema inválido: ${blockInfo.file}`);
    puzzles.push(...block.puzzles);
  }
  const ids = new Set<string>(); const signatures = new Set<string>();
  const duplicateIds: string[] = []; const duplicateSignatures: string[] = []; const invalidRegions: string[] = [];
  const solutionCounts: Record<string, number> = {};
  const sizeCounts: Record<string, number> = {};
  const difficultyCounts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const [index, puzzle] of puzzles.entries()) {
    if (ids.has(puzzle.id)) duplicateIds.push(puzzle.id); ids.add(puzzle.id);
    if (!regionsAreConnected(puzzle.size, puzzle.regions)) invalidRegions.push(puzzle.id);
    const result = solvePuzzle({ size: puzzle.size, regions: puzzle.regions }, 2);
    solutionCounts[puzzle.id] = result.solutions.length;
    if (result.solutions.length !== 1) errors.push(`${puzzle.id}: ${result.solutions.length} soluções`);
    else {
      const signature = canonicalSignature(puzzle.size, puzzle.regions, result.solutions[0]!);
      if (signature !== puzzle.signature) errors.push(`${puzzle.id}: assinatura guardada incorreta`);
      if (signatures.has(signature)) duplicateSignatures.push(signature); signatures.add(signature);
      if (classifyDifficulty(result.metrics, puzzle.size) !== puzzle.difficulty) errors.push(`${puzzle.id}: dificuldade não corresponde às métricas`);
      if (JSON.stringify(result.metrics) !== JSON.stringify(puzzle.metrics)) errors.push(`${puzzle.id}: métricas guardadas divergentes`);
    }
    difficultyCounts[puzzle.difficulty] += 1;
    sizeCounts[String(puzzle.size)] = (sizeCounts[String(puzzle.size)] ?? 0) + 1;
    if ((index + 1) % 100 === 0) process.stdout.write(`Validados ${index + 1}/${puzzles.length}\n`);
  }
  if (puzzles.length !== 1000) errors.push(`Total inválido: ${puzzles.length}`);
  for (const difficulty of Object.keys(expected) as Difficulty[]) if (difficultyCounts[difficulty] !== expected[difficulty]) errors.push(`Distribuição ${difficulty}: ${difficultyCounts[difficulty]}`);
  if (duplicateIds.length) errors.push(`${duplicateIds.length} IDs repetidos`);
  if (duplicateSignatures.length) errors.push(`${duplicateSignatures.length} assinaturas repetidas`);
  if (invalidRegions.length) errors.push(`${invalidRegions.length} regiões inválidas`);
  const computedGlobal = hash(puzzles.map((puzzle) => `${puzzle.id}:${puzzle.signature}`).join('|'));
  if (computedGlobal !== manifest.globalSignature) errors.push('Assinatura global divergente');
  const durationSeconds = Number(((performance.now() - started) / 1000).toFixed(2));
  const report = {
    databaseVersion: manifest.version, total: puzzles.length, byDifficulty: difficultyCounts, bySize: sizeCounts,
    allUniqueSolutions: Object.values(solutionCounts).every((count) => count === 1), solutionCounts,
    duplicateIds, duplicateSignatures, invalidRegions,
    metrics: Object.fromEntries((Object.keys(puzzles[0]?.metrics ?? {}) as (keyof SolverMetrics)[]).map((key) => [key, metricSummary(puzzles, key)])),
    durationSeconds, globalSignature: computedGlobal, status: errors.length ? 'failed' : 'passed', errors,
  };
  await writeFile(resolve(ROOT, 'validation-report.json'), JSON.stringify(report, null, 2) + '\n');
  const summary = `# Relatório de validação da base\n\n- Estado: **${errors.length ? 'falhou' : 'aprovado'}**\n- Total: **${puzzles.length}**\n- Dificuldade: ${difficultyCounts.easy} fáceis, ${difficultyCounts.medium} médios, ${difficultyCounts.hard} difíceis\n- Tamanhos: ${Object.entries(sizeCounts).sort().map(([size, count]) => `${size}×${size}: ${count}`).join('; ')}\n- Soluções únicas: **${Object.values(solutionCounts).filter((count) => count === 1).length}/${puzzles.length}**\n- IDs repetidos: **${duplicateIds.length}**\n- Assinaturas repetidas: **${duplicateSignatures.length}**\n- Regiões inválidas: **${invalidRegions.length}**\n- Tempo: **${durationSeconds} s**\n- Assinatura global: \`${computedGlobal}\`\n`;
  await writeFile(resolve(ROOT, 'VALIDATION.md'), summary);
  process.stdout.write(summary);
  if (errors.length) throw new Error(errors.slice(0, 20).join('\n'));
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
