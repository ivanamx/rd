-- Desierto Sonoro / HN — Esquema PostgreSQL
-- Ejecutar: npm run db:migrate

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Usuarios (bandas, productores) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(255) NOT NULL,
    nombre_key      VARCHAR(255) NOT NULL UNIQUE,
    email           VARCHAR(255),
    email_key       VARCHAR(255),
    password_hash   VARCHAR(255) NOT NULL,
    telefono        VARCHAR(50),
    tipo            VARCHAR(20) NOT NULL DEFAULT 'banda'
                    CHECK (tipo IN ('banda', 'producer')),
    band_id         VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email_key ON users (email_key);
CREATE INDEX IF NOT EXISTS idx_users_band_id ON users (band_id);

-- ─── Bandas (catálogo público + perfiles) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS bands (
    id              VARCHAR(100) PRIMARY KEY,
    nombre          VARCHAR(255) NOT NULL,
    genero          VARCHAR(100),
    descripcion     TEXT,
    precio          INTEGER NOT NULL DEFAULT 0,          -- centavos MXN
    duracion        VARCHAR(50),
    imagen          TEXT,
    avatar          TEXT,
    cover_video     TEXT,
    hero_link       JSONB,
    premium         BOOLEAN NOT NULL DEFAULT FALSE,
    estrellas       NUMERIC(2,1),
    stats           JSONB,
    management      JSONB,
    contacto        VARCHAR(255),
    telefono        VARCHAR(50),
    email           VARCHAR(255),
    fecha_registro  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_band_id_fkey;
ALTER TABLE users
    ADD CONSTRAINT users_band_id_fkey
    FOREIGN KEY (band_id) REFERENCES bands(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS band_venues (
    band_id     VARCHAR(100) NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    venue_name  VARCHAR(255) NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (band_id, venue_name)
);

CREATE TABLE IF NOT EXISTS band_tracks (
    id          SERIAL PRIMARY KEY,
    band_id     VARCHAR(100) NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    track_key   VARCHAR(100),
    titulo      VARCHAR(255) NOT NULL,
    archivo     TEXT,
    data_url    TEXT,
    sort_order  SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS band_gallery (
    id          VARCHAR(100) NOT NULL,
    band_id     VARCHAR(100) NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    caption     TEXT,
    media_type  VARCHAR(20) NOT NULL DEFAULT 'image'
                CHECK (media_type IN ('image', 'video')),
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (band_id, id)
);

CREATE TABLE IF NOT EXISTS band_availability (
    band_id     VARCHAR(100) NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    fecha       DATE NOT NULL,
    PRIMARY KEY (band_id, fecha)
);

CREATE TABLE IF NOT EXISTS band_shows (
    id          SERIAL PRIMARY KEY,
    band_id     VARCHAR(100) NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    show_type   VARCHAR(20) NOT NULL CHECK (show_type IN ('upcoming', 'recent')),
    fecha       DATE NOT NULL,
    venue       VARCHAR(255) NOT NULL,
    fee         INTEGER,
    status      VARCHAR(50),
    hours       NUMERIC(4,1),
    sort_order  SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS band_top_venues (
    band_id     VARCHAR(100) NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    shows       INTEGER NOT NULL DEFAULT 0,
    last_date   DATE,
    revenue     INTEGER,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (band_id, name)
);

-- ─── Bares / venues ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS venues (
    id                  VARCHAR(100) PRIMARY KEY,
    nombre              VARCHAR(255) NOT NULL,
    tipo                VARCHAR(100),
    descripcion         TEXT,
    imagen              TEXT,
    direccion           TEXT,
    lat                 DOUBLE PRECISION,
    lng                 DOUBLE PRECISION,
    capacidad           INTEGER,
    musica_hoy          BOOLEAN NOT NULL DEFAULT FALSE,
    horario_musica      VARCHAR(100),
    estrellas           NUMERIC(2,1),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venue_genres (
    venue_id    VARCHAR(100) NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    genre       VARCHAR(100) NOT NULL,
    PRIMARY KEY (venue_id, genre)
);

-- ─── Estudios ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS studios (
    id                  VARCHAR(100) PRIMARY KEY,
    nombre              VARCHAR(255) NOT NULL,
    tipo                VARCHAR(100),
    descripcion         TEXT,
    precio              INTEGER NOT NULL DEFAULT 0,
    duracion_minima     VARCHAR(50),
    imagen              TEXT,
    ubicacion           VARCHAR(255),
    capacidad           VARCHAR(100),
    estrellas           NUMERIC(2,1),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS studio_gallery (
    studio_id   VARCHAR(100) NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (studio_id, url)
);

CREATE TABLE IF NOT EXISTS studio_equipment (
    studio_id   VARCHAR(100) NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    item        TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (studio_id, item)
);

CREATE TABLE IF NOT EXISTS studio_availability (
    studio_id   VARCHAR(100) NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    fecha       DATE NOT NULL,
    PRIMARY KEY (studio_id, fecha)
);

CREATE TABLE IF NOT EXISTS studio_horarios (
    studio_id   VARCHAR(100) NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    hora        VARCHAR(10) NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (studio_id, hora)
);

-- ─── Maestros / clases ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teachers (
    id              VARCHAR(100) PRIMARY KEY,
    nombre          VARCHAR(255) NOT NULL,
    instrumento     VARCHAR(100),
    genero          VARCHAR(100),
    descripcion     TEXT,
    imagen          TEXT,
    estrellas       NUMERIC(2,1),
    experiencia     VARCHAR(50),
    alumnos         INTEGER DEFAULT 0,
    horarios        VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_modalidad (
    teacher_id  VARCHAR(100) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    modalidad   VARCHAR(50) NOT NULL,
    PRIMARY KEY (teacher_id, modalidad)
);

CREATE TABLE IF NOT EXISTS teacher_niveles (
    teacher_id  VARCHAR(100) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    nivel       VARCHAR(50) NOT NULL,
    PRIMARY KEY (teacher_id, nivel)
);

CREATE TABLE IF NOT EXISTS class_plans (
    id              VARCHAR(100) NOT NULL,
    teacher_id      VARCHAR(100) NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    nombre          VARCHAR(255) NOT NULL,
    descripcion     TEXT,
    precio          INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (teacher_id, id)
);

-- ─── Marketplace ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS artists (
    id              INTEGER PRIMARY KEY,
    nombre          VARCHAR(255) NOT NULL,
    especialidad    VARCHAR(255),
    especialidad_en VARCHAR(255),
    descripcion     TEXT,
    descripcion_en  TEXT,
    imagen          TEXT,
    productos       INTEGER NOT NULL DEFAULT 0,
    ventas          INTEGER NOT NULL DEFAULT 0,
    rating          NUMERIC(2,1)
);

CREATE TABLE IF NOT EXISTS products (
    id              INTEGER PRIMARY KEY,
    nombre          VARCHAR(255) NOT NULL,
    nombre_en       VARCHAR(255),
    categoria       VARCHAR(50) NOT NULL,
    descripcion     TEXT,
    descripcion_en  TEXT,
    precio          INTEGER NOT NULL DEFAULT 0,   -- pesos MXN (como en mock)
    imagen          TEXT,
    stock           INTEGER NOT NULL DEFAULT 0,
    destacado       BOOLEAN NOT NULL DEFAULT FALSE,
    artista         VARCHAR(255),
    rating          NUMERIC(2,1)
);

-- ─── Reservas (persistencia Stripe) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
    id                  SERIAL PRIMARY KEY,
    tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('band', 'studio', 'class')),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled')),
    band_id             VARCHAR(100) REFERENCES bands(id) ON DELETE SET NULL,
    fecha               DATE,
    estudio_id          VARCHAR(100) REFERENCES studios(id) ON DELETE SET NULL,
    hora                VARCHAR(10),
    maestro_id          VARCHAR(100) REFERENCES teachers(id) ON DELETE SET NULL,
    plan_id             VARCHAR(100),
    stripe_session_id   VARCHAR(255),
    amount_cents        INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_band_slot
    ON reservations (band_id, fecha)
    WHERE tipo = 'band' AND status IN ('pending', 'confirmed');

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_studio_slot
    ON reservations (estudio_id, fecha, hora)
    WHERE tipo = 'studio' AND status IN ('pending', 'confirmed');

CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_class_slot
    ON reservations (maestro_id, plan_id)
    WHERE tipo = 'class' AND status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_reservations_stripe ON reservations (stripe_session_id);
