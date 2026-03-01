import fs from 'fs';
import pkg from 'pg';
import path from 'path';

const { Client } = pkg;

// Database connection details
const CONFIG = {
    user: 'postgres',
    password: 'Aritradutta@2005', // replace if different on the new PC
    host: 'localhost',
    port: 5432,
    databaseName: 'Madhyamgram-Ravindra-Academy',
    sqlFile: 'Madhyamgram-Ravindra-Academy.sql'
};

const importDatabase = async () => {
    // Stage 1: Connect to default 'postgres' database to create the new empty DB
    const adminClient = new Client({
        user: CONFIG.user,
        password: CONFIG.password,
        host: CONFIG.host,
        port: CONFIG.port,
        database: 'postgres'
    });

    try {
        console.log(`Connecting to PostgreSQL to create database "${CONFIG.databaseName}"...`);
        await adminClient.connect();

        try {
            await adminClient.query(`CREATE DATABASE "${CONFIG.databaseName}"`);
            console.log("Database created successfully!");
        } catch (err: any) {
            // Error code 42P04 means "database already exists"
            if (err.code === '42P04') {
                console.log("Database already exists. Proceeding to import tables...");
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error("Failed to connect or create database. Is PostgreSQL running and is the password correct?", err);
        process.exit(1);
    } finally {
        await adminClient.end();
    }

    // Stage 2: Connect to the NEW database directly and inject the SQL file
    const dbClient = new Client({
        user: CONFIG.user,
        password: CONFIG.password,
        host: CONFIG.host,
        port: CONFIG.port,
        database: CONFIG.databaseName
    });

    try {
        console.log(`Reading ${CONFIG.sqlFile}...`);
        const sqlParams = fs.readFileSync(path.resolve(CONFIG.sqlFile), 'utf8');

        console.log(`Importing tables, constraints, and data into "${CONFIG.databaseName}"...`);
        await dbClient.connect();
        await dbClient.query(sqlParams);
        console.log("🎉 Import completed successfully! You can now start your server.");

    } catch (err) {
        console.error("Error importing the SQL file:", err);
    } finally {
        await dbClient.end();
        process.exit(0);
    }
};

importDatabase();
