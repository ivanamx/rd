const bcrypt = require('bcryptjs');
const { query } = require('./index');

function formatDate(d) {
    if (!d) return null;
    if (typeof d === 'string') return d.slice(0, 10);
    return d.toISOString().slice(0, 10);
}

async function getReservedBandDates() {
    const res = await query(`
        SELECT band_id, fecha::text AS fecha
        FROM reservations
        WHERE tipo = 'band' AND status IN ('pending', 'confirmed')
    `);
    return new Set(res.rows.map(r => `${r.band_id}:${r.fecha}`));
}

async function getReservedStudioSlots() {
    const res = await query(`
        SELECT estudio_id, fecha::text AS fecha, hora
        FROM reservations
        WHERE tipo = 'studio' AND status IN ('pending', 'confirmed')
    `);
    return new Set(res.rows.map(r => `${r.estudio_id}:${r.fecha}:${r.hora}`));
}

async function getReservedClassPlans() {
    const res = await query(`
        SELECT maestro_id, plan_id
        FROM reservations
        WHERE tipo = 'class' AND status IN ('pending', 'confirmed')
    `);
    return new Set(res.rows.map(r => `${r.maestro_id}:${r.plan_id}`));
}

async function buildBandRow(row, reservedDates) {
    const id = row.id;
    const [venues, tracks, gallery, availability, shows, topVenues] = await Promise.all([
        query('SELECT venue_name FROM band_venues WHERE band_id=$1 ORDER BY sort_order', [id]),
        query('SELECT titulo, archivo, data_url FROM band_tracks WHERE band_id=$1 ORDER BY sort_order', [id]),
        query('SELECT id, url, caption, media_type FROM band_gallery WHERE band_id=$1 ORDER BY sort_order', [id]),
        query('SELECT fecha::text FROM band_availability WHERE band_id=$1 ORDER BY fecha', [id]),
        query(`SELECT show_type, fecha::text, venue, fee, status, hours
               FROM band_shows WHERE band_id=$1 ORDER BY show_type, sort_order`, [id]),
        query('SELECT name, shows, last_date::text, revenue FROM band_top_venues WHERE band_id=$1 ORDER BY sort_order', [id])
    ]);

    const banda = {
        id: row.id,
        nombre: row.nombre,
        genero: row.genero,
        descripcion: row.descripcion,
        precio: row.precio,
        duracion: row.duracion,
        imagen: row.imagen,
        estrellas: row.estrellas ? parseFloat(row.estrellas) : undefined,
        lugares: venues.rows.map(v => v.venue_name),
        canciones: tracks.rows.map(t => ({
            titulo: t.titulo,
            archivo: t.archivo || t.data_url
        })),
        disponibilidad: availability.rows
            .map(a => a.fecha)
            .filter(fecha => !reservedDates.has(`${id}:${fecha}`))
    };

    if (row.avatar) banda.avatar = row.avatar;
    if (row.cover_video) banda.coverVideo = row.cover_video;
    if (row.hero_link) banda.heroLink = row.hero_link;
    if (row.premium) banda.premium = row.premium;
    if (row.stats) banda.stats = row.stats;

    if (gallery.rows.length) {
        banda.galeria = gallery.rows.map(g => ({
            id: g.id,
            url: g.url,
            caption: g.caption,
            type: g.media_type
        }));
    }

    const upcoming = shows.rows.filter(s => s.show_type === 'upcoming');
    const recent = shows.rows.filter(s => s.show_type === 'recent');
    if (upcoming.length) {
        banda.proximosShows = upcoming.map(s => ({
            fecha: s.fecha,
            venue: s.venue,
            ...(s.fee != null && { fee: s.fee }),
            ...(s.status && { status: s.status })
        }));
    }
    if (recent.length) {
        banda.showsRecientes = recent.map(s => ({
            fecha: s.fecha,
            venue: s.venue,
            ...(s.hours != null && { hours: parseFloat(s.hours) })
        }));
    }
    if (topVenues.rows.length) {
        banda.topVenues = topVenues.rows.map(v => ({
            name: v.name,
            shows: v.shows,
            lastDate: v.last_date
        }));
    }

    return banda;
}

async function getBandasDisponibles() {
    const reservedDates = await getReservedBandDates();
    const bands = await query('SELECT * FROM bands ORDER BY nombre');
    const bandas = await Promise.all(
        bands.rows.map(row => buildBandRow(row, reservedDates))
    );
    return { bandas };
}

