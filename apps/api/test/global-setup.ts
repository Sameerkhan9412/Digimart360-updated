import { execSync } from 'node:child_process';
import path from 'node:path';
import { useTestEnv } from './load-env';

/** Fresh test database: drop everything, apply all migrations, load admin + demo catalog. */
export default function globalSetup(): void {
  useTestEnv();
  const cwd = path.join(__dirname, '..');
  const run = (cmd: string) => execSync(cmd, { cwd, env: process.env, stdio: ['ignore', 'ignore', 'inherit'] });
  run('npx prisma migrate reset --force --skip-seed --skip-generate');
  run('npx ts-node prisma/seed.ts');
  run('npx ts-node prisma/seed-demo.ts');
}
