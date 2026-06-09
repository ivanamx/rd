// Servidor proxy para evitar CORS en APIs de reconocimiento de música
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const AUDD_API_TOKEN = process.env.AUDD_API_TOKEN || 'test';

function parseAudDResponse(auddResult) {
    if (!auddResult || auddResult.status !== 'success') return null;
    const track = auddResult.result || auddResult;
    const title = track.title || track.song;
    const artist = track.artist;
    if (!title || !artist) return null;
    return {
        api: 'AudD',
        confidence: track.confidence || auddResult.confidence || 85,
        song: title,
        title,
        artist,
        album: track.album || '',
        genre: track.genre || '',
        year: track.release_date || '',
        spotify: track.spotify,
        apple_music: track.apple_music,
        deezer: track.deezer
    };
}

// Stripe (opcional — requiere STRIPE_SECRET_KEY)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// Reservas en memoria
const reservasPendientes = new Set();
const reservasConfirmadas = new Set();
const estudioReservasPendientes = new Set();
const estudioReservasConfirmadas = new Set();
const clasesReservasPendientes = new Set();
const clasesReservasConfirmadas = new Set();

function loadBandasData() {
    const filePath = path.join(__dirname, 'bandas.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getBandasDisponibles() {
    const data = loadBandasData();
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

function findBanda(bandaId) {
    return loadBandasData().bandas.find(b => b.id === bandaId);
}

function loadBaresData() {
    const filePath = path.join(__dirname, 'bares.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadEstudiosData() {
    const filePath = path.join(__dirname, 'estudios.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getEstudiosDisponibles() {
    const data = loadEstudiosData();
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

function findEstudio(estudioId) {
    return loadEstudiosData().estudios.find(e => e.id === estudioId);
}

function loadClasesData() {
    const filePath = path.join(__dirname, 'clases.json');
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getClasesDisponibles() {
    const data = loadClasesData();
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

function findMaestro(maestroId) {
    return loadClasesData().maestros.find(m => m.id === maestroId);
}

// Middleware
app.use(cors());

// Webhook de Stripe (debe ir antes de express.json)
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
        return res.status(503).send('Stripe no configurado');
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const meta = session.metadata || {};
        if (meta.tipo === 'estudio') {
            const key = `${meta.estudioId}:${meta.fecha}:${meta.hora}`;
            estudioReservasPendientes.delete(key);
            estudioReservasConfirmadas.add(key);
            console.log('✅ Reserva de estudio confirmada:', key);
        } else if (meta.tipo === 'clases') {
            const key = `${meta.maestroId}:${meta.planId}`;
            clasesReservasPendientes.delete(key);
            clasesReservasConfirmadas.add(key);
            console.log('✅ Inscripción de clases confirmada:', key);
        } else {
            const key = `${meta.bandaId}:${meta.fecha}`;
            reservasPendientes.delete(key);
            reservasConfirmadas.add(key);
            console.log('✅ Reserva confirmada:', key);
        }
    } else if (event.type === 'checkout.session.expired') {
        const session = event.data.object;
        const meta = session.metadata || {};
        if (meta.tipo === 'estudio') {
            estudioReservasPendientes.delete(`${meta.estudioId}:${meta.fecha}:${meta.hora}`);
        } else if (meta.tipo === 'clases') {
            clasesReservasPendientes.delete(`${meta.maestroId}:${meta.planId}`);
        } else {
            reservasPendientes.delete(`${meta.bandaId}:${meta.fecha}`);
        }
        console.log('⏰ Sesión de pago expirada');
    }

    res.json({ received: true });
});

app.use(express.json());
app.use(express.static('.'));

// Configurar multer para archivos de audio
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB límite
});

// APIs de reconocimiento disponibles
const APIS = {
    AUDD: {
        url: 'https://api.audd.io/',
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    },
    ACRCLOUD: {
        url: 'https://identify-us-west-2.acrcloud.com/v1/identify',
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    },
    AUDIOTAG: {
        url: 'https://audiotag.info/api',
        method: 'POST',
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    }
};

// Endpoint para reconocimiento de música
app.post('/api/recognize', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó archivo de audio' });
        }

        console.log('🎵 Procesando archivo de audio:', {
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });

        // Intentar con múltiples APIs
        const results = await tryMultipleAPIs(req.file);
        
        if (results.length > 0) {
            const bestResult = results[0]; // El mejor resultado
            console.log('✅ Reconocimiento exitoso:', bestResult);
            res.json({
                success: true,
                result: bestResult,
                allResults: results
            });
        } else {
            console.log('❌ No se pudo reconocer la canción');
            res.json({
                success: false,
                error: 'No se pudo identificar la canción',
                message: 'Intenta con una grabación más clara o una canción más popular'
            });
        }

    } catch (error) {
        console.error('Error en reconocimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// Función para probar múltiples APIs
async function tryMultipleAPIs(audioFile) {
    const results = [];
    
    // 1. AudD API (gratuita, buena precisión)
    try {
        console.log('🎵 Intentando AudD API...');
        const auddResult = await callAudDAPI(audioFile);
        const parsed = parseAudDResponse(auddResult);
        if (parsed) results.push(parsed);
    } catch (error) {
        console.log('❌ Error con AudD:', error.message);
    }

    // 2. AudioTag API (gratuita)
    try {
        console.log('🎵 Intentando AudioTag API...');
        const audioTagResult = await callAudioTagAPI(audioFile);
        if (audioTagResult && audioTagResult.success) {
            results.push({
                api: 'AudioTag',
                confidence: audioTagResult.confidence || 80,
                song: audioTagResult.title,
                artist: audioTagResult.artist,
                album: audioTagResult.album,
                genre: audioTagResult.genre,
                ...audioTagResult
            });
        }
    } catch (error) {
        console.log('❌ Error con AudioTag:', error.message);
    }

    // 3. ACRCloud API (requiere clave, pero más precisa)
    try {
        console.log('🎵 Intentando ACRCloud API...');
        const acrResult = await callACRCloudAPI(audioFile);
        if (acrResult && acrResult.status && acrResult.status.code === 0) {
            const music = acrResult.metadata?.music?.[0];
            if (music) {
                results.push({
                    api: 'ACRCloud',
                    confidence: 90,
                    song: music.title,
                    artist: music.artists?.[0]?.name,
                    album: music.album?.name,
                    genre: music.genres?.[0]?.name,
                    year: music.release_date,
                    ...acrResult
                });
            }
        }
    } catch (error) {
        console.log('❌ Error con ACRCloud:', error.message);
    }

    // Ordenar por confianza
    return results.sort((a, b) => b.confidence - a.confidence);
}

// Llamar a AudD API
async function callAudDAPI(audioFile) {
    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
        filename: audioFile.originalname,
        contentType: audioFile.mimetype
    });
    formData.append('return', 'spotify,apple_music,deezer');
    formData.append('api_token', AUDD_API_TOKEN);

    const response = await fetch(APIS.AUDD.url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.status !== 'success' && json.error) {
        console.log('⚠️ AudD respondió:', json.error?.error_message || json.error);
    }
    return json;
}

// Llamar a AudioTag API
async function callAudioTagAPI(audioFile) {
    const formData = new FormData();
    formData.append('file', audioFile.buffer, {
        filename: audioFile.originalname,
        contentType: audioFile.mimetype
    });

    const response = await fetch(APIS.AUDIOTAG.url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

// Llamar a ACRCloud API
async function callACRCloudAPI(audioFile) {
    const formData = new FormData();
    formData.append('sample', audioFile.buffer, {
        filename: audioFile.originalname,
        contentType: audioFile.mimetype
    });
    formData.append('sample_bytes', audioFile.size.toString());
    formData.append('access_key', 'demo_key'); // Clave demo
    formData.append('data_type', 'audio');
    formData.append('signature_version', '1');
    formData.append('signature', 'demo_signature');

    const response = await fetch(APIS.ACRCLOUD.url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

// Endpoint para reconocimiento por URL
app.post('/api/recognize-url', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL requerida' });
        }

        console.log('🎵 Reconociendo URL:', url);

        // Usar AudD con URL
        const formData = new FormData();
        formData.append('url', url);
        formData.append('return', 'spotify,apple_music,deezer');
        formData.append('api_token', AUDD_API_TOKEN);

        const response = await fetch(APIS.AUDD.url, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const parsed = parseAudDResponse(result);

        if (parsed) {
            res.json({ success: true, result: parsed });
        } else {
            res.json({
                success: false,
                error: 'No se pudo identificar la canción',
                message: result.error || 'Error desconocido'
            });
        }

    } catch (error) {
        console.error('Error en reconocimiento por URL:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// API de bandas locales
app.get('/api/bandas', (req, res) => {
    try {
        res.json(getBandasDisponibles());
    } catch (error) {
        console.error('Error cargando bandas:', error);
        res.status(500).json({ error: 'Error al cargar bandas' });
    }
});

app.get('/api/bares', (req, res) => {
    try {
        res.json(loadBaresData());
    } catch (error) {
        console.error('Error cargando bares:', error);
        res.status(500).json({ error: 'Error al cargar bares' });
    }
});

app.post('/api/bandas/liberar', (req, res) => {
    const { bandaId, fecha } = req.body;
    if (!bandaId || !fecha) {
        return res.status(400).json({ error: 'Se requiere bandaId y fecha' });
    }
    const key = `${bandaId}:${fecha}`;
    if (reservasConfirmadas.has(key)) {
        return res.status(400).json({ error: 'Reserva ya confirmada' });
    }
    reservasPendientes.delete(key);
    res.json({ success: true });
});

app.post('/api/bandas/checkout', async (req, res) => {
    try {
        const { bandaId, fecha } = req.body;

        if (!bandaId || !fecha) {
            return res.status(400).json({ error: 'Se requiere bandaId y fecha' });
        }

        const banda = findBanda(bandaId);
        if (!banda) {
            return res.status(404).json({ error: 'Banda no encontrada' });
        }

        if (!banda.disponibilidad.includes(fecha)) {
            return res.status(400).json({ error: 'Fecha no disponible para esta banda' });
        }

        const reservaKey = `${bandaId}:${fecha}`;
        if (reservasPendientes.has(reservaKey) || reservasConfirmadas.has(reservaKey)) {
            return res.status(409).json({ error: 'Esta fecha ya fue reservada' });
        }

        if (!stripe) {
            return res.status(503).json({
                error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY a las variables de entorno.'
            });
        }

        reservasPendientes.add(reservaKey);

        const origin = req.headers.origin || `http://localhost:${PORT}`;
        const precioMXN = banda.precio;

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: `Reserva: ${banda.nombre}`,
                        description: `${banda.genero} · ${banda.duracion} · ${fecha}`
                    },
                    unit_amount: precioMXN
                },
                quantity: 1
            }],
            metadata: { bandaId, fecha, bandaNombre: banda.nombre },
            success_url: `${origin}/?pago=ok&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?pago=cancelado`,
            expires_at: Math.floor(Date.now() / 1000) + 1800
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Error en checkout:', error);
        if (req.body?.bandaId && req.body?.fecha) {
            reservasPendientes.delete(`${req.body.bandaId}:${req.body.fecha}`);
        }
        res.status(500).json({ error: error.message || 'Error al procesar el pago' });
    }
});

// API de estudios
app.get('/api/estudios', (req, res) => {
    try {
        res.json(getEstudiosDisponibles());
    } catch (error) {
        console.error('Error cargando estudios:', error);
        res.status(500).json({ error: 'Error al cargar estudios' });
    }
});

app.post('/api/estudios/liberar', (req, res) => {
    const { estudioId, fecha, hora } = req.body;
    if (!estudioId || !fecha || !hora) {
        return res.status(400).json({ error: 'Se requiere estudioId, fecha y hora' });
    }
    const key = `${estudioId}:${fecha}:${hora}`;
    if (estudioReservasConfirmadas.has(key)) {
        return res.status(400).json({ error: 'Reserva ya confirmada' });
    }
    estudioReservasPendientes.delete(key);
    res.json({ success: true });
});

app.post('/api/estudios/checkout', async (req, res) => {
    try {
        const { estudioId, fecha, hora } = req.body;
        if (!estudioId || !fecha || !hora) {
            return res.status(400).json({ error: 'Se requiere estudioId, fecha y hora' });
        }

        const estudio = findEstudio(estudioId);
        if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });
        if (!estudio.disponibilidad.includes(fecha)) {
            return res.status(400).json({ error: 'Fecha no disponible' });
        }
        if (!(estudio.horarios || []).includes(hora)) {
            return res.status(400).json({ error: 'Horario no válido' });
        }

        const reservaKey = `${estudioId}:${fecha}:${hora}`;
        if (estudioReservasPendientes.has(reservaKey) || estudioReservasConfirmadas.has(reservaKey)) {
            return res.status(409).json({ error: 'Este horario ya fue reservado' });
        }

        if (!stripe) {
            return res.status(503).json({ error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY a las variables de entorno.' });
        }

        estudioReservasPendientes.add(reservaKey);
        const origin = req.headers.origin || `http://localhost:${PORT}`;

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: `Estudio: ${estudio.nombre}`,
                        description: `${estudio.tipo} · ${fecha} ${hora} · ${estudio.duracionMinima}`
                    },
                    unit_amount: estudio.precio
                },
                quantity: 1
            }],
            metadata: { tipo: 'estudio', estudioId, fecha, hora, estudioNombre: estudio.nombre },
            success_url: `${origin}/?pago=ok&tipo=estudio&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?pago=cancelado&tipo=estudio`,
            expires_at: Math.floor(Date.now() / 1000) + 1800
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Error en checkout estudio:', error);
        if (req.body?.estudioId && req.body?.fecha && req.body?.hora) {
            estudioReservasPendientes.delete(`${req.body.estudioId}:${req.body.fecha}:${req.body.hora}`);
        }
        res.status(500).json({ error: error.message || 'Error al procesar el pago' });
    }
});

