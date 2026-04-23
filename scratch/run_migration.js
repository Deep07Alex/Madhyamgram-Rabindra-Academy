import { initDb } from '../server/src/lib/initDb.js';

async function run() {
    console.log('Starting manual migration...');
    await initDb();
    console.log('Migration finished.');
    process.exit(0);
}

run();
