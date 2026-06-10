#!/usr/bin/env node
/**
 * Crea la base de datos (si no existe) y aplica el esquema.
 * Uso: npm run db:migrate
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'desierto_sonoro';
const ADMIN_URL = process.env.DATABASE_ADMIN_URL
    || process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/postgres')
    || 'postgresql://postgres:postgres@localhost:5432/postgres';
const APP_URL = process.env.DATABASE_URL
    || `postgresql://postgres:postgres@localhost:5432/${DB_NAME}`;

async function ensureDatabase() {
    const client = new Client({ connectionString: ADMIN_URL });
    await client.connect();
    const exists = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [DB_NAME]
    );
    if (exists.rowCount === 0) {
        await client.query(`CREATE DATABASE ${DB_NAME}`);
        console.log(`✅ Base de datos "${DB_NAME}" creada`);
    } else {
        console.log(`ℹ️  Base de datos "${DB_NAME}" ya existe`);
    }
    await client.end();
}

async function applySchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const client = new Client({ connectionString: APP_URL });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log('✅ Esquema aplicado correctamente');
}

async function main() {
    try {
        await ensureDatabase();
        await applySchema();
        console.log('\n🎸 Migración completada. Ejecuta: npm run db:seed');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error en migración:', err.message);
        process.exit(1);
    }
}

main();
