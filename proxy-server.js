// Servidor proxy para evitar CORS en APIs de reconocimiento de música
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const path = require('path');
const dataBridge = require('./db/server-bridge');

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
        await dataBridge.markReservationConfirmed(meta, session.id);
        console.log('✅ Reserva confirmada:', meta);
    } else if (event.type === 'checkout.session.expired') {
        const session = event.data.object;
        const meta = session.metadata || {};
        await dataBridge.markReservationExpired(meta);
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
app.get('/api/bandas', async (req, res) => {
    try {
        res.json(await dataBridge.getBandasDisponibles());
    } catch (error) {
        console.error('Error cargando bandas:', error);
        res.status(500).json({ error: 'Error al cargar bandas' });
    }
});

app.get('/api/bares', async (req, res) => {
    try {
        res.json(await dataBridge.getBares());
    } catch (error) {
        console.error('Error cargando bares:', error);
        res.status(500).json({ error: 'Error al cargar bares' });
    }
});

app.post('/api/bandas/liberar', async (req, res) => {
    const { bandaId, fecha } = req.body;
    if (!bandaId || !fecha) {
        return res.status(400).json({ error: 'Se requiere bandaId y fecha' });
    }
    const result = await dataBridge.liberarReserva('band', { bandaId, fecha });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true });
});

app.post('/api/bandas/checkout', async (req, res) => {
    try {
        const { bandaId, fecha } = req.body;

        if (!bandaId || !fecha) {
            return res.status(400).json({ error: 'Se requiere bandaId y fecha' });
        }

        const banda = await dataBridge.findBanda(bandaId);
        if (!banda) {
            return res.status(404).json({ error: 'Banda no encontrada' });
        }

        if (!banda.disponibilidad.includes(fecha)) {
            return res.status(400).json({ error: 'Fecha no disponible para esta banda' });
        }

        if (await dataBridge.isSlotReserved('band', { bandaId, fecha })) {
            return res.status(409).json({ error: 'Esta fecha ya fue reservada' });
        }

        if (!stripe) {
            return res.status(503).json({
                error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY a las variables de entorno.'
            });
        }

        await dataBridge.markReservationPending('band', { bandaId, fecha, amountCents: banda.precio });

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
            await dataBridge.rollbackPending('band', { bandaId: req.body.bandaId, fecha: req.body.fecha });
        }
        res.status(500).json({ error: error.message || 'Error al procesar el pago' });
    }
});

// API de estudios
app.get('/api/estudios', async (req, res) => {
    try {
        res.json(await dataBridge.getEstudiosDisponibles());
    } catch (error) {
        console.error('Error cargando estudios:', error);
        res.status(500).json({ error: 'Error al cargar estudios' });
    }
});

app.post('/api/estudios/liberar', async (req, res) => {
    const { estudioId, fecha, hora } = req.body;
    if (!estudioId || !fecha || !hora) {
        return res.status(400).json({ error: 'Se requiere estudioId, fecha y hora' });
    }
    const result = await dataBridge.liberarReserva('studio', { estudioId, fecha, hora });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true });
});

app.post('/api/estudios/checkout', async (req, res) => {
    try {
        const { estudioId, fecha, hora } = req.body;
        if (!estudioId || !fecha || !hora) {
            return res.status(400).json({ error: 'Se requiere estudioId, fecha y hora' });
        }

        const estudio = await dataBridge.findEstudio(estudioId);
        if (!estudio) return res.status(404).json({ error: 'Estudio no encontrado' });
        if (!estudio.disponibilidad.includes(fecha)) {
            return res.status(400).json({ error: 'Fecha no disponible' });
        }
        if (!(estudio.horarios || []).includes(hora)) {
            return res.status(400).json({ error: 'Horario no válido' });
        }

        if (await dataBridge.isSlotReserved('studio', { estudioId, fecha, hora })) {
            return res.status(409).json({ error: 'Este horario ya fue reservado' });
        }

        if (!stripe) {
            return res.status(503).json({ error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY a las variables de entorno.' });
        }

        await dataBridge.markReservationPending('studio', { estudioId, fecha, hora, amountCents: estudio.precio });
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
            await dataBridge.rollbackPending('studio', {
                estudioId: req.body.estudioId, fecha: req.body.fecha, hora: req.body.hora
            });
        }
        res.status(500).json({ error: error.message || 'Error al procesar el pago' });
    }
});

// API de clases
app.get('/api/clases', async (req, res) => {
    try {
        res.json(await dataBridge.getClasesDisponibles());
    } catch (error) {
        console.error('Error cargando clases:', error);
        res.status(500).json({ error: 'Error al cargar clases' });
    }
});

app.post('/api/clases/liberar', async (req, res) => {
    const { maestroId, planId } = req.body;
    if (!maestroId || !planId) {
        return res.status(400).json({ error: 'Se requiere maestroId y planId' });
    }
    const result = await dataBridge.liberarReserva('class', { maestroId, planId });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true });
});

