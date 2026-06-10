#!/usr/bin/env node
/**
 * Pobla PostgreSQL con todos los datos mock del proyecto.
 * Uso: npm run db:seed
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query, withTransaction, closePool } = require('./index');

const ROOT = path.join(__dirname, '..');

function readJson(filename) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, filename), 'utf8'));
}

function readSeedJson(filename) {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data', filename), 'utf8'));
}

const GARY_MANAGEMENT = {
    earnings: {
        month: 21600, year: 187200, pending: 14400, avgPerShow: 7200, monthTrend: 18, yearTrend: 34
    },
    venues: {
        totalUnique: 12, thisMonth: 3, thisYear: 18, repeatRate: 42,
        topVenues: [
            { name: 'Bar El Callejón', shows: 8, lastDate: '2026-05-28', revenue: 57600 },
            { name: 'La Siberia', shows: 5, lastDate: '2026-04-12', revenue: 36000 },
            { name: 'Foro Cultural Saltillo', shows: 4, lastDate: '2026-03-21', revenue: 32000 },
            { name: 'Parque Saltillo 400', shows: 3, lastDate: '2026-06-01', revenue: 21600 }
        ]
    },
    stageTime: { hoursThisMonth: 7.5, hoursThisYear: 65, showsThisMonth: 3, showsThisYear: 26, avgSetLength: 2.5 }
};

async function clearAll(client) {
    const tables = [
        'reservations', 'products', 'artists', 'class_plans', 'teacher_niveles', 'teacher_modalidad',
        'teachers', 'studio_horarios', 'studio_availability', 'studio_equipment', 'studio_gallery',
        'studios', 'venue_genres', 'venues', 'band_top_venues', 'band_shows', 'band_availability',
        'band_gallery', 'band_tracks', 'band_venues', 'users', 'bands'
    ];
    for (const t of tables) {
        await client.query(`DELETE FROM ${t}`);
    }
}

async function seedBand(client, banda) {
    const isGary = banda.id === 'gary-garcia';
    const management = isGary ? GARY_MANAGEMENT : null;
    const stats = banda.stats || (isGary ? { vistas: 3842, reservas: 47, shows: 31, productos: 5 } : null);

    await client.query(`
        INSERT INTO bands (id, nombre, genero, descripcion, precio, duracion, imagen, avatar,
            cover_video, hero_link, premium, estrellas, stats, management, contacto, telefono, email, fecha_registro)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        ON CONFLICT (id) DO UPDATE SET
            nombre=EXCLUDED.nombre, genero=EXCLUDED.genero, descripcion=EXCLUDED.descripcion,
            precio=EXCLUDED.precio, duracion=EXCLUDED.duracion, imagen=EXCLUDED.imagen,
            avatar=EXCLUDED.avatar, cover_video=EXCLUDED.cover_video, hero_link=EXCLUDED.hero_link,
            premium=EXCLUDED.premium, estrellas=EXCLUDED.estrellas, stats=EXCLUDED.stats,
            management=EXCLUDED.management, contacto=EXCLUDED.contacto, telefono=EXCLUDED.telefono,
            email=EXCLUDED.email, fecha_registro=EXCLUDED.fecha_registro
    `, [
        banda.id, banda.nombre, banda.genero, banda.descripcion, banda.precio, banda.duracion,
        banda.imagen, banda.avatar || null, banda.coverVideo || null,
        banda.heroLink ? JSON.stringify(banda.heroLink) : null,
        banda.premium || false, banda.estrellas || null,
        stats ? JSON.stringify(stats) : null,
        management ? JSON.stringify(management) : null,
        isGary ? 'Gary Garcia' : null,
        isGary ? '+528441234567' : null,
        isGary ? 'gary@desierto.com' : null,
        isGary ? '2025-11-15T10:00:00.000Z' : null
    ]);

    if (banda.lugares) {
        for (let i = 0; i < banda.lugares.length; i++) {
            await client.query(
                'INSERT INTO band_venues (band_id, venue_name, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
                [banda.id, banda.lugares[i], i]
            );
        }
    }

    const tracks = banda.canciones || [];
    for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        await client.query(`
            INSERT INTO band_tracks (band_id, track_key, titulo, archivo, sort_order)
            VALUES ($1,$2,$3,$4,$5)
        `, [banda.id, `track-${i}`, t.titulo, t.archivo, i]);
    }

    if (banda.galeria) {
        for (let i = 0; i < banda.galeria.length; i++) {
            const g = banda.galeria[i];
            await client.query(`
                INSERT INTO band_gallery (id, band_id, url, caption, media_type, sort_order)
                VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING
            `, [g.id, banda.id, g.url, g.caption || null, g.type || 'image', i]);
        }
    }

    if (banda.disponibilidad) {
        for (const fecha of banda.disponibilidad) {
            await client.query(
                'INSERT INTO band_availability (band_id, fecha) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                [banda.id, fecha]
            );
        }
    }

    if (banda.proximosShows) {
        for (let i = 0; i < banda.proximosShows.length; i++) {
            const s = banda.proximosShows[i];
            await client.query(`
                INSERT INTO band_shows (band_id, show_type, fecha, venue, fee, status, sort_order)
                VALUES ($1,'upcoming',$2,$3,$4,$5,$6)
            `, [banda.id, s.fecha, s.venue, s.fee || null, s.status || null, i]);
        }
    }

    if (banda.showsRecientes) {
        for (let i = 0; i < banda.showsRecientes.length; i++) {
            const s = banda.showsRecientes[i];
            await client.query(`
                INSERT INTO band_shows (band_id, show_type, fecha, venue, hours, sort_order)
                VALUES ($1,'recent',$2,$3,$4,$5)
            `, [banda.id, s.fecha, s.venue, s.hours || null, i]);
        }
    }

    if (banda.topVenues) {
        for (let i = 0; i < banda.topVenues.length; i++) {
            const v = banda.topVenues[i];
            await client.query(`
                INSERT INTO band_top_venues (band_id, name, shows, last_date, sort_order)
                VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING
            `, [banda.id, v.name, v.shows, v.lastDate || null, i]);
        }
    }
}

async function seedVenues(client) {
    const { bares } = readJson('bares.json');
    for (const bar of bares) {
        await client.query(`
            INSERT INTO venues (id, nombre, tipo, descripcion, imagen, direccion, lat, lng,
                capacidad, musica_hoy, horario_musica, estrellas)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, tipo=EXCLUDED.tipo
        `, [
            bar.id, bar.nombre, bar.tipo, bar.descripcion, bar.imagen, bar.direccion,
            bar.lat, bar.lng, bar.capacidad, bar.musicaHoy || false,
            bar.horarioMusica || null, bar.estrellas || null
        ]);
        for (const genre of (bar.generosPreferidos || [])) {
            await client.query(
                'INSERT INTO venue_genres (venue_id, genre) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                [bar.id, genre]
            );
        }
    }
}

async function seedStudios(client) {
    const { estudios } = readJson('estudios.json');
    for (const e of estudios) {
        await client.query(`
            INSERT INTO studios (id, nombre, tipo, descripcion, precio, duracion_minima, imagen,
                ubicacion, capacidad, estrellas)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre
        `, [
            e.id, e.nombre, e.tipo, e.descripcion, e.precio, e.duracionMinima,
            e.imagen, e.ubicacion, e.capacidad, e.estrellas || null
        ]);
        for (let i = 0; i < (e.galeria || []).length; i++) {
            await client.query(
                'INSERT INTO studio_gallery (studio_id, url, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
                [e.id, e.galeria[i], i]
            );
        }
        for (let i = 0; i < (e.equipamiento || []).length; i++) {
            await client.query(
                'INSERT INTO studio_equipment (studio_id, item, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
                [e.id, e.equipamiento[i], i]
            );
        }
        for (const fecha of (e.disponibilidad || [])) {
            await client.query(
                'INSERT INTO studio_availability (studio_id, fecha) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                [e.id, fecha]
            );
        }
        for (let i = 0; i < (e.horarios || []).length; i++) {
            await client.query(
                'INSERT INTO studio_horarios (studio_id, hora, sort_order) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
                [e.id, e.horarios[i], i]
            );
        }
    }
}

async function seedTeachers(client) {
    const { maestros } = readJson('clases.json');
    for (const m of maestros) {
        await client.query(`
            INSERT INTO teachers (id, nombre, instrumento, genero, descripcion, imagen,
                estrellas, experiencia, alumnos, horarios)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre
        `, [
            m.id, m.nombre, m.instrumento, m.genero, m.descripcion, m.imagen,
            m.estrellas || null, m.experiencia || null, m.alumnos || 0, m.horarios || null
        ]);
        for (const mod of (m.modalidad || [])) {
            await client.query(
                'INSERT INTO teacher_modalidad (teacher_id, modalidad) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                [m.id, mod]
            );
        }
        for (const nivel of (m.niveles || [])) {
            await client.query(
                'INSERT INTO teacher_niveles (teacher_id, nivel) VALUES ($1,$2) ON CONFLICT DO NOTHING',
                [m.id, nivel]
            );
        }
        for (const plan of (m.planes || [])) {
            await client.query(`
                INSERT INTO class_plans (id, teacher_id, nombre, descripcion, precio)
                VALUES ($1,$2,$3,$4,$5)
                ON CONFLICT (teacher_id, id) DO UPDATE SET nombre=EXCLUDED.nombre, precio=EXCLUDED.precio
            `, [plan.id, m.id, plan.nombre, plan.descripcion || null, plan.precio]);
        }
    }
}

async function seedMarketplace(client) {
    const artistas = readSeedJson('artistas.json');
    const productos = readSeedJson('productos.json');

    for (const a of artistas) {
        await client.query(`
            INSERT INTO artists (id, nombre, especialidad, especialidad_en, descripcion,
                descripcion_en, imagen, productos, ventas, rating)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre
        `, [
            a.id, a.nombre, a.especialidad, a.especialidadEn || null,
            a.descripcion, a.descripcionEn || null, a.imagen,
            a.productos, a.ventas, a.rating || null
        ]);
    }

    for (const p of productos) {
        await client.query(`
            INSERT INTO products (id, nombre, nombre_en, categoria, descripcion, descripcion_en,
                precio, imagen, stock, destacado, artista, rating)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            ON CONFLICT (id) DO UPDATE SET nombre=EXCLUDED.nombre, stock=EXCLUDED.stock
        `, [
            p.id, p.nombre, p.nombreEn || null, p.categoria, p.descripcion, p.descripcionEn || null,
            p.precio, p.imagen, p.stock, p.destacado || false, p.artista, p.rating || null
        ]);
    }
}

async function seedUsers(client) {
    const users = [
        {
            nombre: 'Gary Garcia', nombreKey: 'gary garcia', email: 'gary@desierto.com',
            password: 'gary2024', telefono: '+528441234567', tipo: 'banda', bandId: 'gary-garcia'
        },
        {
            nombre: 'Hector Garcia', nombreKey: 'hector garcia', email: 'producer@desierto.com',
            password: 'producer2024', telefono: '+528441987654', tipo: 'producer', bandId: null
        }
    ];

    for (const u of users) {
        const hash = await bcrypt.hash(u.password, 10);
        await client.query(`
            INSERT INTO users (nombre, nombre_key, email, email_key, password_hash, telefono, tipo, band_id)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            ON CONFLICT (nombre_key) DO UPDATE SET
                email=EXCLUDED.email, email_key=EXCLUDED.email_key,
                password_hash=EXCLUDED.password_hash, telefono=EXCLUDED.telefono,
                tipo=EXCLUDED.tipo, band_id=EXCLUDED.band_id
        `, [
            u.nombre, u.nombreKey, u.email, u.email.toLowerCase(),
            hash, u.telefono, u.tipo, u.bandId
        ]);
    }
}

async function main() {
    console.log('🌱 Iniciando seed de Desierto Sonoro...\n');

    await withTransaction(async (client) => {
        console.log('  Limpiando tablas...');
        await clearAll(client);

        console.log('  Sembrando bandas...');
        const { bandas } = readJson('bandas.json');
        for (const banda of bandas) {
            await seedBand(client, banda);
        }
        console.log(`    ✓ ${bandas.length} bandas`);

        console.log('  Sembrando bares...');
        await seedVenues(client);
        console.log(`    ✓ ${readJson('bares.json').bares.length} bares`);

        console.log('  Sembrando estudios...');
        await seedStudios(client);
        console.log(`    ✓ ${readJson('estudios.json').estudios.length} estudios`);

        console.log('  Sembrando maestros...');
        await seedTeachers(client);
        console.log(`    ✓ ${readJson('clases.json').maestros.length} maestros`);

        console.log('  Sembrando marketplace...');
        await seedMarketplace(client);
        console.log(`    ✓ ${readSeedJson('productos.json').length} productos, ${readSeedJson('artistas.json').length} artistas`);

        console.log('  Sembrando usuarios...');
        await seedUsers(client);
        console.log('    ✓ Gary Garcia + Hector Garcia');
    });

    const counts = await query(`
        SELECT
            (SELECT COUNT(*) FROM bands) AS bandas,
            (SELECT COUNT(*) FROM venues) AS bares,
            (SELECT COUNT(*) FROM studios) AS estudios,
            (SELECT COUNT(*) FROM teachers) AS maestros,
            (SELECT COUNT(*) FROM products) AS productos,
            (SELECT COUNT(*) FROM artists) AS artistas,
            (SELECT COUNT(*) FROM users) AS usuarios
    `);
    const c = counts.rows[0];
    console.log('\n✅ Seed completado:');
    console.log(`   Bandas: ${c.bandas} | Bares: ${c.bares} | Estudios: ${c.estudios}`);
    console.log(`   Maestros: ${c.maestros} | Productos: ${c.productos} | Artistas: ${c.artistas}`);
    console.log(`   Usuarios: ${c.usuarios}`);

    await closePool();
    process.exit(0);
}

main().catch(async (err) => {
    console.error('❌ Error en seed:', err);
    await closePool();
    process.exit(1);
});
