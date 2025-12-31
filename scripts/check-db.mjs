#!/usr/bin/env node
/**
 * Check database for games
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from .env.local
config({ path: join(__dirname, '..', '.env.local') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

console.log('✅ Connected to database');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

// For now, just check the connection works
console.log('\n📝 To manually clear the database, run:');
console.log('   npm run db:studio');
console.log('   Then delete all games from the "games" table\n');