async function findBanda(bandaId) {
    const res = await query('SELECT * FROM bands WHERE id=$1', [bandaId]);
    if (!res.rowCount) return null;
    const reservedDates = await getReservedBandDates();
    return buildBandRow(res.rows[0], reservedDates);
}

async function getBares() {
    const venues = await query('SELECT * FROM venues ORDER BY nombre');
    const bares = await Promise.all(venues.rows.map(async (v) => {
        const genres = await query('SELECT genre FROM venue_genres WHERE venue_id=$1', [v.id]);
        return {
            id: v.id,
            nombre: v.nombre,
            tipo: v.tipo,
            descripcion: v.descripcion,
            imagen: v.imagen,
            direccion: v.direccion,
            lat: v.lat,
            lng: v.lng,
            capacidad: v.capacidad,
            musicaHoy: v.musica_hoy,
            generosPreferidos: genres.rows.map(g => g.genre),
            estrellas: v.estrellas ? parseFloat(v.estrellas) : undefined,
            horarioMusica: v.horario_musica
        };
    }));
    return { bares };
}

async function getEstudiosDisponibles() {
    const reserved = await getReservedStudioSlots();
    const estudios = await query('SELECT * FROM studios ORDER BY nombre');

    const result = await Promise.all(estudios.rows.map(async (e) => {
        const [gallery, equipment, availability, horarios] = await Promise.all([
            query('SELECT url FROM studio_gallery WHERE studio_id=$1 ORDER BY sort_order', [e.id]),
            query('SELECT item FROM studio_equipment WHERE studio_id=$1 ORDER BY sort_order', [e.id]),
            query('SELECT fecha::text FROM studio_availability WHERE studio_id=$1 ORDER BY fecha', [e.id]),
            query('SELECT hora FROM studio_horarios WHERE studio_id=$1 ORDER BY sort_order', [e.id])
        ]);

        const horasList = horarios.rows.map(h => h.hora);
        const fechasDisp = availability.rows
            .map(a => a.fecha)
            .filter(fecha => horasList.some(hora => !reserved.has(`${e.id}:${fecha}:${hora}`)));

        return {
            id: e.id,
            nombre: e.nombre,
            tipo: e.tipo,
            descripcion: e.descripcion,
            precio: e.precio,
            duracionMinima: e.duracion_minima,
            imagen: e.imagen,
            galeria: gallery.rows.map(g => g.url),
            equipamiento: equipment.rows.map(eq => eq.item),
            estrellas: e.estrellas ? parseFloat(e.estrellas) : undefined,
            ubicacion: e.ubicacion,
            capacidad: e.capacidad,
            disponibilidad: fechasDisp,
            horarios: horasList
        };
    }));

    return { estudios: result };
}

async function findEstudio(estudioId) {
    const data = await getEstudiosDisponibles();
    return data.estudios.find(e => e.id === estudioId) || null;
}

async function getClasesDisponibles() {
    const reserved = await getReservedClassPlans();
    const teachers = await query('SELECT * FROM teachers ORDER BY nombre');

    const maestros = await Promise.all(teachers.rows.map(async (t) => {
        const [modalidad, niveles, planes] = await Promise.all([
            query('SELECT modalidad FROM teacher_modalidad WHERE teacher_id=$1', [t.id]),
            query('SELECT nivel FROM teacher_niveles WHERE teacher_id=$1', [t.id]),
            query('SELECT id, nombre, descripcion, precio FROM class_plans WHERE teacher_id=$1', [t.id])
        ]);

        return {
            id: t.id,
            nombre: t.nombre,
            instrumento: t.instrumento,
            genero: t.genero,
            descripcion: t.descripcion,
            imagen: t.imagen,
            estrellas: t.estrellas ? parseFloat(t.estrellas) : undefined,
            experiencia: t.experiencia,
            alumnos: t.alumnos,
            modalidad: modalidad.rows.map(m => m.modalidad),
            horarios: t.horarios,
            niveles: niveles.rows.map(n => n.nivel),
            planes: planes.rows
                .filter(p => !reserved.has(`${t.id}:${p.id}`))
                .map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    descripcion: p.descripcion,
                    precio: p.precio
                }))
        };
    }));

    return { maestros };
}

async function findMaestro(maestroId) {
    const data = await getClasesDisponibles();
    return data.maestros.find(m => m.id === maestroId) || null;
}

