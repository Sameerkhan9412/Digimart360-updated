import fs from 'node:fs';
import path from 'node:path';

/**
 * Point the app at the TEST database before anything reads DATABASE_URL.
 * Refuses to run against a database whose name doesn't contain "test".
 */
export function useTestEnv(): void {
  const file = path.join(__dirname, '..', '.env');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  }
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('Set TEST_DATABASE_URL (a database the tests may wipe)');
  const dbName = new URL(url).pathname.slice(1);
  if (!/test/i.test(dbName)) throw new Error(`Refusing to run e2e tests against "${dbName}": its name must contain "test"`);
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  process.env.UPLOAD_DIR = path.join(require('node:os').tmpdir(), 'digimart-e2e-uploads');
  process.env.MEDIA_BASE_URL = 'http://localhost:3000/media';
  process.env.MAIL_TRANSPORT = 'console';
  process.env.ROOT_DOMAIN = 'digimart.test';
  process.env.SITES_TARGET = 'sites.digimart.test';
  process.env.JWT_ACCESS_SECRET ||= 'e2e-secret-that-is-at-least-32-characters-long';
  process.env.INTERNAL_API_KEY ||= 'e2e-internal-key-that-is-at-least-32-characters';
  process.env.SEED_ADMIN_EMAIL ||= 'admin@digimart360.local';
}
