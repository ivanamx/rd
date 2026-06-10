const { Pool } = require('pg');

let pool = null;

function getPool() {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL
            || 'postgresql://postgres:postgres@localhost:5432/desierto_sonoro';
        pool = new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000
        });
        pool.on('error', (err) => {
            console.error('Error inesperado en pool PostgreSQL:', err.message);
        });
    }
    return pool;
}

async function query(text, params) {
    return getPool().query(text, params);
}

async function withTransaction(fn) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function testConnection() {
    const res = await query('SELECT NOW() AS now');
    return res.rows[0];
}

async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

module.exports = {
    getPool,
    query,
    withTransaction,
    testConnection,
    closePool
};
