import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

if (!process.env.DATABASE_URL) {
  process.stderr.write('DATABASE_URL is required for database migrations.\n');
  process.exit(1);
}
