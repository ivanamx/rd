/**
 * Puente entre proxy-server y PostgreSQL con fallback a archivos JSON.
 */
const path = require('path');
const fs = require('fs');

let useDb = false;
let db = null;

const reservasPendientes = new Set();
const reservasConfirmadas = new Set();
const estudioReservasPendientes = new Set();
const estudioReservasConfirmadas = new Set();
const clasesReservasPendientes = new Set();
const clasesReservasConfirmadas = new Set();

const ROOT = path.join(__dirname, '..');

function loadJson(filename) {
    return JSON.parse(fs.readFileSync(path.join(ROOT, filename), 'utf8'));
}

async function init() {
    if (process.env.USE_DB === 'false') {
        console.log('ℹ️  USE_DB=false — usando archivos JSON');
        return false;
    }
    try {
        db = require('./data-access');
        const { testConnection } = require('./index');
        await testConnection();
        useDb = true;
        console.log('✅ PostgreSQL conectado');
        return true;
    } catch (err) {
        console.warn('⚠️  PostgreSQL no disponible, fallback a JSON:', err.message);
        return false;
    }
}

function isDbEnabled() {
    return useDb;
}

// ─── Bandas ─────────────────────────────────────────────────────────────────

function getBandasDisponiblesJson() {
    const data = loadJson('bandas.json');
    return {
        bandas: data.bandas.map(banda => ({
            ...banda,
            disponibilidad: banda.disponibilidad.filter(fecha => {
                const key = `${banda.id}:${fecha}`;
                return !reservasPendientes.has(key) && !reservasConfirmadas.has(key);
            })
        }))
    };
}

function findBandaJson(bandaId) {
    return loadJson('bandas.json').bandas.find(b => b.id === bandaId);
}

async function getBandasDisponibles() {
    if (useDb) return db.getBandasDisponibles();
    return getBandasDisponiblesJson();
}

async function findBanda(bandaId) {
    if (useDb) return db.findBanda(bandaId);
    return findBandaJson(bandaId);
}

// ─── Bares ──────────────────────────────────────────────────────────────────

async function getBares() {
    if (useDb) return db.getBares();
    return loadJson('bares.json');
}

// ─── Estudios ───────────────────────────────────────────────────────────────

function getEstudiosDisponiblesJson() {
    const data = loadJson('estudios.json');
    return {
        estudios: data.estudios.map(estudio => ({
            ...estudio,
            disponibilidad: estudio.disponibilidad.filter(fecha => {
                const horarios = estudio.horarios || [];
                return horarios.some(hora => {
                    const key = `${estudio.id}:${fecha}:${hora}`;
                    return !estudioReservasPendientes.has(key) && !estudioReservasConfirmadas.has(key);
                });
            })
        }))
    };
}

function findEstudioJson(estudioId) {
    return loadJson('estudios.json').estudios.find(e => e.id === estudioId);
}

async function getEstudiosDisponibles() {
    if (useDb) return db.getEstudiosDisponibles();
    return getEstudiosDisponiblesJson();
}

async function findEstudio(estudioId) {
    if (useDb) return db.findEstudio(estudioId);
    return findEstudioJson(estudioId);
}

// ─── Clases ─────────────────────────────────────────────────────────────────

function getClasesDisponiblesJson() {
    const data = loadJson('clases.json');
    return {
        maestros: data.maestros.map(maestro => ({
            ...maestro,
            planes: (maestro.planes || []).filter(plan => {
                const key = `${maestro.id}:${plan.id}`;
                return !clasesReservasPendientes.has(key) && !clasesReservasConfirmadas.has(key);
            })
        }))
    };
}

function findMaestroJson(maestroId) {
    return loadJson('clases.json').maestros.find(m => m.id === maestroId);
}

async function getClasesDisponibles() {
    if (useDb) return db.getClasesDisponibles();
    return getClasesDisponiblesJson();
}

async function findMaestro(maestroId) {
    if (useDb) return db.findMaestro(maestroId);
    return findMaestroJson(maestroId);
}

// ─── Marketplace ────────────────────────────────────────────────────────────

async function getProductos() {
    if (useDb) return db.getProductos();
    return { productos: require('./seed-data/productos.json') };
}

async function getArtistas() {
    if (useDb) return db.getArtistas();
    return { artistas: require('./seed-data/artistas.json') };
}

// ─── Auth ───────────────────────────────────────────────────────────────────

async function loginUser(identifier, password) {
    if (useDb) return db.loginUser(identifier, password);
    return null;
}

