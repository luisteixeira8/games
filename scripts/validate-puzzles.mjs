import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const appRoot = resolve(root, 'apps/coroa');
const result = spawnSync(process.execPath, ['--import', 'tsx/esm', 'tools/validate-database.ts'], {
  cwd: appRoot,
  env: process.env,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
