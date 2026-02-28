import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Ensure the DATABASE_URL points to the local or VPS postgres instance
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const db = pool;