app.post('/api/clases/checkout', async (req, res) => {
    try {
        const { maestroId, planId } = req.body;
        if (!maestroId || !planId) {
            return res.status(400).json({ error: 'Se requiere maestroId y planId' });
        }

        const maestro = await dataBridge.findMaestro(maestroId);
        if (!maestro) return res.status(404).json({ error: 'Maestro no encontrado' });

        const plan = (maestro.planes || []).find(p => p.id === planId);
        if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

        if (await dataBridge.isSlotReserved('class', { maestroId, planId })) {
            return res.status(409).json({ error: 'Este plan ya fue inscrito' });
        }

        if (!stripe) {
            return res.status(503).json({ error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY a las variables de entorno.' });
        }

        await dataBridge.markReservationPending('class', { maestroId, planId, amountCents: plan.precio });
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
            await dataBridge.rollbackPending('class', {
                maestroId: req.body.maestroId, planId: req.body.planId
            });
        }
        res.status(500).json({ error: error.message || 'Error al procesar el pago' });
    }
});

// API de autenticación
app.post('/api/auth/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
        }
        const result = await dataBridge.loginUser(identifier, password);
        if (!result) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }
        res.json({
            success: true,
            account: result.account,
            profile: result.profile
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

app.get('/api/auth/profile', async (req, res) => {
    try {
        const { nombreKey } = req.query;
        if (!nombreKey) return res.status(400).json({ error: 'nombreKey requerido' });
        const profile = await dataBridge.getProfileByNombreKey(nombreKey);
        if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });
        res.json({ profile });
    } catch (error) {
        console.error('Error cargando perfil:', error);
        res.status(500).json({ error: 'Error al cargar perfil' });
    }
});

// API marketplace
app.get('/api/productos', async (req, res) => {
    try {
        res.json(await dataBridge.getProductos());
    } catch (error) {
        console.error('Error cargando productos:', error);
        res.status(500).json({ error: 'Error al cargar productos' });
    }
});

app.get('/api/artistas', async (req, res) => {
    try {
        res.json(await dataBridge.getArtistas());
    } catch (error) {
        console.error('Error cargando artistas:', error);
        res.status(500).json({ error: 'Error al cargar artistas' });
    }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
async function startServer() {
    await dataBridge.init();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor proxy iniciado en http://localhost:${PORT}`);
        console.log(`🗄️  Base de datos: ${dataBridge.isDbEnabled() ? 'PostgreSQL' : 'JSON (fallback)'}`);
        console.log(`🎵 APIs de reconocimiento disponibles:`);
        console.log(`   - AudD: http://localhost:${PORT}/api/recognize`);
        console.log(`🎸 API de bandas: http://localhost:${PORT}/api/bandas`);
        console.log(`🍸 API de bares: http://localhost:${PORT}/api/bares`);
        console.log(`🎙️ API de estudios: http://localhost:${PORT}/api/estudios`);
        console.log(`🎓 API de clases: http://localhost:${PORT}/api/clases`);
        console.log(`🛒 API de productos: http://localhost:${PORT}/api/productos`);
        console.log(`🔐 API de auth: http://localhost:${PORT}/api/auth/login`);
        console.log(`💳 Stripe: ${stripe ? 'configurado' : 'no configurado (agrega STRIPE_SECRET_KEY)'}`);
    });
}

startServer().catch(err => {
    console.error('Error al iniciar servidor:', err);
    process.exit(1);
});

module.exports = app;
