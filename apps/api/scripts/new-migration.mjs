#!/usr/bin/env node
// Create a migration from changes in prisma/schema.prisma, without prompts.
//
//   npm run db:new -w @digimart/api -- add_rfqs
//
// Works in non-interactive shells and CI, unlike `prisma migrate dev`.
// It also drops statements that would undo SQL Prisma can't model
// (the generated full-text "searchVector" column and its index).
// Review the file, then apply with `npm run db:deploy`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const name = (process.argv[2] || '').trim();
if (!/^[a-z0-9_]+$/.test(name)) {
  console.error('Usage: npm run db:new -- <snake_case_name>');
  process.exit(1);
}

const root = path.resolve(import.meta.dirname, '..');
const envFile = path.join(root, '.env');
const env = { ...process.env };
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in env)) env[m[1]] = m[2];
  }
}
if (!env.SHADOW_DATABASE_URL) {
  console.error('Set SHADOW_DATABASE_URL in .env: an empty scratch database Prisma may wipe, e.g. …/digimart360_shadow');
  process.exit(1);
}

const sql = execFileSync(
  'npx',
  [
    'prisma', 'migrate', 'diff',
    '--from-migrations', 'prisma/migrations',
    '--to-schema-datamodel', 'prisma/schema.prisma',
    '--shadow-database-url', env.SHADOW_DATABASE_URL,
    '--script',
  ],
  { cwd: root, env, encoding: 'utf8', shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'inherit'] },
);

// Prisma prints one block per change, each starting with a "-- Comment" line.
const keepOut = /searchVector/;
const blocks = sql.split(/\n(?=-- [A-Z])/).filter((b) => b.trim() && !keepOut.test(b));
const body = blocks.join('\n').trim();
if (!body || body === '-- This is an empty migration.') {
  console.log('No schema changes found.');
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const dir = path.join(root, 'prisma', 'migrations', `${stamp}_${name}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'migration.sql'), body + '\n');
console.log(`Created ${path.relative(root, dir)}/migration.sql\nReview it, then run: npm run db:deploy`);