async function getProfileByNombreKey(nombreKey) {
    if (useDb) return db.getProfileByNombreKey(nombreKey);
    return null;
}

// ─── Reservas ───────────────────────────────────────────────────────────────

async function markReservationPending(tipo, keys) {
    if (useDb) {
        await db.createReservation({
            tipo: tipo === 'band' ? 'band' : tipo === 'studio' ? 'studio' : 'class',
            bandId: keys.bandaId,
            fecha: keys.fecha,
            estudioId: keys.estudioId,
            hora: keys.hora,
            maestroId: keys.maestroId,
            planId: keys.planId,
            amountCents: keys.amountCents
        });
        return;
    }
    if (tipo === 'band') reservasPendientes.add(`${keys.bandaId}:${keys.fecha}`);
    else if (tipo === 'studio') estudioReservasPendientes.add(`${keys.estudioId}:${keys.fecha}:${keys.hora}`);
    else clasesReservasPendientes.add(`${keys.maestroId}:${keys.planId}`);
}

async function markReservationConfirmed(meta, stripeSessionId) {
    if (useDb) {
        await db.confirmReservation(meta, stripeSessionId);
        return;
    }
    if (meta.tipo === 'estudio') {
        const key = `${meta.estudioId}:${meta.fecha}:${meta.hora}`;
        estudioReservasPendientes.delete(key);
        estudioReservasConfirmadas.add(key);
    } else if (meta.tipo === 'clases') {
        const key = `${meta.maestroId}:${meta.planId}`;
        clasesReservasPendientes.delete(key);
        clasesReservasConfirmadas.add(key);
    } else {
        const key = `${meta.bandaId}:${meta.fecha}`;
        reservasPendientes.delete(key);
        reservasConfirmadas.add(key);
    }
}

async function markReservationExpired(meta) {
    if (useDb) {
        await db.expireReservation(meta);
        return;
    }
    if (meta.tipo === 'estudio') {
        estudioReservasPendientes.delete(`${meta.estudioId}:${meta.fecha}:${meta.hora}`);
    } else if (meta.tipo === 'clases') {
        clasesReservasPendientes.delete(`${meta.maestroId}:${meta.planId}`);
    } else {
        reservasPendientes.delete(`${meta.bandaId}:${meta.fecha}`);
    }
}

async function liberarReserva(tipo, keys) {
    if (useDb) return db.liberarReserva(tipo, keys);
    if (tipo === 'band') {
        const key = `${keys.bandaId}:${keys.fecha}`;
        if (reservasConfirmadas.has(key)) return { error: 'Reserva ya confirmada' };
        reservasPendientes.delete(key);
    } else if (tipo === 'studio') {
        const key = `${keys.estudioId}:${keys.fecha}:${keys.hora}`;
        if (estudioReservasConfirmadas.has(key)) return { error: 'Reserva ya confirmada' };
        estudioReservasPendientes.delete(key);
    } else {
        const key = `${keys.maestroId}:${keys.planId}`;
        if (clasesReservasConfirmadas.has(key)) return { error: 'Inscripción ya confirmada' };
        clasesReservasPendientes.delete(key);
    }
    return { success: true };
}

async function isSlotReserved(tipo, keys) {
    if (useDb) return db.isSlotReserved(tipo, keys);
    if (tipo === 'band') {
        const key = `${keys.bandaId}:${keys.fecha}`;
        return reservasPendientes.has(key) || reservasConfirmadas.has(key);
    }
    if (tipo === 'studio') {
        const key = `${keys.estudioId}:${keys.fecha}:${keys.hora}`;
        return estudioReservasPendientes.has(key) || estudioReservasConfirmadas.has(key);
    }
    const key = `${keys.maestroId}:${keys.planId}`;
    return clasesReservasPendientes.has(key) || clasesReservasConfirmadas.has(key);
}

async function rollbackPending(tipo, keys) {
    if (useDb) return db.liberarReserva(tipo, keys);
    if (tipo === 'band') reservasPendientes.delete(`${keys.bandaId}:${keys.fecha}`);
    else if (tipo === 'studio') estudioReservasPendientes.delete(`${keys.estudioId}:${keys.fecha}:${keys.hora}`);
    else clasesReservasPendientes.delete(`${keys.maestroId}:${keys.planId}`);
}

module.exports = {
    init,
    isDbEnabled,
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
    getProfileByNombreKey,
    markReservationPending,
    markReservationConfirmed,
    markReservationExpired,
    liberarReserva,
    isSlotReserved,
    rollbackPending
};
