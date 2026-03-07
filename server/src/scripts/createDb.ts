import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: "postgresql://postgres:Aritradutta%402005@localhost:5432/postgres?schema=public"
});

const createDb = async () => {
    try {
        await pool.query(`CREATE DATABASE "Madhyamgram-Rabindra-Academy"`);
        console.log("Database created successfully");
    } catch (error: any) {
        if (error.code === '42P04') {
            console.log("Database already exists");
        } else {
            console.error("Error creating database:", error);
        }
    } finally {
        process.exit(0);
    }
}
createDb();