async function getProductos() {
    const res = await query('SELECT * FROM products ORDER BY id');
    return {
        productos: res.rows.map(p => ({
            id: p.id,
            nombre: p.nombre,
            nombreEn: p.nombre_en,
            categoria: p.categoria,
            descripcion: p.descripcion,
            descripcionEn: p.descripcion_en,
            precio: p.precio,
            imagen: p.imagen,
            stock: p.stock,
            destacado: p.destacado,
            artista: p.artista,
            rating: p.rating ? parseFloat(p.rating) : undefined
        }))
    };
}

async function getArtistas() {
    const res = await query('SELECT * FROM artists ORDER BY id');
    return {
        artistas: res.rows.map(a => ({
            id: a.id,
            nombre: a.nombre,
            especialidad: a.especialidad,
            especialidadEn: a.especialidad_en,
            descripcion: a.descripcion,
            descripcionEn: a.descripcion_en,
            imagen: a.imagen,
            productos: a.productos,
            ventas: a.ventas,
            rating: a.rating ? parseFloat(a.rating) : undefined
        }))
    };
}

async function loginUser(identifier, password) {
    const key = identifier.toLowerCase();
    const res = await query(`
        SELECT u.*, b.nombre AS band_nombre
        FROM users u
        LEFT JOIN bands b ON b.id = u.band_id
        WHERE u.nombre_key = $1 OR u.email_key = $1
        LIMIT 1
    `, [key]);

    if (!res.rowCount) return null;
    const user = res.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;

    return {
        account: {
            nombre: user.nombre,
            nombreKey: user.nombre_key,
            email: user.email,
            emailKey: user.email_key,
            telefono: user.telefono,
            tipo: user.tipo,
            bandId: user.band_id
        },
        profile: user.band_id ? await getBandProfile(user.band_id) : null
    };
}

async function getBandProfile(bandId) {
    const banda = await findBanda(bandId);
    if (!banda) return null;

    const row = await query('SELECT * FROM bands WHERE id=$1', [bandId]);
    const r = row.rows[0];

    return {
        nombre: banda.nombre,
        nombreKey: banda.nombre.toLowerCase(),
        genero: banda.genero,
        duracion: banda.duracion,
        precio: Math.round(banda.precio / 100),
        descripcion: banda.descripcion,
        contacto: r.contacto,
        telefono: r.telefono,
        email: r.email,
        lugares: banda.lugares,
        avatar: banda.avatar || banda.imagen,
        cover: banda.imagen,
        coverVideo: banda.coverVideo,
        heroLink: banda.heroLink,
        galeria: banda.galeria,
        muestras: (await query(
            'SELECT track_key AS id, titulo, archivo AS data_url FROM band_tracks WHERE band_id=$1 ORDER BY sort_order',
            [bandId]
        )).rows.map(t => ({
            id: t.id,
            titulo: t.titulo,
            dataUrl: t.data_url
        })),
        stats: banda.stats,
        management: r.management,
        proximosShows: banda.proximosShows,
        showsRecientes: banda.showsRecientes,
        rating: banda.estrellas,
        premium: banda.premium,
        fechaRegistro: r.fecha_registro
    };
}

async function getProfileByNombreKey(nombreKey) {
    const user = await query('SELECT band_id FROM users WHERE nombre_key=$1', [nombreKey]);
    if (!user.rowCount || !user.rows[0].band_id) return null;
    return getBandProfile(user.rows[0].band_id);
}

// ─── Reservas ───────────────────────────────────────────────────────────────

async function createReservation(data) {
    const res = await query(`
        INSERT INTO reservations (tipo, status, band_id, fecha, estudio_id, hora,
            maestro_id, plan_id, stripe_session_id, amount_cents)
        VALUES ($1,'pending',$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id
    `, [
        data.tipo, data.bandId || null, data.fecha || null,
        data.estudioId || null, data.hora || null,
        data.maestroId || null, data.planId || null,
        data.stripeSessionId || null, data.amountCents || null
    ]);
    return res.rows[0].id;
}

async function confirmReservation(meta, stripeSessionId) {
    if (meta.tipo === 'estudio') {
        await query(`
            UPDATE reservations SET status='confirmed', stripe_session_id=$4, updated_at=NOW()
            WHERE tipo='studio' AND estudio_id=$1 AND fecha=$2 AND hora=$3 AND status='pending'
        `, [meta.estudioId, meta.fecha, meta.hora, stripeSessionId]);
    } else if (meta.tipo === 'clases') {
        await query(`
            UPDATE reservations SET status='confirmed', stripe_session_id=$3, updated_at=NOW()
            WHERE tipo='class' AND maestro_id=$1 AND plan_id=$2 AND status='pending'
        `, [meta.maestroId, meta.planId, stripeSessionId]);
    } else {
        await query(`
            UPDATE reservations SET status='confirmed', stripe_session_id=$3, updated_at=NOW()
            WHERE tipo='band' AND band_id=$1 AND fecha=$2 AND status='pending'
        `, [meta.bandaId, meta.fecha, stripeSessionId]);
    }
}

