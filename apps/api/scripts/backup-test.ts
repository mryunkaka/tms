import { config } from 'dotenv';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const parsed = new URL(databaseUrl);
const childEnv = {
  ...process.env,
  PGHOST: parsed.hostname,
  PGPORT: parsed.port || '5432',
  PGUSER: decodeURIComponent(parsed.username),
  PGPASSWORD: decodeURIComponent(parsed.password),
  PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)),
};
const dir = mkdtempSync(join(tmpdir(), 'tms-pg-backup-test-'));
const dumpPath = join(dir, `${randomUUID()}.dump`);

async function run(program: string, args: string[], options: { stdio?: 'inherit' | 'ignore' } = {}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(program, args, { stdio: options.stdio ?? 'inherit', env: childEnv });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${program} exited with ${code}`)));
  });
}

try {
  await run('pg_dump', ['--format=custom', `--file=${dumpPath}`]);
  await run('pg_restore', ['--list', dumpPath], { stdio: 'ignore' });
  process.stdout.write('PostgreSQL backup archive passed the pg_restore list check.\n');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
