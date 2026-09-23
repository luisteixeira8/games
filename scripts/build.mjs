import { cp, mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const sitePrefix = repositoryName ? `/${repositoryName}` : '';

const run = (args, env = {}) => {
  const result = spawnSync('npm', args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of ['index.html', 'styles.css', 'script.js', 'brand-lockup.svg', 'brand-mark.svg', 'brand-pattern.svg', 'favicon.svg', 'og-image.svg']) {
  await cp(resolve(root, file), resolve(dist, file));
}

run(['--prefix', resolve(root, 'apps/coroa'), 'run', 'build', '--', '--outDir', resolve(dist, 'coroa')], {
  VITE_BASE_PATH: `${sitePrefix}/coroa/`,
});
run(['--prefix', resolve(root, 'apps/stack-tower'), 'run', 'build', '--', '--outDir', resolve(dist, 'stack-tower')], {
  VITE_BASE_PATH: `${sitePrefix}/stack-tower/`,
});
await cp(resolve(root, 'apps/tictactoe'), resolve(dist, 'tictactoe'), { recursive: true });