async function expireReservation(meta) {
    if (meta.tipo === 'estudio') {
        await query(`
            UPDATE reservations SET status='expired', updated_at=NOW()
            WHERE tipo='studio' AND estudio_id=$1 AND fecha=$2 AND hora=$3 AND status='pending'
        `, [meta.estudioId, meta.fecha, meta.hora]);
    } else if (meta.tipo === 'clases') {
        await query(`
            UPDATE reservations SET status='expired', updated_at=NOW()
            WHERE tipo='class' AND maestro_id=$1 AND plan_id=$2 AND status='pending'
        `, [meta.maestroId, meta.planId]);
    } else {
        await query(`
            UPDATE reservations SET status='expired', updated_at=NOW()
            WHERE tipo='band' AND band_id=$1 AND fecha=$2 AND status='pending'
        `, [meta.bandaId, meta.fecha]);
    }
}

async function liberarReserva(tipo, keys) {
    if (tipo === 'band') {
        const confirmed = await query(`
            SELECT 1 FROM reservations
            WHERE tipo='band' AND band_id=$1 AND fecha=$2 AND status='confirmed'
        `, [keys.bandaId, keys.fecha]);
        if (confirmed.rowCount) return { error: 'Reserva ya confirmada' };
        await query(`
            DELETE FROM reservations
            WHERE tipo='band' AND band_id=$1 AND fecha=$2 AND status='pending'
        `, [keys.bandaId, keys.fecha]);
    } else if (tipo === 'studio') {
        const confirmed = await query(`
            SELECT 1 FROM reservations
            WHERE tipo='studio' AND estudio_id=$1 AND fecha=$2 AND hora=$3 AND status='confirmed'
        `, [keys.estudioId, keys.fecha, keys.hora]);
        if (confirmed.rowCount) return { error: 'Reserva ya confirmada' };
        await query(`
            DELETE FROM reservations
            WHERE tipo='studio' AND estudio_id=$1 AND fecha=$2 AND hora=$3 AND status='pending'
        `, [keys.estudioId, keys.fecha, keys.hora]);
    } else if (tipo === 'class') {
        const confirmed = await query(`
            SELECT 1 FROM reservations
            WHERE tipo='class' AND maestro_id=$1 AND plan_id=$2 AND status='confirmed'
        `, [keys.maestroId, keys.planId]);
        if (confirmed.rowCount) return { error: 'Inscripción ya confirmada' };
        await query(`
            DELETE FROM reservations
            WHERE tipo='class' AND maestro_id=$1 AND plan_id=$2 AND status='pending'
        `, [keys.maestroId, keys.planId]);
    }
    return { success: true };
}

async function isSlotReserved(tipo, keys) {
    if (tipo === 'band') {
        const r = await query(`
            SELECT 1 FROM reservations
            WHERE tipo='band' AND band_id=$1 AND fecha=$2 AND status IN ('pending','confirmed')
        `, [keys.bandaId, keys.fecha]);
        return r.rowCount > 0;
    }
    if (tipo === 'studio') {
        const r = await query(`
            SELECT 1 FROM reservations
            WHERE tipo='studio' AND estudio_id=$1 AND fecha=$2 AND hora=$3 AND status IN ('pending','confirmed')
        `, [keys.estudioId, keys.fecha, keys.hora]);
        return r.rowCount > 0;
    }
    if (tipo === 'class') {
        const r = await query(`
            SELECT 1 FROM reservations
            WHERE tipo='class' AND maestro_id=$1 AND plan_id=$2 AND status IN ('pending','confirmed')
        `, [keys.maestroId, keys.planId]);
        return r.rowCount > 0;
    }
    return false;
}

module.exports = {
    getBandasDisponibles,
    findBanda,
    getBares,
    getEstudiosDisponibles,
    findEstudio,
    getClasesDisponibles,
    findMaestro,
    getProductos,
    getArtistas,
    loginUser,
    getBandProfile,
    getProfileByNombreKey,
    createReservation,
    confirmReservation,
    expireReservation,
    liberarReserva,
    isSlotReserved
};
