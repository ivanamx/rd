const puppeteer = require('puppeteer');
const { Server } = require('socket.io');
const express = require('express');
const path = require('path');
const fs = require('fs');

class ShazamAutomation {
    constructor() {
        this.browser = null;
        this.page = null;
        this.isListening = false;
        this.resultCallback = null;
        this.io = null;
        this.app = express();
        this.server = null;
        this.audioFilePath = path.join(__dirname, 'temp-shazam-input.wav');
        this.capturedNetworkResult = null;
        this.networkResponseHandler = null;
    }

    async initialize() {
        try {
            console.log('🚀 Iniciando automatización de Shazam...');
            
            // Configurar Express para servir archivos estáticos
            this.app.use(express.static('.'));
            this.app.use(express.json());
            
            // Crear servidor HTTP
            this.server = require('http').createServer(this.app);
            
            // Configurar Socket.IO
            this.io = new Server(this.server, {
                cors: {
                    origin: "*",
                    methods: ["GET", "POST"]
                }
            });
            
            // Iniciar servidor
            this.server.listen(3002, () => {
                console.log('📡 Servidor de automatización corriendo en puerto 3002');
            });
            
            // Configurar eventos de Socket.IO
            this.setupSocketEvents();
            
            // Iniciar Puppeteer
            await this.launchBrowser();
            
            console.log('✅ Automatización de Shazam inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando automatización:', error);
            throw error;
        }
    }

