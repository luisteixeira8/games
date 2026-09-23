import { createHash } from 'node:crypto';

function normaliseRegions(values: readonly number[]): string {
  const labels = new Map<number, number>();
  let next = 0;
  return values.map((value) => {
    if (!labels.has(value)) labels.set(value, next++);
    return String.fromCharCode(65 + labels.get(value)!);
  }).join('');
}

function transform(size: number, row: number, col: number, variant: number): [number, number] {
  switch (variant) {
    case 0: return [row, col];
    case 1: return [col, size - 1 - row];
    case 2: return [size - 1 - row, size - 1 - col];
    case 3: return [size - 1 - col, row];
    case 4: return [row, size - 1 - col];
    case 5: return [size - 1 - row, col];
    case 6: return [col, row];
    default: return [size - 1 - col, size - 1 - row];
  }
}

export function canonicalRepresentation(size: number, encoded: string, solution: readonly number[]): string {
  const regions = [...encoded].map((char) => char.charCodeAt(0) - 65);
  const variants: string[] = [];
  for (let variant = 0; variant < 8; variant += 1) {
    const transformedRegions = Array<number>(size * size);
    const transformedSolution = Array<number>(size);
    for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) {
      const [nr, nc] = transform(size, row, col, variant);
      transformedRegions[nr * size + nc] = regions[row * size + col]!;
    }
    solution.forEach((col, row) => { const [nr, nc] = transform(size, row, col, variant); transformedSolution[nr] = nc; });
    variants.push(`${normaliseRegions(transformedRegions)}:${transformedSolution.join(',')}`);
  }
  return variants.sort()[0]!;
}

export function canonicalSignature(size: number, encoded: string, solution: readonly number[]): string {
  return createHash('sha256').update(canonicalRepresentation(size, encoded, solution)).digest('hex').slice(0, 20);
}