// API de clases
app.get('/api/clases', (req, res) => {
    try {
        res.json(getClasesDisponibles());
    } catch (error) {
        console.error('Error cargando clases:', error);
        res.status(500).json({ error: 'Error al cargar clases' });
    }
});

app.post('/api/clases/liberar', (req, res) => {
    const { maestroId, planId } = req.body;
    if (!maestroId || !planId) {
        return res.status(400).json({ error: 'Se requiere maestroId y planId' });
    }
    const key = `${maestroId}:${planId}`;
    if (clasesReservasConfirmadas.has(key)) {
        return res.status(400).json({ error: 'Inscripción ya confirmada' });
    }
    clasesReservasPendientes.delete(key);
    res.json({ success: true });
});

app.post('/api/clases/checkout', async (req, res) => {
    try {
        const { maestroId, planId } = req.body;
        if (!maestroId || !planId) {
            return res.status(400).json({ error: 'Se requiere maestroId y planId' });
        }

        const maestro = findMaestro(maestroId);
        if (!maestro) return res.status(404).json({ error: 'Maestro no encontrado' });

        const plan = (maestro.planes || []).find(p => p.id === planId);
        if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

        const reservaKey = `${maestroId}:${planId}`;
        if (clasesReservasPendientes.has(reservaKey) || clasesReservasConfirmadas.has(reservaKey)) {
            return res.status(409).json({ error: 'Este plan ya fue inscrito' });
        }

        if (!stripe) {
            return res.status(503).json({ error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY a las variables de entorno.' });
        }

        clasesReservasPendientes.add(reservaKey);
        const origin = req.headers.origin || `http://localhost:${PORT}`;

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'mxn',
                    product_data: {
                        name: `Clases: ${maestro.nombre}`,
                        description: `${maestro.instrumento} · ${plan.nombre}`
                    },
                    unit_amount: plan.precio
                },
                quantity: 1
            }],
            metadata: { tipo: 'clases', maestroId, planId, maestroNombre: maestro.nombre, planNombre: plan.nombre },
            success_url: `${origin}/?pago=ok&tipo=clases&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/?pago=cancelado&tipo=clases`,
            expires_at: Math.floor(Date.now() / 1000) + 1800
        });

        res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
        console.error('Error en checkout clases:', error);
        if (req.body?.maestroId && req.body?.planId) {
            clasesReservasPendientes.delete(`${req.body.maestroId}:${req.body.planId}`);
        }
        res.status(500).json({ error: error.message || 'Error al procesar el pago' });
    }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor proxy iniciado en http://localhost:${PORT}`);
    console.log(`🎵 APIs de reconocimiento disponibles:`);
    console.log(`   - AudD: http://localhost:${PORT}/api/recognize`);
    console.log(`   - AudioTag: http://localhost:${PORT}/api/recognize`);
    console.log(`   - ACRCloud: http://localhost:${PORT}/api/recognize`);
    console.log(`🎸 API de bandas: http://localhost:${PORT}/api/bandas`);
    console.log(`🍸 API de bares: http://localhost:${PORT}/api/bares`);
    console.log(`🎙️ API de estudios: http://localhost:${PORT}/api/estudios`);
    console.log(`🎓 API de clases: http://localhost:${PORT}/api/clases`);
    console.log(`💳 Stripe: ${stripe ? 'configurado' : 'no configurado (agrega STRIPE_SECRET_KEY)'}`);
});

module.exports = app;