    async launchBrowser(useAudioFile = false) {
        try {
            if (this.browser) {
                await this.browser.close().catch(() => {});
                this.browser = null;
                this.page = null;
            }

            const launchArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection',
                '--autoplay-policy=no-user-gesture-required',
                '--use-fake-ui-for-media-stream',
                '--use-fake-device-for-media-stream',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ];

            if (useAudioFile && fs.existsSync(this.audioFilePath)) {
                launchArgs.push(`--use-file-for-fake-audio-capture=${this.audioFilePath}`);
                console.log('🎤 Usando audio capturado del cliente:', this.audioFilePath);
            } else {
                console.log('⚠️ Sin archivo de audio del cliente — el micrófono fake estará vacío');
            }

            console.log('🌐 Lanzando navegador Chrome en modo headless nuevo...');
            
            this.browser = await puppeteer.launch({
                headless: 'new',
                defaultViewport: { width: 1920, height: 1080 },
                protocolTimeout: 90000,
                args: launchArgs
            });
            
            console.log('✅ Navegador Chrome lanzado en modo headless nuevo');
            
            // Crear página inicial
            console.log('📄 Creando página inicial...');
            this.page = await this.browser.newPage();
            
            // Configurar permisos de micrófono
            console.log('🎤 Configurando permisos de micrófono...');
            const context = this.browser.defaultBrowserContext();
            await context.overridePermissions('https://www.shazam.com', ['microphone']);
            
            console.log('✅ Navegador Chrome configurado correctamente');
            
        } catch (error) {
            console.error('❌ Error lanzando navegador:', error);
            throw error;
        }
    }

    setupSocketEvents() {
        this.io.on('connection', (socket) => {
            console.log('🔌 Cliente conectado:', socket.id);
            
            socket.on('start-shazam', async (data) => {
                try {
                    const hasAudio = data?.audio && await this.saveAudioFile(data.audio);
                    if (hasAudio) {
                        await this.launchBrowser(true);
                    }
                    await this.startShazamRecognition();
                    socket.emit('shazam-started', { success: true });
                } catch (error) {
                    socket.emit('shazam-error', { error: error.message });
                }
            });
            
            socket.on('stop-shazam', async () => {
                try {
                    await this.stopShazamRecognition();
                    socket.emit('shazam-stopped', { success: true });
                } catch (error) {
                    socket.emit('shazam-error', { error: error.message });
                }
            });
            
            socket.on('disconnect', () => {
                console.log('🔌 Cliente desconectado:', socket.id);
            });
        });
    }

    async saveAudioFile(base64Audio) {
        try {
            const buffer = Buffer.from(base64Audio, 'base64');
            if (buffer.length < 1000) {
                console.log('⚠️ Audio recibido demasiado pequeño:', buffer.length, 'bytes');
                return false;
            }
            fs.writeFileSync(this.audioFilePath, buffer);
            console.log('✅ Audio del cliente guardado:', buffer.length, 'bytes');
            return true;
        } catch (error) {
            console.error('❌ Error guardando audio del cliente:', error.message);
            return false;
        }
    }

    setupNetworkMonitoring() {
        this.capturedNetworkResult = null;

        if (this.networkResponseHandler && this.page) {
            this.page.off('response', this.networkResponseHandler);
        }

        this.networkResponseHandler = async (response) => {
            try {
                const url = response.url();
                const isShazamApi = /shazam\.com.*\/(discovery|identify|match|search)/i.test(url)
                    || /amp\.shazam\.com/i.test(url)
                    || /\/services\//i.test(url);

                if (!isShazamApi || response.status() !== 200) return;

                const contentType = response.headers()['content-type'] || '';
                if (!contentType.includes('json')) return;

                const json = await response.json();
                const track = this.extractTrackFromNetworkResponse(json);
                if (track) {
                    console.log('🎯 Resultado capturado de API de Shazam:', track);
                    this.capturedNetworkResult = track;
                }
            } catch {
                // Respuestas no-JSON o ya consumidas
            }
        };

        this.page.on('response', this.networkResponseHandler);
    }

    extractTrackFromNetworkResponse(json) {
        const candidates = [
            json?.track,
            json?.matches?.[0],
            json?.results?.[0],
            json?.data?.track,
            json?.resources?.['track@1']?.[0]
        ];

        for (const item of candidates) {
            if (!item) continue;
            const title = item.title || item.heading?.title || item.name;
            const artist = item.subtitle || item.heading?.subtitle
                || item.artists?.[0]?.name || item.artist;
            if (title && artist) {
                return {
                    title,
                    artist,
                    imageUrl: item.images?.coverart || item.images?.background || item.image || '',
                    genre: item.genres?.primary || item.genre || '',
                    shazamCount: item.share?.subject || ''
                };
            }
        }
        return null;
    }

    async startShazamRecognition() {
        if (this.isListening) {
            console.log('⚠️ ⚠️ Shazam ya está escuchando, ignorando nueva solicitud');
            return;
        }

        try {
            console.log('🎵 🚀 INICIANDO RECONOCIMIENTO DE MÚSICA CON SHAZAM...');
            console.log('⏰ Timestamp:', new Date().toISOString());
            
            // Verificar que el navegador esté funcionando
            if (!this.browser || !this.browser.isConnected()) {
                console.log('🔄 Navegador no disponible, reiniciando...');
                const hasAudio = fs.existsSync(this.audioFilePath);
                await this.launchBrowser(hasAudio);
            }
            
            this.isListening = true;
            console.log('✅ Estado de escucha activado');
            
            // Crear nueva página si no existe o está cerrada
            if (!this.page || this.page.isClosed()) {
                console.log('🔄 Creando nueva página de navegador...');
                try {
                this.page = await this.browser.newPage();
                    console.log('✅ Nueva página creada exitosamente');
                
                    // Configurar permisos de micrófono para la nueva página
                    console.log('🎤 Configurando permisos de micrófono para nueva página...');
                const context = this.browser.defaultBrowserContext();
                await context.overridePermissions('https://www.shazam.com', ['microphone']);
                    console.log('✅ Permisos de micrófono configurados para nueva página');
                } catch (error) {
                    console.error('❌ Error creando nueva página:', error);
                    throw new Error(`No se pudo crear nueva página: ${error.message}`);
                }
            } else {
                console.log('✅ Usando página existente');
            }
            
                // Navegar a Shazam.com/apps
                console.log('🌐 Navegando a Shazam.com/apps...');
                const navigationStart = Date.now();
                try {
                    await this.page.goto('https://www.shazam.com/apps', { 
                        waitUntil: 'domcontentloaded', // Más rápido que networkidle2
                        timeout: 60000 // 60 segundos timeout
                    });
                    const navigationTime = Date.now() - navigationStart;
                    console.log(`✅ Página de Shazam Apps cargada en ${navigationTime}ms`);
                } catch (error) {
                    console.error('❌ Error navegando a Shazam Apps:', error);
                    throw new Error(`No se pudo navegar a Shazam Apps: ${error.message}`);
                }
            
            // Verificar que estamos en la página correcta
            const currentUrl = this.page.url();
            console.log('📍 URL actual después de navegación:', currentUrl);
            
            if (!currentUrl.includes('shazam.com/apps')) {
                console.log('⚠️ ⚠️ ADVERTENCIA: No estamos en shazam.com/apps');
            }
            
            // Esperar a que la página cargue completamente
            console.log('⏳ Esperando carga completa de la página (5 segundos)...');
            await this.page.waitForTimeout(5000);
            
            // Verificar que la página está lista
            const pageTitle = await this.page.title();
            console.log('📄 Título de la página:', pageTitle);

            // Interceptar respuestas de la API de Shazam antes de activar el botón
            this.setupNetworkMonitoring();
            
            // Buscar el botón flotante de Shazam
            console.log('🔍 Iniciando búsqueda del botón de Shazam...');
            await this.findAndClickShazamButton();
            
            // Monitorear resultados
            console.log('👂 Iniciando monitoreo de resultados...');
            await this.monitorShazamResults();
            
        } catch (error) {
            console.error('❌ ❌ ERROR EN RECONOCIMIENTO DE SHAZAM:', error);
            console.error('📊 Detalles del error:', {
                message: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            this.isListening = false;
            this.io.emit('shazam-error', { 
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    }

    async findAndClickShazamButton() {
        try {
            console.log('🔍 PASO 1: Buscando botón flotante de Shazam...');
            console.log('📍 URL actual:', this.page.url());
            
            // Verificar que estamos en la página correcta
            const currentUrl = this.page.url();
            if (!currentUrl.includes('shazam.com/apps')) {
                console.log('⚠️ No estamos en shazam.com/apps, URL actual:', currentUrl);
            }
            
            // Verificar permisos de micrófono antes de buscar el botón
            console.log('🎤 Verificando permisos de micrófono...');
            try {
                const permissions = await this.page.evaluate(() => {
                    return navigator.permissions.query({ name: 'microphone' }).then(permission => ({
                        state: permission.state,
                        granted: permission.state === 'granted'
                    }));
                });
                console.log('🎤 Estado de permisos de micrófono:', permissions);
            } catch (e) {
                console.log('⚠️ No se pudo verificar permisos de micrófono:', e.message);
            }
            
            // Verificar si hay algún indicador de que el micrófono está activo
            console.log('🎤 Verificando estado del micrófono...');
            try {
                const micStatus = await this.page.evaluate(() => {
                    // Buscar indicadores visuales de micrófono activo
                    const micIndicators = document.querySelectorAll('[class*="mic"], [class*="microphone"], [class*="recording"], [class*="listening"]');
                    return {
                        indicatorsFound: micIndicators.length,
                        indicators: Array.from(micIndicators).map(el => ({
                            className: el.className,
                            textContent: el.textContent,
                            visible: el.offsetParent !== null
                        }))
                    };
                });
                console.log('🎤 Indicadores de micrófono encontrados:', micStatus);
            } catch (e) {
                console.log('⚠️ Error verificando indicadores de micrófono:', e.message);
            }
            
            // Selector ÚNICO del botón flotante de Shazam
            const buttonSelector = '.FloatingShazamButton_buttonContainer__DZGwL';
            
            console.log('🎯 Selector único:', buttonSelector);
            
            // Buscar el botón directamente
            console.log(`🔍 Buscando botón con selector: ${buttonSelector}`);
            
            try {
                await this.page.waitForSelector(buttonSelector, { timeout: 10000 });
                console.log(`✅ Botón encontrado con selector: ${buttonSelector}`);
                
                // Verificar que el botón es clickeable
                const buttonElement = await this.page.$(buttonSelector);
                if (buttonElement) {
                    const isVisible = await buttonElement.isVisible();
                    console.log('🔍 Botón visible:', isVisible);
                    
                    if (!isVisible) {
                        throw new Error('Botón encontrado pero no es visible');
                    }
                } else {
                    throw new Error('Botón no encontrado en el DOM');
                }
            } catch (e) {
                console.log(`❌ Error encontrando botón:`, e.message);
                throw new Error(`No se encontró el botón: ${e.message}`);
            }
            
            // Hacer clic en el botón
            console.log(`🖱️ Haciendo clic en el botón con selector: ${buttonSelector}`);
            
            try {
                // Método 1: Clic normal
            await this.page.click(buttonSelector);
                console.log('✅ Clic normal ejecutado');
            } catch (e) {
                console.log('⚠️ Clic normal falló, intentando método alternativo:', e.message);
                
                // Método 2: Clic con JavaScript
                await this.page.evaluate((selector) => {
                    const button = document.querySelector(selector);
                    if (button) {
                        button.click();
                        console.log('✅ Clic con JavaScript ejecutado');
                    }
                }, buttonSelector);
            }
            
            // Esperar un momento para que se procese el clic
            await this.page.waitForTimeout(1000);
            
            console.log('🎤 ✅ Botón de Shazam activado - Escuchando música...');
            
            // Esperar un momento para que se active el micrófono
            console.log('⏳ Esperando activación del micrófono (2 segundos)...');
            await this.page.waitForTimeout(2000);
            
            // Verificar si el micrófono se activó después del clic
            console.log('🎤 Verificando activación del micrófono después del clic...');
            try {
                const micStatusAfterClick = await this.page.evaluate(() => {
                    // Buscar indicadores REALES de que Shazam está escuchando
                    const shazamListening = document.querySelectorAll('[class*="listening"], [class*="recording"], [class*="active"], [class*="pulse"], [class*="wave"]');
                    const shazamButton = document.querySelector('.FloatingShazamButton_buttonContainer__DZGwL');
                    const shazamButtonActive = shazamButton ? shazamButton.classList.contains('active') || shazamButton.style.transform.includes('scale') : false;
                    
                    // Buscar elementos que cambien cuando Shazam está escuchando
                    const audioElements = document.querySelectorAll('audio, [class*="audio"], [class*="sound"]');
                    const micElements = document.querySelectorAll('[class*="mic"], [class*="microphone"]');
                    
                    return {
                        shazamListening: Array.from(shazamListening).map(el => ({
                            className: el.className,
                            textContent: el.textContent,
                            visible: el.offsetParent !== null,
                            hasActiveClass: el.classList.contains('active'),
                            hasListeningClass: el.className.includes('listening'),
                            hasRecordingClass: el.className.includes('recording')
                        })),
                        shazamButtonActive: shazamButtonActive,
                        audioElements: audioElements.length,
                        micElements: micElements.length,
                        totalIndicators: shazamListening.length
                    };
                });
                console.log('🎤 Estado REAL del micrófono después del clic:', micStatusAfterClick);
                
                if (micStatusAfterClick.shazamButtonActive || micStatusAfterClick.totalIndicators > 0) {
                    console.log('🎤 ✅ Micrófono REALMENTE activado - Shazam está escuchando');
                } else {
                    console.log('⚠️ ⚠️ ADVERTENCIA: Shazam NO está escuchando realmente');
                }
            } catch (e) {
                console.log('⚠️ Error verificando estado del micrófono después del clic:', e.message);
            }
            
            // Verificar si hay algún cambio en la URL o elementos después del clic
            console.log('🔍 Verificando cambios en la página después del clic...');
            try {
                const pageChanges = await this.page.evaluate(() => {
                    const currentUrl = window.location.href;
                    const title = document.title;
                    const bodyClasses = document.body.className;
                    
                    return {
                        url: currentUrl,
                        title: title,
                        bodyClasses: bodyClasses,
                        hasChanges: currentUrl !== 'https://www.shazam.com/apps' || title !== 'Shazam - Music Discovery, Charts & Song Lyrics'
                    };
                });
                console.log('🔍 Cambios en la página después del clic:', pageChanges);
            } catch (e) {
                console.log('⚠️ Error verificando cambios en la página:', e.message);
            }
            
            // Notificar que el botón fue activado
            this.io.emit('shazam-listening', { 
                message: 'Shazam está escuchando música...',
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error encontrando botón de Shazam:', error);
            console.log('🔄 Intentando selectores alternativos...');
            
            // Intentar con selectores alternativos más específicos para /apps
            const alternativeSelectors = [
                '.FloatingShazamButton_shazamButton__WD_TY button',
                '[data-test-id="apps_impression_shazamButton"] button',
                '[data-test-id="apps_userevent_shazamStatus"]',
                'button[class*="shazam"]',
                'button[class*="floating"]',
                '.shazam-button',
                '[data-test-id*="apps"]',
                'button[aria-label*="shazam"]',
                'button[aria-label*="Shazam"]',
                '.FloatingShazamButton',
                '[class*="FloatingShazam"]'
            ];
            
            console.log('🎯 Probando', alternativeSelectors.length, 'selectores alternativos...');
            
            for (let i = 0; i < alternativeSelectors.length; i++) {
                const selector = alternativeSelectors[i];
                try {
                    console.log(`🔍 Probando selector ${i + 1}/${alternativeSelectors.length}: ${selector}`);
                    const element = await this.page.$(selector);
                    if (element) {
                        const isVisible = await element.isVisible();
                        console.log(`✅ Elemento encontrado - Visible: ${isVisible}`);
                        
                        if (isVisible) {
                            console.log(`🖱️ Haciendo clic con selector alternativo: ${selector}`);
                        await element.click();
                            console.log('🎤 ✅ Botón activado con selector alternativo');
                            
                            // Verificar activación del micrófono después del clic alternativo
                            console.log('⏳ Esperando activación del micrófono (2 segundos)...');
                            await this.page.waitForTimeout(2000);
                            
                            try {
                                const micStatus = await this.page.evaluate(() => {
                                    const micIndicators = document.querySelectorAll('[class*="mic"], [class*="microphone"], [class*="recording"], [class*="listening"]');
                                    return {
                                        indicators: Array.from(micIndicators).map(el => ({
                                            className: el.className,
                                            textContent: el.textContent,
                                            visible: el.offsetParent !== null
                                        })),
                                        totalIndicators: micIndicators.length
                                    };
                                });
                                console.log('🎤 Estado del micrófono después del clic alternativo:', micStatus);
                            } catch (e) {
                                console.log('⚠️ Error verificando micrófono después del clic alternativo:', e.message);
                            }
                            
                        return;
                        }
                    } else {
                        console.log(`❌ Elemento no encontrado con selector: ${selector}`);
                    }
                } catch (e) {
                    console.log(`⚠️ Error con selector ${selector}:`, e.message);
                    continue;
                }
            }
            
            // Último intento: buscar cualquier botón que contenga "shazam" en el texto
            console.log('🔄 Último intento: buscando botones por texto...');
            try {
                const buttons = await this.page.$$('button');
                console.log(`🔍 Encontrados ${buttons.length} botones en la página`);
                
                for (let i = 0; i < buttons.length; i++) {
                    const button = buttons[i];
                    const text = await this.page.evaluate(el => el.textContent.toLowerCase(), button);
                    const ariaLabel = await this.page.evaluate(el => el.getAttribute('aria-label')?.toLowerCase() || '', button);
                    
                    if (text.includes('shazam') || ariaLabel.includes('shazam')) {
                        console.log(`🎯 Botón encontrado por texto: "${text}" | aria-label: "${ariaLabel}"`);
                        const isVisible = await button.isVisible();
                        
                        if (isVisible) {
                            console.log('🖱️ Haciendo clic en botón encontrado por texto');
                            await button.click();
                            console.log('🎤 ✅ Botón activado por texto');
                            
                            // Verificar activación del micrófono después del clic por texto
                            console.log('⏳ Esperando activación del micrófono (2 segundos)...');
                            await this.page.waitForTimeout(2000);
                            
                            try {
                                const micStatus = await this.page.evaluate(() => {
                                    const micIndicators = document.querySelectorAll('[class*="mic"], [class*="microphone"], [class*="recording"], [class*="listening"]');
                                    return {
                                        indicators: Array.from(micIndicators).map(el => ({
                                            className: el.className,
                                            textContent: el.textContent,
                                            visible: el.offsetParent !== null
                                        })),
                                        totalIndicators: micIndicators.length
                                    };
                                });
                                console.log('🎤 Estado del micrófono después del clic por texto:', micStatus);
                            } catch (e) {
                                console.log('⚠️ Error verificando micrófono después del clic por texto:', e.message);
                            }
                            
                            return;
                        }
                    }
                }
            } catch (e) {
                console.log('⚠️ Error en búsqueda por texto:', e.message);
            }
            
            // Último recurso: intentar hacer clic en coordenadas conocidas del botón flotante
            console.log('🔄 Último recurso: intentando clic por coordenadas...');
            try {
                // El botón flotante suele estar en la esquina inferior derecha
                const viewport = await this.page.viewport();
                const x = viewport.width - 100; // 100px desde el borde derecho
                const y = viewport.height - 100; // 100px desde el borde inferior
                
                console.log(`🖱️ Intentando clic en coordenadas: x=${x}, y=${y}`);
                await this.page.mouse.click(x, y);
                console.log('🎤 ✅ Clic por coordenadas ejecutado');
                
                // Verificar activación del micrófono después del clic por coordenadas
                console.log('⏳ Esperando activación del micrófono (2 segundos)...');
                await this.page.waitForTimeout(2000);
                
                try {
                    const micStatus = await this.page.evaluate(() => {
                        const micIndicators = document.querySelectorAll('[class*="mic"], [class*="microphone"], [class*="recording"], [class*="listening"]');
                        return {
                            indicators: Array.from(micIndicators).map(el => ({
                                className: el.className,
                                textContent: el.textContent,
                                visible: el.offsetParent !== null
                            })),
                            totalIndicators: micIndicators.length
                        };
                    });
                    console.log('🎤 Estado del micrófono después del clic por coordenadas:', micStatus);
                } catch (e) {
                    console.log('⚠️ Error verificando micrófono después del clic por coordenadas:', e.message);
                }
                
                return;
            } catch (e) {
                console.log('⚠️ Error en clic por coordenadas:', e.message);
            }
            
            throw new Error('No se pudo encontrar el botón de Shazam con ningún método');
        }
    }

    async monitorShazamResults() {
        try {
            console.log('👂 PASO 2: Monitoreando resultados de Shazam...');
            
            const result = await this.waitForRecognitionResult();
            
            if (result.type === 'no_match') {
                console.log('❌ Shazam no identificó la canción');
                this.io.emit('shazam-timeout', {
                    message: 'No se pudo identificar la canción. Asegúrate de que la radio esté sonando.',
                    timestamp: new Date().toISOString()
                });
                throw new Error('No se identificó la canción');
            }

            if (result.type === 'network') {
                console.log('✅ Resultado obtenido de la API de Shazam');
                await this.handleShazamResult({
                    ...result.data,
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Resultado por DOM/URL — extraer de la página
            console.log('📝 Extrayendo información de la página de resultados...');
            const songInfo = await this.extractSongInfoFromPage();
            
            if (songInfo.artist && songInfo.title && 
                songInfo.title !== 'Título Desconocido' && songInfo.artist !== 'Artista Desconocido') {
                console.log('✅ Información extraída exitosamente:', {
                    title: songInfo.title,
                    artist: songInfo.artist
                });
                await this.handleShazamResult(songInfo);
            } else {
                console.log('❌ No se pudo extraer información completa');
                this.io.emit('shazam-error', { 
                    error: 'No se pudo extraer información de la canción',
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('❌ Error monitoreando resultados:', error);
            throw error;
        }
    }

    async waitForRecognitionResult() {
        console.log('🔍 Esperando resultado de reconocimiento (URL, DOM o API)...');
        
        const initialUrl = this.page.url();
        const maxAttempts = 45;
        let attempts = 0;

        while (attempts < maxAttempts && this.isListening) {
            attempts++;
            
            try {
                // 1. Resultado capturado de la red
                if (this.capturedNetworkResult) {
                    return { type: 'network', data: this.capturedNetworkResult };
                }

                const currentUrl = this.page.url();

                // 2. URL de track detectada
                if (currentUrl !== initialUrl && /\/track\/|\/song\//i.test(currentUrl)) {
                    console.log('🎯 URL de track detectada:', currentUrl);
                    await this.page.waitForTimeout(2000);
                    return { type: 'page' };
                }

                // 3. Elementos DOM de resultado
                const domState = await this.page.evaluate(() => {
                    const titleEl = document.querySelector('[class*="TrackPageHeader_title"], [class*="trackTitle"], h1[class*="title"]');
                    const artistEl = document.querySelector('[data-test-id="track_userevent_artistName"], [class*="artistName"], h2[class*="artist"]');
                    const noMatchEl = document.querySelector('[class*="NoMatch"], [class*="noMatch"], [class*="NoResult"]');
                    const bodyText = document.body?.innerText || '';

                    const noMatch = !!noMatchEl
                        || /couldn't find|could not find|no result|try again|sin resultados|no encontr/i.test(bodyText);

                    return {
                        hasTitle: !!(titleEl?.textContent?.trim()),
                        title: titleEl?.textContent?.trim() || '',
                        hasArtist: !!(artistEl?.textContent?.trim()),
                        artist: artistEl?.textContent?.trim() || '',
                        noMatch,
                        listeningVisible: !!document.querySelector('[class*="ListeningScreen"][class*="visible"], [class*="listeningContainer"]')
                    };
                });

                if (domState.noMatch) {
                    console.log('❌ Shazam reportó: sin coincidencia');
                    return { type: 'no_match' };
                }

                if (domState.hasTitle && domState.hasArtist) {
                    console.log('🎯 Resultado detectado en DOM:', domState.title, '-', domState.artist);
                    return { type: 'page' };
                }

                // 4. Cualquier cambio de URL (SPA parcial)
                if (currentUrl !== initialUrl && !currentUrl.includes('/apps')) {
                    console.log('🎯 Cambio de URL detectado:', currentUrl);
                    await this.page.waitForTimeout(2000);
                    return { type: 'page' };
                }

                if (attempts % 5 === 0) {
                    console.log(`⏳ Intento ${attempts}/${maxAttempts} — escuchando... URL: ${currentUrl}`);
                }

            } catch (e) {
                console.log(`⚠️ Error verificando resultado (intento ${attempts}):`, e.message);
            }

            await this.page.waitForTimeout(1000);
        }

        console.log('⏰ Timeout — no se detectó resultado');
        this.io.emit('shazam-timeout', {
            message: 'Tiempo agotado. Reproduce la radio cerca del micrófono e intenta de nuevo.',
            timestamp: new Date().toISOString()
        });
        throw new Error('No se detectó resultado de reconocimiento');
    }

    async waitForFirstRedirect() {
        // Mantener compatibilidad — delegar al nuevo método unificado
        const result = await this.waitForRecognitionResult();
        if (result.type === 'no_match') {
            throw new Error('No se identificó la canción');
        }
    }

    async waitForSecondRedirect() {
        // Ya no necesario — el método unificado cubre ambos pasos
        console.log('✅ Redirección/resultado ya detectado');
    }

    async waitForTrackPageLoad() {
        try {
            console.log('🔍 PASO 2.3: Esperando carga completa de elementos de la página de resultados...');
            
            // Esperar a que aparezcan los elementos principales de la página de resultados
            const selectorsToWait = [
                '.TrackPageHeader_title__wGI_Q', // Título
                '[data-test-id="track_userevent_artistName"]', // Artista
                '.ImageDynamic-post-module_image__yGTB1' // Imagen
            ];
            
            console.log('🎯 Selectores a esperar:', selectorsToWait);
            
            for (let i = 0; i < selectorsToWait.length; i++) {
                const selector = selectorsToWait[i];
                try {
                    console.log(`⏳ Esperando elemento ${i + 1}/${selectorsToWait.length}: ${selector}`);
                    await this.page.waitForSelector(selector, { timeout: 15000 }); // Más tiempo para segunda redirección
                    console.log(`✅ Elemento encontrado: ${selector}`);
                    
                    // Verificar que el elemento tiene contenido
                    const element = await this.page.$(selector);
                    if (element) {
                        const text = await this.page.evaluate(el => el.textContent?.trim() || '', element);
                        const hasContent = text.length > 0;
                        console.log(`   - Contenido: "${text}" (${hasContent ? '✅' : '❌'})`);
                    }
                    
                } catch (e) {
                    console.log(`⚠️ Elemento no encontrado: ${selector} - ${e.message}`);
                }
            }
            
            // Esperar un poco más para asegurar que todo esté cargado
            console.log('⏳ Esperando 3 segundos adicionales para carga completa...');
            await this.page.waitForTimeout(3000);
            
            // Verificar estado final de la página
            const finalUrl = this.page.url();
            console.log('📍 URL final:', finalUrl);
            
            // Verificar que tenemos los elementos principales
            const titleElement = await this.page.$('.TrackPageHeader_title__wGI_Q');
            const artistElement = await this.page.$('[data-test-id="track_userevent_artistName"]');
            const imageElement = await this.page.$('.ImageDynamic-post-module_image__yGTB1');
            
            console.log('🔍 Estado final de elementos:');
            console.log('   - Título:', !!titleElement);
            console.log('   - Artista:', !!artistElement);
            console.log('   - Imagen:', !!imageElement);
            
            console.log('✅ ✅ Página de resultados cargada completamente');
            
        } catch (error) {
            console.error('❌ Error esperando carga de página:', error);
            throw error;
        }
    }

    async extractSongInfoFromPage() {
        try {
            console.log('📝 PASO 2.3: Extrayendo información de la página de resultados...');
            
            // Extraer toda la información en una sola evaluación para mayor eficiencia
            const songData = await this.page.evaluate(() => {
                console.log('🔍 Iniciando extracción de datos en el navegador...');
                
                const data = {
                    title: '',
                    artist: '',
                    imageUrl: '',
                    genre: '',
                    shazamCount: '',
                    album: '',
                    year: ''
                };
                
                // Extraer título de la canción
                console.log('🎯 Buscando título...');
                const titleElement = document.querySelector('.TrackPageHeader_title__wGI_Q');
                if (titleElement) {
                    data.title = titleElement.textContent.trim();
                    console.log('✅ Título encontrado:', data.title);
                } else {
                    console.log('❌ Título no encontrado con selector principal');
                }
                
                // Extraer nombre del artista
                console.log('🎯 Buscando artista...');
                const artistElement = document.querySelector('[data-test-id="track_userevent_artistName"] span');
                if (artistElement) {
                    data.artist = artistElement.textContent.trim();
                    console.log('✅ Artista encontrado:', data.artist);
                } else {
                    console.log('❌ Artista no encontrado con selector principal');
                }
                
                // Extraer imagen del álbum con múltiples selectores de respaldo
                console.log('🎯 Buscando imagen...');
                const imageSelectors = [
                    '.ImageDynamic-post-module_image__yGTB1',
                    '.TrackPageHeader_img___KaXn img',
                    '.TrackPageHeader_thumbnailPlayButtonStack__LENR4 img'
                ];
                
                for (let i = 0; i < imageSelectors.length; i++) {
                    const selector = imageSelectors[i];
                    console.log(`🔍 Probando selector de imagen ${i + 1}/${imageSelectors.length}: ${selector}`);
                    const imageElement = document.querySelector(selector);
                    if (imageElement) {
                        console.log('✅ Imagen encontrada con selector:', selector);
                        // Intentar obtener la imagen de mayor resolución
                        const srcset = imageElement.getAttribute('srcset');
                        if (srcset) {
                            console.log('📸 Srcset encontrado, extrayendo URL de mayor resolución...');
                            // Extraer la URL de mayor resolución del srcset
                            const urls = srcset.split(',').map(url => url.trim().split(' ')[0]);
                            data.imageUrl = urls[urls.length - 1] || imageElement.src;
                            console.log('✅ URL de imagen extraída:', data.imageUrl);
                        } else {
                            data.imageUrl = imageElement.src;
                            console.log('✅ URL de imagen directa:', data.imageUrl);
                        }
                        break;
                    } else {
                        console.log(`❌ Imagen no encontrada con selector: ${selector}`);
                    }
                }
                
                // Extraer género si está disponible
                console.log('🎯 Buscando género...');
                const genreElement = document.querySelector('.TrackPageHeader_genreNoUrl__u_v2b');
                if (genreElement) {
                    data.genre = genreElement.textContent.trim();
                    console.log('✅ Género encontrado:', data.genre);
                } else {
                    console.log('❌ Género no encontrado');
                }
                
                // Extraer número de identificaciones Shazam
                console.log('🎯 Buscando contador de Shazam...');
                const countElement = document.querySelector('[data-test-id="trackHeader_count"]');
                if (countElement) {
                    data.shazamCount = countElement.textContent.trim();
                    console.log('✅ Contador encontrado:', data.shazamCount);
                } else {
                    console.log('❌ Contador no encontrado');
                }
                
                // Intentar extraer información adicional del álbum
                console.log('🎯 Buscando información del álbum...');
                const albumElement = document.querySelector('.TrackPageHeader_albumName__xyz');
                if (albumElement) {
                    data.album = albumElement.textContent.trim();
                    console.log('✅ Álbum encontrado:', data.album);
                } else {
                    console.log('❌ Álbum no encontrado');
                }
                
                // Intentar extraer año
                console.log('🎯 Buscando año...');
                const yearElement = document.querySelector('.TrackPageHeader_year__abc');
                if (yearElement) {
                    data.year = yearElement.textContent.trim();
                    console.log('✅ Año encontrado:', data.year);
                } else {
                    console.log('❌ Año no encontrado');
                }
                
                console.log('📊 Datos extraídos:', data);
                return data;
            });
            
            console.log('🎵 ✅ Información extraída del navegador:', {
                title: songData.title,
                artist: songData.artist,
                hasImage: !!songData.imageUrl,
                genre: songData.genre,
                shazamCount: songData.shazamCount,
                album: songData.album,
                year: songData.year
            });
            
            // Validar que tenemos al menos título y artista
            if (!songData.title || !songData.artist) {
                console.log('⚠️ ⚠️ Información incompleta, intentando selectores alternativos...');
                console.log('   - Título:', songData.title || 'VACÍO');
                console.log('   - Artista:', songData.artist || 'VACÍO');
                
                // Intentar con selectores alternativos más genéricos
                const fallbackData = await this.page.evaluate(() => {
                    console.log('🔄 Iniciando búsqueda con selectores alternativos...');
                    const data = { title: '', artist: '' };
                    
                    // Buscar cualquier elemento que contenga el título
                    const titleSelectors = [
                        'h1[class*="title"]',
                        'h1[class*="Title"]',
                        '.title',
                        '.song-title',
                        'h1',
                        '[class*="title"]'
                    ];
                    
                    console.log('🔍 Buscando título con selectores alternativos...');
                    for (let i = 0; i < titleSelectors.length; i++) {
                        const selector = titleSelectors[i];
                        console.log(`   Probando ${i + 1}/${titleSelectors.length}: ${selector}`);
                        const element = document.querySelector(selector);
                        if (element && element.textContent.trim()) {
                            data.title = element.textContent.trim();
                            console.log('✅ Título encontrado con selector alternativo:', data.title);
                            break;
                        }
                    }
                    
                    // Buscar cualquier elemento que contenga el artista
                    const artistSelectors = [
                        'h2[class*="artist"]',
                        'h2[class*="Artist"]',
                        '.artist',
                        '.artist-name',
                        'h2',
                        '[class*="artist"]'
                    ];
                    
                    console.log('🔍 Buscando artista con selectores alternativos...');
                    for (let i = 0; i < artistSelectors.length; i++) {
                        const selector = artistSelectors[i];
                        console.log(`   Probando ${i + 1}/${artistSelectors.length}: ${selector}`);
                        const element = document.querySelector(selector);
                        if (element && element.textContent.trim()) {
                            data.artist = element.textContent.trim();
                            console.log('✅ Artista encontrado con selector alternativo:', data.artist);
                            break;
                        }
                    }
                    
                    console.log('📊 Datos de respaldo:', data);
                    return data;
                });
                
                console.log('🔄 Datos de respaldo obtenidos:', fallbackData);
                
                // Usar datos de respaldo si están disponibles
                if (fallbackData.title) {
                    songData.title = fallbackData.title;
                    console.log('✅ Título actualizado con datos de respaldo');
                }
                if (fallbackData.artist) {
                    songData.artist = fallbackData.artist;
                    console.log('✅ Artista actualizado con datos de respaldo');
                }
            }
            
            const finalData = {
                title: songData.title || 'Título Desconocido',
                artist: songData.artist || 'Artista Desconocido',
                imageUrl: songData.imageUrl || '',
                genre: songData.genre || '',
                shazamCount: songData.shazamCount || '',
                album: songData.album || '',
                year: songData.year || '',
                timestamp: new Date().toISOString()
            };
            
            console.log('📊 ✅ Datos finales extraídos:', finalData);
            return finalData;
            
        } catch (error) {
            console.error('❌ ❌ Error extrayendo información de la página:', error);
            return {
                title: 'Título Desconocido',
                artist: 'Artista Desconocido',
                imageUrl: '',
                genre: '',
                shazamCount: '',
                album: '',
                year: '',
                timestamp: new Date().toISOString()
            };
        }
    }

    async extractSongInfo(element) {
        try {
            // Obtener todo el texto del elemento y elementos hijos
            const fullText = await this.page.evaluate(el => {
                return el.innerText || el.textContent || '';
            }, element);
            
            console.log('📝 Texto extraído:', fullText);
            
            // Patrones comunes para extraer artista y título
            const patterns = [
                // Patrón: "Título - Artista"
                /^(.+?)\s*-\s*(.+)$/,
                // Patrón: "Artista - Título"
                /^(.+?)\s*-\s*(.+)$/,
                // Patrón con "by"
                /^(.+?)\s+by\s+(.+)$/i,
                // Patrón con "de"
                /^(.+?)\s+de\s+(.+)$/i
            ];
            
            let artist = '';
            let title = '';
            
            // Intentar extraer con patrones
            for (const pattern of patterns) {
                const match = fullText.match(pattern);
                if (match) {
                    title = match[1].trim();
                    artist = match[2].trim();
                    break;
                }
            }
            
            // Si no se encontró patrón, usar heurística simple
            if (!artist || !title) {
                const lines = fullText.split('\n').filter(line => line.trim());
                if (lines.length >= 2) {
                    title = lines[0].trim();
                    artist = lines[1].trim();
                } else if (lines.length === 1) {
                    // Asumir que es el título
                    title = lines[0].trim();
                    artist = 'Artista Desconocido';
                }
            }
            
            return {
                title: title || 'Título Desconocido',
                artist: artist || 'Artista Desconocido',
                fullText: fullText
            };
            
        } catch (error) {
            console.error('❌ Error extrayendo información de la canción:', error);
            return {
                title: 'Título Desconocido',
                artist: 'Artista Desconocido',
                fullText: ''
            };
        }
    }

    async handleShazamResult(songInfo) {
        try {
            console.log('🎉 Resultado de Shazam obtenido:', songInfo);
            
            // Detener el reconocimiento
            this.isListening = false;
            
            // Enviar resultado completo a través de Socket.IO
            this.io.emit('shazam-result', {
                success: true,
                data: {
                    artist: songInfo.artist,
                    title: songInfo.title,
                    imageUrl: songInfo.imageUrl,
                    genre: songInfo.genre,
                    shazamCount: songInfo.shazamCount,
                    album: songInfo.album,
                    year: songInfo.year,
                    timestamp: songInfo.timestamp || new Date().toISOString()
                }
            });
            
            // También enviar a través de callback si existe
            if (this.resultCallback) {
                this.resultCallback(songInfo);
            }
            
        } catch (error) {
            console.error('❌ Error manejando resultado de Shazam:', error);
            throw error;
        }
    }

    async stopShazamRecognition() {
        try {
            console.log('🛑 Deteniendo reconocimiento de Shazam...');
            
            this.isListening = false;
            
            // Cerrar pestaña de Shazam si está abierta
            if (this.page && !this.page.isClosed()) {
                try {
                    await this.page.close();
                } catch (error) {
                    console.log('⚠️ Error cerrando página (puede estar ya cerrada):', error.message);
                }
                this.page = null;
            }
            
            this.io.emit('shazam-stopped', { 
                message: 'Reconocimiento de Shazam detenido',
                timestamp: new Date().toISOString()
            });
            
            console.log('✅ Reconocimiento de Shazam detenido');
            
        } catch (error) {
            console.error('❌ Error deteniendo Shazam:', error);
            this.io.emit('shazam-error', { error: error.message });
            throw error;
        }
    }

    async cleanup() {
        try {
            console.log('🧹 Limpiando recursos...');
            
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            
            if (this.server) {
                this.server.close();
                this.server = null;
            }
            
            console.log('✅ Limpieza completada');
            
        } catch (error) {
            console.error('❌ Error en limpieza:', error);
        }
    }
}

// Función para iniciar el servicio
async function startShazamService() {
    const shazamService = new ShazamAutomation();
    
    try {
        await shazamService.initialize();
        
        // Manejar cierre graceful
        process.on('SIGINT', async () => {
            console.log('\n🛑 Cerrando servicio de Shazam...');
            await shazamService.cleanup();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('\n🛑 Cerrando servicio de Shazam...');
            await shazamService.cleanup();
            process.exit(0);
        });
        
        return shazamService;
        
    } catch (error) {
        console.error('❌ Error iniciando servicio de Shazam:', error);
        process.exit(1);
    }
}

// Exportar para uso en otros módulos
module.exports = { ShazamAutomation, startShazamService };

// Si se ejecuta directamente
if (require.main === module) {
    startShazamService();
}
