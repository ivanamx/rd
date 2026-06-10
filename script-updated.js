// Script principal actualizado con integración de Shazam automatizado

const TAP_MOVE_THRESHOLD = 10;
const mobileNavTouch = { moved: false, resetTimer: null };

function markMobileNavTouchMoved() {
    mobileNavTouch.moved = true;
    clearTimeout(mobileNavTouch.resetTimer);
    mobileNavTouch.resetTimer = setTimeout(() => {
        mobileNavTouch.moved = false;
    }, 350);
}

function bindTap(element, handler) {
    if (!element) return;

    let lastTouch = 0;
    let startX = 0;
    let startY = 0;
    let moved = false;

    element.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            moved = true;
            return;
        }
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
        moved = false;
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (moved || e.touches.length > 1) return;
        const touch = e.touches[0];
        if (
            Math.abs(touch.clientX - startX) > TAP_MOVE_THRESHOLD ||
            Math.abs(touch.clientY - startY) > TAP_MOVE_THRESHOLD
        ) {
            moved = true;
        }
    }, { passive: true });

    element.addEventListener('touchcancel', () => {
        moved = true;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        if (moved || (element.closest('.mobile-nav-scroll') && mobileNavTouch.moved)) return;
        lastTouch = Date.now();
        handler(e);
    });

    element.addEventListener('click', (e) => {
        if (Date.now() - lastTouch < 500) return;
        handler(e);
    });
}

class SaltilloApp {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
        this.isShazamListening = false;
        this.shazamSocket = null;
        this.shazamModal = null;
        this.shazamTimer = null;
        this.timeRemaining = 40;
        this._shazamAbort = null;
        this._shazamConnecting = false;
        this._shazamServiceReady = false;
        this._playerAudioCtx = null;
        this._playerSource = null;
        this.SHAZAM_CAPTURE_SEC = 6;
        this.bandasModal = null;
        this.registroBandaModal = null;
        this.registroBarModal = null;
        this.registroPickerModal = null;
        this.bandasAudio = null;
        this.bandasState = {
            bandas: [],
            selectedBanda: null,
            selectedDate: null,
            currentStep: 1,
            calendarMonth: new Date(),
            searchQuery: '',
            genreFilter: ''
        };
        this.estudioModal = null;
        this.estudioState = {
            estudios: [],
            selectedEstudio: null,
            selectedDate: null,
            selectedHora: null,
            currentStep: 1,
            calendarMonth: new Date(),
            searchQuery: '',
            tipoFilter: ''
        };
        this.clasesModal = null;
        this.clasesState = {
            maestros: [],
            selectedMaestro: null,
            selectedPlan: null,
            currentStep: 1,
            searchQuery: '',
            instrumentoFilter: ''
        };
        this.mapaModal = null;
        this.mapaFloatMap = null;
        this.mapaState = {
            map: null,
            bandas: [],
            bares: [],
            bandaMarkers: [],
            barMarkers: [],
            connectionLines: [],
            selected: null,
            filters: { bandas: true, bares: true },
            layers: { bandas: null, bares: null, lines: null }
        };
        this.topTenModal = null;
        this.guiaState = { role: 'banda', step: 1 };
        this.guiaContent = null;
        this.nowPlaying = null;
        this._nowPlayingFetch = false;
        this.bandSession = null;
        this.radioQueue = [];
        this._radioMode = 'stream';
        this._currentQueueTrack = null;
        
        // Configuración de audio
        this.streamUrl = 'song.mp3';
        this.fallbackStreams = [
            'https://streaming.radio.unam.mx:8000/stream',
            'https://icecast.teveo.cu/radio'
        ];
        
        this.init();
    }

    t(key, vars) {
        return window.I18n?.t(key, vars) ?? key;
    }

    formatDate(dateStr) {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString(
            window.I18n?.getLocale() || 'es-MX',
            { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        );
    }

    onLanguageChange() {
        this.guiaContent = window.I18n.getGuiaContent();
        this.updateGuiaStepsUI();
        this.renderGuiaPreview(false);
        this.updateGuiaCTAs();
        this.syncShazamUI();
        this.updateNowPlayingUI();
        this.updateLoginUI();
        this.renderProducerQueueUI();
        this.refreshOpenModals();
        if (this.producerProfilePanel?.classList.contains('open')) {
            this.renderProducerProfile();
        }
    }

    refreshOpenModals() {
        if (this.shazamModal) this.updateShazamModalLabels();
        if (this.bandasModal) this.updateBandasModalLabels();
        if (this.registroPickerModal) this.updateRegistroPickerModalLabels();
        if (this.registroBandaModal) this.updateRegistroBandaModalLabels();
        if (this.registroBarModal) this.updateRegistroBarModalLabels();
        if (this.estudioModal) this.updateEstudioModalLabels();
        if (this.clasesModal) this.updateClasesModalLabels();
        if (this.mapaModal) this.updateMapaModalLabels();
        if (this.topTenModal) this.updateTopTenModalLabels();
    }

    async init() {
        console.log('🚀 Iniciando Radio Saltillo...');

        window.I18n?.init();
        this.guiaContent = window.I18n.getGuiaContent();
        window.addEventListener('languagechange', () => this.onLanguageChange());
        if (typeof window.seedMockBands === 'function') window.seedMockBands();
        if (typeof window.seedMockProducers === 'function') window.seedMockProducers();
        this.initLogin();
        this.initProducerPanel();
        
        // Verificar soporte de APIs
        this.checkAPISupport();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Inicializar audio
        this.initAudio();
        
        // Conectar Shazam en segundo plano — no bloquear la UI en móvil
        this.connectToShazamService().catch(() => {});

        this.syncShazamUI();

        this.updateNowPlayingUI();

        // Verificar resultado de pago Stripe
        this.checkPaymentResult();
        this.checkBandaDeepLink();
        this.checkProducerDeepLink();
        this.initMapaFloatPreview();
        
        console.log('✅ Radio Saltillo inicializada');
    }

    async checkBandaDeepLink() {
        const params = new URLSearchParams(window.location.search);
        const bandaId = params.get('banda');
        if (!bandaId) return;

        await this.openBandasModal(bandaId);
        if (params.get('reservar') === '1') {
            setTimeout(() => this.bandasGoToStep(3), 150);
        }
        window.history.replaceState({}, '', window.location.pathname);
    }

    checkProducerDeepLink() {
        if (!this.isProducerSession()) return;
        if (window.location.hash !== '#radio') return;
        this.openProducerProfile();
        window.history.replaceState({}, '', window.location.pathname);
    }

    checkAPISupport() {
        const support = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            audioContext: !!(window.AudioContext || window.webkitAudioContext),
            mediaRecorder: !!(window.MediaRecorder)
        };
        
        console.log('🎵 Soporte de APIs de audio:', support);
        
        if (!support.getUserMedia) {
            console.warn('⚠️ getUserMedia no soportado - Shazam no funcionará');
        }
        if (!support.audioContext) {
            console.warn('⚠️ AudioContext no soportado - Análisis de audio limitado');
        }
        if (!support.mediaRecorder) {
            console.warn('⚠️ MediaRecorder no soportado - Grabación limitada');
        }
    }

    setupEventListeners() {
        // Controles de audio
        document.querySelectorAll('.play-btn, .play-btn-small').forEach(btn => {
            bindTap(btn, () => this.togglePlay());
        });
        
        document.querySelectorAll('.stop-btn, .stop-btn-small').forEach(btn => {
            bindTap(btn, () => this.stopAudio());
        });
        
        // Navegación
        document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
            bindTap(item, (e) => this.handleNavigation(e));
        });
        
        // Elementos interactivos del hero
        document.querySelectorAll('.interactive-element').forEach(element => {
            bindTap(element, (e) => this.handleHeroInteraction(e));
            element.addEventListener('mouseenter', () => this.activateElement(element));
            element.addEventListener('mouseleave', () => this.deactivateElement(element));
        });
        
        // Botón de Shazam — activo solo con la radio en reproducción
        bindTap(document.getElementById('shazamBtn'), () => this.startShazam());

        // Radio showcase
        bindTap(document.getElementById('radioLivePlayBtn'), () => this.togglePlay());
        bindTap(document.getElementById('radioLiveStopBtn'), () => this.stopAudio());
        document.querySelectorAll('[data-radio-action]').forEach(card => {
            bindTap(card, () => this.handleRadioCardAction(card.dataset.radioAction, card.dataset.bandaId));
        });
        
        // Cards de productos
        document.querySelectorAll('.product-card-experimental').forEach(card => {
            card.addEventListener('mouseenter', () => this.activateProductCard(card));
            card.addEventListener('mouseleave', () => this.deactivateProductCard(card));
            card.addEventListener('click', () => this.openProductModal(card));
        });
        
        // Guía interactiva de la plataforma
        this.initGuiaPlatform();
        document.querySelectorAll('.conecta-card').forEach(card => {
            bindTap(card, () => this.handleConectaAction(card.dataset.conectaAction));
        });

        bindTap(document.getElementById('verMapaBtn'), () => this.handleVerMapa());

        bindTap(document.getElementById('registerBtn'), () => this.openRegistroPickerModal());
        bindTap(document.getElementById('registerBtnMobile'), () => this.openRegistroPickerModal());
        this.setupLoginListeners();
        
        // Redes sociales
        document.querySelectorAll('.social-item').forEach(item => {
            item.addEventListener('click', () => this.handleSocialClick(item));
        });
        
        // Cursor personalizado
        this.setupCustomCursor();
        
        // Partículas de fondo
        this.initParticles();
        
        // Animaciones de entrada
        this.initAnimations();
    }

    getShazamServiceUrl() {
        const { hostname, origin } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3002';
        }
        // En producción nginx hace proxy de /socket.io/ → puerto 3002
        return origin;
    }

    async connectToShazamService() {
        if (this.shazamSocket?.connected) {
            this._shazamServiceReady = true;
            return;
        }
        if (this._shazamConnecting) return;

        try {
            if (typeof io === 'undefined') {
                console.warn('⚠️ Socket.IO no está disponible globalmente');
                return;
            }

            this._shazamConnecting = true;
            const shazamUrl = this.getShazamServiceUrl();
            console.log('🔌 Conectando servicio Shazam en:', shazamUrl);

            if (this.shazamSocket) {
                this.shazamSocket.disconnect();
                this.shazamSocket = null;
            }

            this.shazamSocket = io(shazamUrl, {
                path: '/socket.io/',
                timeout: 5000,
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                maxReconnectionAttempts: 5
            });
            
            this.shazamSocket.on('connect', () => {
                console.log('🔌 Conectado al servicio de Shazam');
                this._shazamServiceReady = true;
            });
            
            this.shazamSocket.on('shazam-started', (data) => {
                console.log('🎵 Shazam iniciado:', data);
                this.updateShazamButton(true);
                this.showShazamStatus(this.t('shazam.listening'), 'starting');
            });
            
            this.shazamSocket.on('shazam-listening', (data) => {
                console.log('👂 Shazam escuchando:', data);
                this.showShazamStatus(this.t('shazam.analyzingShort'), 'listening');
            });
            
            this.shazamSocket.on('shazam-processing', (data) => {
                console.log('⚙️ Shazam procesando:', data);
                this.showShazamStatus(this.t('shazam.sending'), 'processing');
            });
            
            this.shazamSocket.on('shazam-extracting', (data) => {
                console.log('📝 Shazam extrayendo:', data);
                this.showShazamStatus(this.t('shazam.gettingResults'), 'processing');
            });
            
            this.shazamSocket.on('shazam-result', (data) => {
                console.log('🎉 Resultado de Shazam:', data);
                this.handleShazamResult(data.data);
            });
            
            this.shazamSocket.on('shazam-timeout', (data) => {
                console.log('⏰ Timeout de Shazam:', data?.message || data);
                this.finishShazamSession('timeout', data?.message || this.t('shazam.noMusic'));
            });
            
            this.shazamSocket.on('shazam-stopped', () => {
                console.log('🛑 Shazam detenido');
                if (this.isShazamListening) {
                    this.finishShazamSession('stopped');
                }
            });
            
            this.shazamSocket.on('shazam-error', (data) => {
                console.error('❌ Error de Shazam:', data?.error || data);
                this.finishShazamSession('error', data?.error || this.t('shazam.recognitionError'));
            });
            
            this.shazamSocket.on('disconnect', () => {
                console.log('🔌 Desconectado del servicio de Shazam');
                this._shazamServiceReady = false;
                if (this.isShazamListening) {
                    this.updateShazamButton(false);
                }
            });
            
            this.shazamSocket.on('connect_error', (error) => {
                console.error('❌ Error de conexión con Shazam:', error);
            });
            
            this.shazamSocket.on('reconnect', (attemptNumber) => {
                console.log(`🔄 Reconectado al servicio de Shazam (intento ${attemptNumber})`);
                this.showNotification(this.t('notifications.shazamReconnected'), 'success');
            });
            
            this.shazamSocket.on('reconnect_error', (error) => {
                console.error('❌ Error de reconexión con Shazam:', error);
            });
            
            this.shazamSocket.on('reconnect_failed', () => {
                console.error('❌ Falló la reconexión con Shazam');
                this.showNotification(this.t('notifications.shazamReconnectFailed'), 'error');
            });
            
        } catch (error) {
            console.error('❌ Error conectando al servicio de Shazam:', error);
            this._shazamServiceReady = false;
            this.showNotification(this.t('notifications.shazamUnavailable'), 'warning');
        } finally {
            this._shazamConnecting = false;
        }
    }

    getApiBaseUrl() {
        const { hostname, origin } = window.location;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001';
        }
        return origin;
    }

    toggleShazam() {
        return this.startShazam();
    }

    async startShazam() {
        if (!this.isPlaying) {
            this.showNotification(this.t('notifications.shazamRequiresPlay'), 'info');
            return;
        }

        if (this.isShazamListening) {
            this.stopShazam();
            return;
        }

        if (this.nowPlaying) {
            this.showNotification(this.t('notifications.shazamAlreadyIdentified'), 'info');
            return;
        }

        this._shazamAbort = new AbortController();
        this.isShazamListening = true;
        this.updateShazamButton(true);
        this.showShazamModal();
        this.startTimer();
        this.showShazamStatus(this.t('shazam.capturing'), 'starting');

        try {
            const audioBlob = await this.captureAudioForRecognition(this.SHAZAM_CAPTURE_SEC);
            if (this._shazamAbort.signal.aborted) return;

            console.log('🎵 Audio capturado:', `${Math.round(audioBlob.size / 1024)}KB`);

            this.showShazamStatus(this.t('shazam.analyzingShort'), 'processing');
            const apiResult = await this.recognizeViaAPI(audioBlob);
            if (this._shazamAbort.signal.aborted) return;

            if (apiResult?.title && apiResult?.artist) {
                console.log('✅ Identificado vía API rápida:', apiResult);
                this.handleShazamResult(apiResult);
                return;
            }

            console.log('⚠️ API rápida sin resultado, usando Shazam automatizado...');

            if (!this.shazamSocket?.connected) {
                await this.connectToShazamService();
            }
            if (!this.shazamSocket?.connected) {
                throw new Error('Servicio de Shazam no disponible');
            }

            this.showShazamStatus(this.t('shazam.analyzing'), 'processing');
            const audioBase64 = await this.blobToBase64(audioBlob);
            if (this._shazamAbort.signal.aborted) return;

            this.shazamSocket.emit('start-shazam', { audio: audioBase64 });
        } catch (error) {
            if (this._shazamAbort?.signal.aborted) return;
            console.error('Error iniciando Shazam:', error);
            this.showNotification(this.t('notifications.shazamStartError'), 'error');
            this.stopShazam();
        }
    }

    async captureAudioForRecognition(durationSec = 5) {
        try {
            this.showShazamStatus(this.t('shazam.capturingRadio'), 'listening');
            return await this.capturePlayerAudio(durationSec);
        } catch (playerError) {
            console.warn('⚠️ Captura del reproductor falló, usando micrófono:', playerError.message);
            this.showShazamStatus(this.t('shazam.listeningRadio'), 'listening');
            const base64 = await this.captureMicAudio(durationSec);
            return this.base64ToBlob(base64);
        }
    }

    async capturePlayerAudio(durationSec = 5) {
        if (!this.audio || !this.isPlaying) {
            throw new Error('Radio no está reproduciéndose');
        }

        const audioContext = this._playerAudioCtx
            || new (window.AudioContext || window.webkitAudioContext)();
        this._playerAudioCtx = audioContext;
        await audioContext.resume();

        if (!this._playerSource) {
            this._playerSource = audioContext.createMediaElementSource(this.audio);
            this._playerSource.connect(audioContext.destination);
        }

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const chunks = [];
        const signal = this._shazamAbort?.signal;

        this._playerSource.connect(processor);
        processor.connect(audioContext.destination);

        return new Promise((resolve, reject) => {
            const onAbort = () => {
                processor.disconnect();
                reject(new Error('Captura cancelada'));
            };
            signal?.addEventListener('abort', onAbort, { once: true });

            processor.onaudioprocess = (e) => {
                if (signal?.aborted) return;
                chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
            };

            setTimeout(() => {
                processor.disconnect();
                signal?.removeEventListener('abort', onAbort);

                if (signal?.aborted) {
                    reject(new Error('Captura cancelada'));
                    return;
                }
                if (chunks.length === 0) {
                    reject(new Error('No se capturó audio del reproductor'));
                    return;
                }

                const samples = this.mergeFloat32Chunks(chunks);
                resolve(this.samplesToWavBlob(samples, audioContext.sampleRate));
            }, durationSec * 1000);
        });
    }

    async captureMicAudio(durationSec = 5) {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: true
            }
        });

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        const chunks = [];
        const signal = this._shazamAbort?.signal;

        source.connect(processor);
        processor.connect(audioContext.destination);

        return new Promise((resolve, reject) => {
            const onAbort = () => {
                processor.disconnect();
                source.disconnect();
                stream.getTracks().forEach(t => t.stop());
                audioContext.close().catch(() => {});
                reject(new Error('Captura cancelada'));
            };
            signal?.addEventListener('abort', onAbort, { once: true });

            processor.onaudioprocess = (e) => {
                if (signal?.aborted) return;
                chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
            };

            setTimeout(() => {
                processor.disconnect();
                source.disconnect();
                stream.getTracks().forEach(t => t.stop());
                audioContext.close().catch(() => {});
                signal?.removeEventListener('abort', onAbort);

                if (signal?.aborted) {
                    reject(new Error('Captura cancelada'));
                    return;
                }
                if (chunks.length === 0) {
                    reject(new Error('No se capturó audio'));
                    return;
                }

                const samples = this.mergeFloat32Chunks(chunks);
                resolve(this.arrayBufferToBase64(this.encodeWav(samples, audioContext.sampleRate)));
            }, durationSec * 1000);
        });
    }

    mergeFloat32Chunks(chunks) {
        const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
        const samples = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            samples.set(chunk, offset);
            offset += chunk.length;
        }
        return samples;
    }

    samplesToWavBlob(samples, sampleRate) {
        return new Blob([this.encodeWav(samples, sampleRate)], { type: 'audio/wav' });
    }

    base64ToBlob(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: 'audio/wav' });
    }

    async blobToBase64(blob) {
        const buffer = await blob.arrayBuffer();
        return this.arrayBufferToBase64(buffer);
    }

    normalizeRecognitionResult(raw, source = 'API') {
        const track = raw.result || raw;
        const spotifyAlbum = track.spotify?.album || raw.spotify?.album;
        return {
            title: track.title || track.song || raw.title || raw.song || '',
            artist: track.artist || raw.artist || '',
            album: track.album || raw.album || '',
            genre: track.genre || raw.genre || '',
            year: track.year || track.release_date || raw.release_date || '',
            imageUrl: track.imageUrl || raw.imageUrl || spotifyAlbum?.images?.[0]?.url || '',
            shazamCount: track.shazamCount || raw.shazamCount || '',
            api: track.api || raw.api || source
        };
    }

    async recognizeViaAPI(audioBlob) {
        const fromUpload = await this.recognizeViaAPIUpload(audioBlob);
        if (fromUpload) return fromUpload;
        return this.recognizeViaAPIUrl();
    }

    async recognizeViaAPIUpload(audioBlob) {
        if (!audioBlob || audioBlob.size < 1000) return null;

        const formData = new FormData();
        formData.append('audio', audioBlob, 'capture.wav');

        try {
            const response = await fetch(`${this.getApiBaseUrl()}/api/recognize`, {
                method: 'POST',
                body: formData,
                signal: this._shazamAbort?.signal
            });

            if (!response.ok) {
                console.warn('⚠️ /api/recognize HTTP', response.status);
                return null;
            }

            const data = await response.json();
            if (!data.success || !data.result) return null;

            const normalized = this.normalizeRecognitionResult(data.result);
            if (!normalized.title || !normalized.artist) return null;

            return normalized;
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.warn('⚠️ /api/recognize no disponible:', error.message);
            return null;
        }
    }

    async recognizeViaAPIUrl() {
        try {
            const streamUrl = new URL(this.streamUrl, window.location.href).href;
            const response = await fetch(`${this.getApiBaseUrl()}/api/recognize-url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: streamUrl }),
                signal: this._shazamAbort?.signal
            });

            if (!response.ok) return null;

            const data = await response.json();
            if (!data.success || !data.result) return null;

            const normalized = this.normalizeRecognitionResult(data.result);
            if (!normalized.title || !normalized.artist) return null;

            console.log('✅ Identificado vía URL del stream');
            return normalized;
        } catch (error) {
            if (error.name === 'AbortError') throw error;
            console.warn('⚠️ /api/recognize-url no disponible:', error.message);
            return null;
        }
    }

    finishShazamSession(status, message) {
        this.stopTimer();
        this.isShazamListening = false;
        this.syncShazamUI();

        if (this.shazamModal) {
            const statusType = status === 'error' ? 'error' : 'timeout';
            this.showShazamStatus(message || this.t('shazam.noMusic'), statusType);
        }

        if (status === 'error') {
            this.showNotification(this.t('notifications.shazamStartError'), 'error');
        }

        setTimeout(() => {
            if (!this.shazamModal) return;
            const resultEl = this.shazamModal.querySelector('#shazamResult');
            const hasResult = resultEl && resultEl.style.display !== 'none';
            if (!hasResult) {
                this.closeShazamModal();
            }
        }, 4000);
    }

    closeShazamModal() {
        if (this.shazamModal) {
            this.shazamModal.remove();
            this.shazamModal = null;
            if (!this.hasOpenModal()) {
                document.body.style.overflow = '';
            }
        }
        this._shazamAbort = null;
        this.isShazamListening = false;
        this.syncShazamUI();
    }

    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
    }

    encodeWav(samples, sampleRate) {
        const numChannels = 1;
        const bitsPerSample = 16;
        const blockAlign = numChannels * bitsPerSample / 8;
        const byteRate = sampleRate * blockAlign;
        const dataSize = samples.length * 2;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        const writeStr = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);

        let pos = 44;
        for (let i = 0; i < samples.length; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            pos += 2;
        }

        return buffer;
    }

    stopShazam() {
        this._shazamAbort?.abort();
        this._shazamAbort = null;
        this.isShazamListening = false;
        this.stopTimer();
        this.syncShazamUI();
        
        // Detener reconocimiento a través del servicio
        if (this.shazamSocket && this.shazamSocket.connected) {
            this.shazamSocket.emit('stop-shazam');
        }
        
        this.closeShazamModal();
    }

    hasOpenModal() {
        return !!(
            this.shazamModal ||
            this.bandasModal ||
            this.registroPickerModal ||
            this.registroBandaModal ||
            this.registroBarModal ||
            this.estudioModal ||
            this.clasesModal ||
            this.mapaModal ||
            this.topTenModal
        );
    }

    releaseBodyScroll() {
        if (!this.hasOpenModal()) {
            document.body.style.overflow = '';
        }
    }

    updateShazamModalLabels() {
        if (!this.shazamModal) return;
        const statusText = this.shazamModal.querySelector('.status-text');
        if (statusText && this.shazamModal.querySelector('#shazamStatus').style.display !== 'none') {
            statusText.textContent = this.t('shazam.listening');
        }
        const result = this.shazamModal.querySelector('#shazamResult');
        if (result?.style.display !== 'none') {
            const playBtn = result.querySelector('#playResultBtn');
            const shareBtn = result.querySelector('#shareResultBtn');
            if (playBtn) playBtn.innerHTML = `<i class="fas fa-play"></i> ${this.t('common.play')}`;
            if (shareBtn) shareBtn.innerHTML = `<i class="fas fa-share"></i> ${this.t('common.share')}`;
        }
        const stopBtn = this.shazamModal.querySelector('#stopShazamBtn');
        if (stopBtn) stopBtn.innerHTML = `<i class="fas fa-stop"></i> ${this.t('common.stop')}`;
    }

    showShazamModal() {
        const modal = document.createElement('div');
        modal.className = 'shazam-modal-native';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <div class="shazam-logo-large">
                        <svg class="shazam-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                            <defs>
                                <symbol id="ShazamLogoLarge">
                                    <path d="M50 10C28.5 10 11 27.5 11 49s17.5 39 39 39 39-17.5 39-39S71.5 10 50 10zm0 70c-17.1 0-31-13.9-31-31s13.9-31 31-31 31 13.9 31 31-13.9 31-31 31z"/>
                                    <path d="M50 25c-13.2 0-24 10.8-24 24s10.8 24 24 24 24-10.8 24-24-10.8-24-24-24zm0 40c-8.8 0-16-7.2-16-16s7.2-16 16-16 16 7.2 16 16-7.2 16-16 16z"/>
                                    <path d="M50 35c-7.7 0-14 6.3-14 14s6.3 14 14 14 14-6.3 14-14-6.3-14-14-14zm0 20c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
                                    <circle cx="50" cy="49" r="3"/>
                                </symbol>
                            </defs>
                            <use xlink:href="#ShazamLogoLarge"></use>
                        </svg>
                    </div>
                    <h3 id="shazamTimer">40</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="shazam-status" id="shazamStatus">
                        <div class="status-icon"></div>
                        <div class="status-text">${this.t('shazam.listening')}</div>
                        <div class="status-indicator"></div>
                    </div>
                    <div class="shazam-result" id="shazamResult" style="display: none;">
                        <div class="result-artwork">
                            <div class="artwork-placeholder">
                                <i class="fas fa-music"></i>
                            </div>
                        </div>
                        <div class="result-info">
                            <h4 class="result-title">${this.t('shazam.songTitle')}</h4>
                            <p class="result-artist">${this.t('shazam.artistName')}</p>
                        </div>
                        <div class="result-actions">
                            <button class="action-btn primary" id="playResultBtn">
                                <i class="fas fa-play"></i>
                                ${this.t('common.play')}
                            </button>
                            <button class="action-btn secondary" id="shareResultBtn">
                                <i class="fas fa-share"></i>
                                ${this.t('common.share')}
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="stop-btn" id="stopShazamBtn">
                        <i class="fas fa-stop"></i>
                        ${this.t('common.stop')}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.shazamModal = modal;
        document.body.style.overflow = 'hidden';
        
        // Event listeners del modal
        modal.querySelector('.close-btn').addEventListener('click', () => this.stopShazam());
        modal.querySelector('#stopShazamBtn').addEventListener('click', () => this.stopShazam());
        modal.querySelector('.modal-backdrop').addEventListener('click', () => this.stopShazam());
        
        // Animación de entrada
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    startTimer() {
        this.timeRemaining = 40;
        this.updateTimerDisplay();
        
        this.shazamTimer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            
            if (this.timeRemaining <= 0) {
                this.stopTimer();
                this.stopShazam();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.shazamTimer) {
            clearInterval(this.shazamTimer);
            this.shazamTimer = null;
        }
    }

    updateTimerDisplay() {
        if (this.shazamModal) {
            const timerElement = this.shazamModal.querySelector('#shazamTimer');
            if (timerElement) {
                timerElement.textContent = this.timeRemaining;
            }
        }
    }

    showShazamStatus(message, type = 'info') {
        if (!this.shazamModal) return;
        
        const statusElement = this.shazamModal.querySelector('#shazamStatus');
        const statusText = statusElement.querySelector('.status-text');
        const statusIcon = statusElement.querySelector('.status-icon');
        const statusIndicator = statusElement.querySelector('.status-indicator');
        
        statusText.textContent = message;
        
        // Actualizar icono según el tipo
        const icons = {
            starting: '',
            listening: '',
            processing: '',
            success: '',
            error: '',
            timeout: ''
        };
        
        statusIcon.textContent = icons[type] || '';
        
        // Actualizar clase del indicador
        statusIndicator.className = `status-indicator ${type}`;
    }

    handleShazamResult(data) {
        if (!this.shazamModal) return;

        const song = this.normalizeRecognitionResult(data, data.api || 'Shazam');
        console.log('🎉 Procesando resultado de Shazam:', song);
        
        // Ocultar estado y mostrar resultado
        const statusElement = this.shazamModal.querySelector('#shazamStatus');
        const resultElement = this.shazamModal.querySelector('#shazamResult');
        
        statusElement.style.display = 'none';
        resultElement.style.display = 'block';
        
        // Actualizar información de la canción
        const titleElement = resultElement.querySelector('.result-title');
        const artistElement = resultElement.querySelector('.result-artist');
        const artworkElement = resultElement.querySelector('.artwork-placeholder');
        
        titleElement.textContent = song.title;
        artistElement.textContent = song.artist;
        
        // Actualizar imagen del álbum si está disponible
        if (song.imageUrl) {
            artworkElement.innerHTML = `<img src="${song.imageUrl}" alt="${song.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;">`;
        } else {
            // Mantener el icono por defecto si no hay imagen
            artworkElement.innerHTML = '<i class="fas fa-music"></i>';
        }
        
        // Agregar información adicional si está disponible
        if (song.album) {
            const albumElement = document.createElement('p');
            albumElement.className = 'result-album';
            albumElement.textContent = song.album;
            albumElement.style.cssText = 'color: var(--text-secondary); font-size: 0.9rem; margin: 4px 0 0 0; opacity: 0.8; font-style: italic;';
            artistElement.parentNode.insertBefore(albumElement, artistElement.nextSibling);
        }
        
        if (song.genre) {
            const genreElement = document.createElement('p');
            genreElement.className = 'result-genre';
            genreElement.textContent = song.genre;
            genreElement.style.cssText = 'color: var(--text-secondary); font-size: 0.9rem; margin: 4px 0 0 0; opacity: 0.7;';
            const albumElement = resultElement.querySelector('.result-album');
            if (albumElement) {
                albumElement.parentNode.insertBefore(genreElement, albumElement.nextSibling);
            } else {
                artistElement.parentNode.insertBefore(genreElement, artistElement.nextSibling);
            }
        }
        
        if (song.year) {
            const yearElement = document.createElement('p');
            yearElement.className = 'result-year';
            yearElement.textContent = song.year;
            yearElement.style.cssText = 'color: var(--text-secondary); font-size: 0.8rem; margin: 2px 0 0 0; opacity: 0.6;';
            const genreElement = resultElement.querySelector('.result-genre');
            if (genreElement) {
                genreElement.parentNode.insertBefore(yearElement, genreElement.nextSibling);
            } else {
                artistElement.parentNode.insertBefore(yearElement, artistElement.nextSibling);
            }
        }
        
        if (song.shazamCount) {
            const countElement = document.createElement('p');
            countElement.className = 'result-count';
            countElement.textContent = this.t('shazam.identifications', { count: song.shazamCount });
            countElement.style.cssText = 'color: var(--neon-blue); font-size: 0.8rem; margin: 4px 0 0 0; font-weight: 500;';
            const yearElement = resultElement.querySelector('.result-year');
            if (yearElement) {
                yearElement.parentNode.insertBefore(countElement, yearElement.nextSibling);
            } else {
                const genreElement = resultElement.querySelector('.result-genre');
                if (genreElement) {
                    genreElement.parentNode.insertBefore(countElement, genreElement.nextSibling);
                } else {
                    artistElement.parentNode.insertBefore(countElement, artistElement.nextSibling);
                }
            }
        }
        
        // Event listeners para acciones
        resultElement.querySelector('#playResultBtn').addEventListener('click', () => {
            this.searchAndPlaySong(song.title, song.artist);
        });
        
        resultElement.querySelector('#shareResultBtn').addEventListener('click', () => {
            this.shareSongResult(song);
        });
        
        // Detener contador
        this.stopTimer();
        
        // Actualizar estado del botón
        this.updateShazamButton(false);

        this.setNowPlaying({ title: song.title, artist: song.artist });
        
        // Auto-cerrar después de 15 segundos (más tiempo para ver la información)
        setTimeout(() => {
            if (this.shazamModal) {
                this.stopShazam();
            }
        }, 15000);
    }

    syncShazamUI() {
        const isPlaying = this.isPlaying;
        const isListening = this.isShazamListening;
        const isIdentified = !!this.nowPlaying;
        const buttons = [
            document.getElementById('shazamBtn'),
            document.getElementById('mobileShazamBtn')
        ].filter(Boolean);

        let labelKey = 'shazam.identifyMusic';
        if (!isPlaying) labelKey = 'shazam.playFirst';
        else if (isIdentified && !isListening) labelKey = 'shazam.alreadyIdentified';
        else if (isListening) labelKey = 'shazam.stopIdentify';

        const label = this.t(labelKey);
        const inactive = !isPlaying || (isIdentified && !isListening);

        buttons.forEach((btn) => {
            btn.classList.toggle('inactive', inactive);
            btn.classList.toggle('listening', isPlaying && isListening);
            btn.classList.toggle('identified', isIdentified && !isListening);
            btn.setAttribute('aria-disabled', inactive ? 'true' : 'false');

            if (btn.tagName === 'BUTTON') {
                btn.disabled = inactive;
            } else {
                btn.tabIndex = inactive ? -1 : 0;
            }

            if ('title' in btn) btn.title = label;
            btn.setAttribute('aria-label', label);
        });

        window.mobileHeader?.updateShazamState(isListening, isPlaying, isIdentified);
    }

    updateShazamButton(isListening) {
        this.isShazamListening = isListening;
        this.syncShazamUI();
    }

    searchAndPlaySong(title, artist) {
        // Implementar búsqueda y reproducción de la canción
        console.log(`🎵 Buscando: ${title} - ${artist}`);
        this.showNotification(this.t('shazam.searching', { title, artist }), 'info');
        
        // Aquí se podría integrar con APIs de música como Spotify, YouTube, etc.
    }

    shareSongResult(data) {
        let shareText = this.t('shazam.sharePrefix', { title: data.title, artist: data.artist });
        
        if (data.album) {
            shareText += this.t('shazam.shareAlbum', { album: data.album });
        }
        
        if (data.year) {
            shareText += ` (${data.year})`;
        }
        
        if (data.genre) {
            shareText += ` - ${data.genre}`;
        }
        
        if (data.shazamCount) {
            shareText += this.t('shazam.shareShazamCount', { count: data.shazamCount });
        }
        
        shareText += this.t('shazam.shareSuffix');
        
        const shareUrl = window.location.href;
        
        if (navigator.share) {
            navigator.share({
                title: this.t('shazam.shareTitle'),
                text: shareText,
                url: shareUrl
            });
        } else {
            navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
            this.showNotification(this.t('notifications.linkCopied'), 'success');
        }
    }

    // Funciones existentes del sistema original...
    initAudio() {
        this.audio = new Audio();
        this.audio.src = this.streamUrl;
        this.audio.preload = 'none';
        
        this.audio.addEventListener('loadstart', () => {
            console.log('🎵 Cargando audio...');
        });
        
        this.audio.addEventListener('canplay', () => {
            console.log('✅ Audio listo para reproducir');
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('❌ Error de audio:', e);
            this.tryFallbackStream();
        });

        this.audio.addEventListener('ended', () => this.handleRadioTrackEnded());
    }

    async togglePlay() {
        if (this.isPlaying) {
            this.stopAudio();
        } else {
            await this.playAudio();
        }
    }

    async playAudio() {
        try {
            if (!this.audio.src) {
                this.audio.src = this.streamUrl;
            }
            
            await this.audio.play();
            this.isPlaying = true;
            
            // Actualizar botones
            document.querySelectorAll('.play-btn, .play-btn-small').forEach(btn => {
                btn.innerHTML = '<i class="fas fa-pause"></i>';
            });
            
            // Activar visualizador de audio
            const visualizer = document.querySelector('.audio-visualizer');
            if (visualizer) {
                visualizer.classList.add('playing');
            }

            this.updateRadioLiveBar();
            window.mobileHeader?.updatePlayState(true);
            this.updateNowPlayingUI();
            this.syncShazamUI();
            setTimeout(() => this.fetchNowPlayingMetadata(), 2500);

        this.updateNowPlayingUI();
        } catch (error) {
            console.error('Error reproduciendo audio:', error);
            this.showNotification(this.t('notifications.audioError'), 'error');
        }
    }

    stopAudio() {
        if (this.isShazamListening) {
            this.stopShazam();
        }

        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
        
        this.isPlaying = false;
        
        // Actualizar botones
        document.querySelectorAll('.play-btn, .play-btn-small').forEach(btn => {
            btn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        // Desactivar visualizador de audio
        const visualizer = document.querySelector('.audio-visualizer');
        if (visualizer) {
            visualizer.classList.remove('playing');
        }

        this.nowPlaying = null;
        this.updateRadioLiveBar();
        window.mobileHeader?.updatePlayState(false);
        this.updateNowPlayingUI();
        this.syncShazamUI();
    }

    async tryFallbackStream() {
        for (const stream of this.fallbackStreams) {
            try {
                console.log(`🔄 Intentando stream de respaldo: ${stream}`);
                this.audio.src = stream;
                await this.audio.load();
                break;
            } catch (error) {
                console.error(`❌ Error con stream de respaldo ${stream}:`, error);
            }
        }
    }

    handleNavigation(e) {
        const item = e.currentTarget;
        const target = item.dataset.section;
        const action = item.dataset.action;
        const isExternal = item.dataset.external === 'true';
        const isModal = item.dataset.modal === 'true';

        window.mobileHeader?.closeMobileMenu?.();

        if (item.tagName === 'A') {
            const href = item.getAttribute('href');
            if (href && href !== '#') {
                window.location.href = href;
            }
            return;
        }

        if (action) {
            switch (action) {
                case 'listen':
                    this.togglePlay();
                    return;
                case 'shazam':
                    this.startShazam();
                    return;
                case 'registro':
                    this.openRegistroPickerModal();
                    return;
                case 'registro-banda':
                    this.openRegistroBandaModal();
                    return;
                case 'registro-bar':
                    this.openRegistroBarModal();
                    return;
                case 'topten':
                    this.openTopTenModal();
                    return;
            }
        }

        if (isModal) {
            switch (target) {
                case 'bandas':
                    this.openBandasModal();
                    return;
                case 'estudio':
                    this.openEstudioModal();
                    return;
                case 'clases':
                    this.openClasesModal();
                    return;
                case 'mapa':
                    this.openMapaModal();
                    return;
            }
        }
        
        if (isExternal) {
            if (target === 'products') {
                window.location.href = 'productos.html';
            }
        } else if (target) {
            const element = document.getElementById(target);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    async openBandasModal(bandaId = null) {
        if (this.bandasModal) {
            this.closeBandasModal();
            await new Promise(resolve => setTimeout(resolve, 320));
        }

        this.bandasState = {
            bandas: [],
            selectedBanda: null,
            selectedDate: null,
            currentStep: 1,
            calendarMonth: new Date(),
            searchQuery: '',
            genreFilter: ''
        };

        const modal = document.createElement('div');
        modal.className = 'bandas-modal-native';
        modal.innerHTML = `
            <div class="bandas-backdrop"></div>
            <div class="bandas-container">
                <div class="bandas-header">
                    <div class="bandas-header-title">
                        <i class="fas fa-guitar"></i>
                        <h3>${this.t('bandas.title')}</h3>
                    </div>
                    <button class="bandas-close-btn">&times;</button>
                </div>
                <div class="bandas-steps">
                    <div class="bandas-step active" data-step="1">
                        <span class="bandas-step-num">1</span>
                        <span class="bandas-step-label">${this.t('bandas.stepBand')}</span>
                    </div>
                    <div class="bandas-step" data-step="2">
                        <span class="bandas-step-num">2</span>
                        <span class="bandas-step-label">${this.t('bandas.stepProfile')}</span>
                    </div>
                    <div class="bandas-step" data-step="3">
                        <span class="bandas-step-num">3</span>
                        <span class="bandas-step-label">${this.t('bandas.stepDate')}</span>
                    </div>
                    <div class="bandas-step" data-step="4">
                        <span class="bandas-step-num">4</span>
                        <span class="bandas-step-label">${this.t('bandas.stepPay')}</span>
                    </div>
                </div>
                <div class="bandas-body">
                    <div class="bandas-panel active" data-panel="1">
                        <div class="bandas-search-bar">
                            <div class="bandas-search-input-wrap">
                                <i class="fas fa-search"></i>
                                <input type="text" class="bandas-search-input" placeholder="${this.t('bandas.searchPlaceholder')}" id="bandasSearchInput">
                            </div>
                            <select class="bandas-genre-select" id="bandasGenreSelect">
                                <option value="">${this.t('common.allGenres')}</option>
                            </select>
                        </div>
                        <div class="bandas-list" id="bandasList">
                            <div class="bandas-loading">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>${this.t('bandas.loading')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="bandas-panel" data-panel="2">
                        <div id="bandasProfileContent"></div>
                    </div>
                    <div class="bandas-panel" data-panel="3">
                        <div class="bandas-selected-info" id="bandasSelectedInfo"></div>
                        <div class="bandas-calendar-header">
                            <button class="bandas-cal-nav-btn" id="bandasCalPrev"><i class="fas fa-chevron-left"></i></button>
                            <span class="bandas-cal-month" id="bandasCalMonth"></span>
                            <button class="bandas-cal-nav-btn" id="bandasCalNext"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <div class="bandas-cal-grid" id="bandasCalGrid"></div>
                        <div class="bandas-cal-legend">
                            <span><span class="bandas-cal-legend-dot available"></span> ${this.t('common.available')}</span>
                            <span><span class="bandas-cal-legend-dot unavailable"></span> ${this.t('common.unavailable')}</span>
                        </div>
                    </div>
                    <div class="bandas-panel" data-panel="4">
                        <div class="bandas-payment-summary" id="bandasPaymentSummary"></div>
                        <button class="bandas-stripe-btn" id="bandasStripeBtn" disabled>
                            <i class="fab fa-stripe"></i>
                            ${this.t('common.payStripe')}
                        </button>
                        <p class="bandas-stripe-note">
                            <i class="fas fa-lock"></i>
                            ${this.t('common.paySecure')}
                        </p>
                    </div>
                </div>
                <div class="bandas-footer">
                    <button class="bandas-btn bandas-btn-secondary" id="bandasBackBtn" style="display:none">${this.t('common.back')}</button>
                    <button class="bandas-btn bandas-btn-primary" id="bandasNextBtn" disabled>${this.t('common.continue')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.bandasModal = modal;
        document.body.style.overflow = 'hidden';

        modal.querySelector('.bandas-close-btn').addEventListener('click', () => this.closeBandasModal());
        modal.querySelector('.bandas-backdrop').addEventListener('click', () => this.closeBandasModal());
        modal.querySelector('#bandasSearchInput').addEventListener('input', (e) => {
            this.bandasState.searchQuery = e.target.value;
            this.renderBandasList();
        });
        modal.querySelector('#bandasGenreSelect').addEventListener('change', (e) => {
            this.bandasState.genreFilter = e.target.value;
            this.renderBandasList();
        });
        modal.querySelector('#bandasBackBtn').addEventListener('click', () => this.bandasGoToStep(this.bandasState.currentStep - 1));
        modal.querySelector('#bandasNextBtn').addEventListener('click', () => this.bandasGoToStep(this.bandasState.currentStep + 1));
        modal.querySelector('#bandasCalPrev').addEventListener('click', () => this.changeCalendarMonth(-1));
        modal.querySelector('#bandasCalNext').addEventListener('click', () => this.changeCalendarMonth(1));
        modal.querySelector('#bandasStripeBtn').addEventListener('click', () => this.processBandasPayment());

        await this.loadBandas();

        if (bandaId) {
            this.bandasState.selectedBanda = this.bandasState.bandas.find(b => b.id === bandaId) || null;
            if (this.bandasState.selectedBanda) {
                setTimeout(() => this.bandasGoToStep(2), 50);
            }
        }

        setTimeout(() => modal.classList.add('show'), 10);
    }

    closeBandasModal() {
        if (!this.bandasModal) return;
        this.stopBandasAudio();
        this.bandasModal.classList.remove('show');
        setTimeout(() => {
            this.bandasModal?.remove();
            this.bandasModal = null;
            this.releaseBodyScroll();
        }, 300);
    }

    getRegistroGeneros() {
        return [
            'Regional Mexicano', 'Rock Alternativo', 'Rock', 'Cumbia', 'Jazz',
            'Mariachi', 'Pop', 'Hip Hop', 'Blues', 'Ska', 'Metal', 'Electrónica', 'Otro'
        ];
    }

    handleGuiaCta(action) {
        if (action === 'registro') this.openRegistroPickerModal();
        else if (action === 'bandas') this.openBandasModal();
        else if (action === 'mapa') this.openMapaModal();
    }

    openRegistroPickerModal() {
        if (this.registroPickerModal) return;

        window.mobileHeader?.closeMobileMenu?.();

        const modal = document.createElement('div');
        modal.className = 'registro-picker-modal-native';
        modal.innerHTML = `
            <div class="registro-picker-backdrop"></div>
            <div class="registro-picker-container">
                <button class="registro-picker-close-btn" type="button" aria-label="Cerrar">&times;</button>
                <div class="registro-picker-header">
                    <h3>${this.t('registroPicker.title')}</h3>
                    <p>${this.t('registroPicker.subtitle')}</p>
                </div>
                <div class="registro-picker-options">
                    <button class="registro-picker-option" type="button" data-registro-type="banda">
                        <span class="registro-picker-option-icon"><i class="fas fa-guitar"></i></span>
                        <span class="registro-picker-option-text">
                            <strong>${this.t('registroPicker.banda')}</strong>
                            <small>${this.t('registroPicker.bandaDesc')}</small>
                        </span>
                        <i class="fas fa-chevron-right registro-picker-option-arrow"></i>
                    </button>
                    <button class="registro-picker-option" type="button" data-registro-type="lugar">
                        <span class="registro-picker-option-icon"><i class="fas fa-store"></i></span>
                        <span class="registro-picker-option-text">
                            <strong>${this.t('registroPicker.lugar')}</strong>
                            <small>${this.t('registroPicker.lugarDesc')}</small>
                        </span>
                        <i class="fas fa-chevron-right registro-picker-option-arrow"></i>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.registroPickerModal = modal;
        document.body.style.overflow = 'hidden';

        modal.querySelector('.registro-picker-close-btn').addEventListener('click', () => this.closeRegistroPickerModal());
        modal.querySelector('.registro-picker-backdrop').addEventListener('click', () => this.closeRegistroPickerModal());
        modal.querySelectorAll('[data-registro-type]').forEach(btn => {
            btn.addEventListener('click', () => this.selectRegistroType(btn.dataset.registroType));
        });

        this.registroPickerEscHandler = (e) => {
            if (e.key === 'Escape') this.closeRegistroPickerModal();
        };
        document.addEventListener('keydown', this.registroPickerEscHandler);

        setTimeout(() => modal.classList.add('show'), 10);
    }

    closeRegistroPickerModal(nextModal) {
        if (!this.registroPickerModal) {
            if (nextModal === 'banda') this.openRegistroBandaModal();
            else if (nextModal === 'lugar') this.openRegistroBarModal();
            return;
        }

        this.registroPickerModal.classList.remove('show');
        if (this.registroPickerEscHandler) {
            document.removeEventListener('keydown', this.registroPickerEscHandler);
            this.registroPickerEscHandler = null;
        }

        setTimeout(() => {
            this.registroPickerModal?.remove();
            this.registroPickerModal = null;

            if (nextModal === 'banda') {
                this.openRegistroBandaModal();
            } else if (nextModal === 'lugar') {
                this.openRegistroBarModal();
            } else {
                this.releaseBodyScroll();
            }
        }, 300);
    }

    selectRegistroType(type) {
        if (type === 'banda' || type === 'lugar') {
            this.closeRegistroPickerModal(type);
        }
    }

    updateRegistroPickerModalLabels() {
        if (!this.registroPickerModal) return;
        const m = this.registroPickerModal;
        const h3 = m.querySelector('.registro-picker-header h3');
        const p = m.querySelector('.registro-picker-header p');
        if (h3) h3.textContent = this.t('registroPicker.title');
        if (p) p.textContent = this.t('registroPicker.subtitle');

        const bandaBtn = m.querySelector('[data-registro-type="banda"]');
        const lugarBtn = m.querySelector('[data-registro-type="lugar"]');
        if (bandaBtn) {
            bandaBtn.querySelector('strong').textContent = this.t('registroPicker.banda');
            bandaBtn.querySelector('small').textContent = this.t('registroPicker.bandaDesc');
        }
        if (lugarBtn) {
            lugarBtn.querySelector('strong').textContent = this.t('registroPicker.lugar');
            lugarBtn.querySelector('small').textContent = this.t('registroPicker.lugarDesc');
        }
    }

    openRegistroBandaModal() {
        if (this.registroBandaModal) return;

        const generos = this.getRegistroGeneros()
            .map(g => `<option value="${g}">${g}</option>`)
            .join('');

        const modal = document.createElement('div');
        modal.className = 'registro-banda-modal-native';
        modal.innerHTML = `
            <div class="registro-banda-backdrop"></div>
            <div class="registro-banda-container">
                <div class="registro-banda-header">
                    <div class="registro-banda-header-title">
                        <i class="fas fa-user-plus"></i>
                        <div>
                            <h3>${this.t('registroBanda.title')}</h3>
                            <p>${this.t('registroBanda.subtitle')}</p>
                        </div>
                    </div>
                    <button class="registro-banda-close-btn" type="button">&times;</button>
                </div>
                <div class="registro-banda-body">
                    <form class="registro-banda-form" id="registroBandaForm" novalidate>
                        <div class="registro-banda-section">
                            <h4 class="registro-banda-section-title"><i class="fas fa-guitar"></i> ${this.t('registroBanda.sectionBand')}</h4>
                            <div class="registro-banda-grid">
                                <div class="registro-banda-field full" data-field="nombre">
                                    <label>${this.t('registroBanda.labelName')} <span class="required">*</span></label>
                                    <input type="text" name="nombre" placeholder="${this.t('registroBanda.placeholderName')}" required maxlength="80">
                                    <span class="field-error">${this.t('registroBanda.errorRequired')}</span>
                                </div>
                                <div class="registro-banda-field full" data-field="contrasena">
                                    <label>${this.t('registroBanda.labelPassword')} <span class="required">*</span></label>
                                    <div class="registro-banda-password-wrap">
                                        <input type="password" name="contrasena" placeholder="${this.t('registroBanda.placeholderPassword')}" required minlength="6" autocomplete="new-password">
                                        <button type="button" class="registro-banda-toggle-pw" aria-label="Mostrar contraseña">
                                            <i class="fas fa-eye" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                    <span class="field-hint">${this.t('registroBanda.hintPassword')}</span>
                                    <span class="field-error">${this.t('registroBanda.errorPassword')}</span>
                                </div>
                                <div class="registro-banda-field" data-field="genero">
                                    <label>${this.t('registroBanda.labelGenre')} <span class="required">*</span></label>
                                    <select name="genero" required>
                                        <option value="">${this.t('registroBanda.selectGenre')}</option>
                                        ${generos}
                                    </select>
                                    <span class="field-error">${this.t('registroBanda.errorRequired')}</span>
                                </div>
                                <div class="registro-banda-field" data-field="duracion">
                                    <label>${this.t('registroBanda.labelDuration')} <span class="required">*</span></label>
                                    <select name="duracion" required>
                                        <option value="">${this.t('registroBanda.selectDuration')}</option>
                                        <option value="1 hora">${this.t('registroBanda.duration1h')}</option>
                                        <option value="2 horas">${this.t('registroBanda.duration2h')}</option>
                                        <option value="3 horas">${this.t('registroBanda.duration3h')}</option>
                                        <option value="4+ horas">${this.t('registroBanda.duration4h')}</option>
                                    </select>
                                    <span class="field-error">${this.t('registroBanda.errorRequired')}</span>
                                </div>
                                <div class="registro-banda-field" data-field="precio">
                                    <label>${this.t('registroBanda.labelPrice')} <span class="required">*</span></label>
                                    <input type="number" name="precio" min="500" max="500000" step="100" placeholder="6500" required>
                                    <span class="field-error">${this.t('registroBanda.errorRequired')}</span>
                                </div>
                                <div class="registro-banda-field full" data-field="descripcion">
                                    <label>${this.t('registroBanda.labelDescription')}</label>
                                    <textarea name="descripcion" rows="3" placeholder="${this.t('registroBanda.placeholderDescription')}" maxlength="500"></textarea>
                                    <span class="field-hint">${this.t('registroBanda.hintDescription')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="registro-banda-section">
                            <h4 class="registro-banda-section-title"><i class="fab fa-whatsapp"></i> ${this.t('registroBanda.sectionContact')}</h4>
                            <div class="registro-banda-grid">
                                <div class="registro-banda-field" data-field="contacto">
                                    <label>${this.t('registroBanda.labelContact')} <span class="required">*</span></label>
                                    <input type="text" name="contacto" placeholder="${this.t('registroBanda.placeholderContact')}" required maxlength="80">
                                    <span class="field-error">${this.t('registroBanda.errorRequired')}</span>
                                </div>
                                <div class="registro-banda-field" data-field="telefono">
                                    <label>${this.t('registroBanda.labelPhone')} <span class="required">*</span></label>
                                    <div class="registro-banda-phone-wrap">
                                        <span class="registro-banda-phone-prefix"><i class="fab fa-whatsapp"></i> +52</span>
                                        <input type="tel" name="telefono" placeholder="${this.t('registroBanda.placeholderPhone')}" required maxlength="10" inputmode="numeric" pattern="[0-9]{10}">
                                    </div>
                                    <span class="field-hint">${this.t('registroBanda.hintPhone')}</span>
                                    <span class="field-error">${this.t('registroBanda.errorPhone')}</span>
                                </div>
                                <div class="registro-banda-field full" data-field="email">
                                    <label>${this.t('registroBanda.labelEmail')}</label>
                                    <input type="email" name="email" placeholder="${this.t('registroBanda.placeholderEmail')}">
                                    <span class="field-hint">${this.t('registroBanda.hintEmail')}</span>
                                    <span class="field-error">${this.t('registroBanda.errorEmail')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="registro-banda-section">
                            <h4 class="registro-banda-section-title"><i class="fas fa-photo-video"></i> ${this.t('registroBanda.sectionMedia')}</h4>
                            <div class="registro-banda-grid">
                                <div class="registro-banda-field" data-field="imagen">
                                    <label>${this.t('registroBanda.labelCover')}</label>
                                    <div class="registro-banda-file-wrap">
                                        <input type="file" class="registro-banda-file-input" name="imagen" accept="image/jpeg,image/png,image/webp" id="registroBandaCover">
                                        <label class="registro-banda-file-label" for="registroBandaCover">
                                            <i class="fas fa-image"></i>
                                            <span>${this.t('registroBanda.uploadCover')}</span>
                                        </label>
                                    </div>
                                    <span class="field-hint">${this.t('registroBanda.hintCover')}</span>
                                    <div class="registro-banda-file-preview" id="registroBandaCoverPreview"></div>
                                </div>
                                <div class="registro-banda-field" data-field="muestras">
                                    <label>${this.t('registroBanda.labelSamples')}</label>
                                    <div class="registro-banda-file-wrap">
                                        <input type="file" class="registro-banda-file-input" name="muestras" accept="audio/*" multiple id="registroBandaSamples">
                                        <label class="registro-banda-file-label" for="registroBandaSamples">
                                            <i class="fas fa-music"></i>
                                            <span>${this.t('registroBanda.uploadSamples')}</span>
                                        </label>
                                    </div>
                                    <span class="field-hint">${this.t('registroBanda.hintSamples')}</span>
                                    <div class="registro-banda-file-preview" id="registroBandaSamplesPreview"></div>
                                </div>
                            </div>
                        </div>
                        <div class="registro-banda-section">
                            <h4 class="registro-banda-section-title"><i class="fas fa-map-marker-alt"></i> ${this.t('registroBanda.sectionExtra')}</h4>
                            <div class="registro-banda-grid">
                                <div class="registro-banda-field full" data-field="lugares">
                                    <label>${this.t('registroBanda.labelVenues')}</label>
                                    <textarea name="lugares" rows="2" placeholder="${this.t('registroBanda.placeholderVenues')}" maxlength="300"></textarea>
                                    <span class="field-hint">${this.t('registroBanda.hintVenues')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="registro-banda-section">
                            <div class="registro-banda-checks" data-field="checks">
                                <label class="registro-banda-check">
                                    <input type="checkbox" name="whatsappConsent" required>
                                    <span><i class="fab fa-whatsapp"></i> ${this.t('registroBanda.whatsappConsent')}</span>
                                </label>
                                <label class="registro-banda-check">
                                    <input type="checkbox" name="termsConsent" required>
                                    <span>${this.t('registroBanda.termsConsent')}</span>
                                </label>
                                <span class="field-error">${this.t('registroBanda.errorChecks')}</span>
                            </div>
                        </div>
                    </form>
                    <div class="registro-banda-success" id="registroBandaSuccess">
                        <div class="registro-banda-success-icon"><i class="fas fa-check"></i></div>
                        <h4>${this.t('registroBanda.successTitle')}</h4>
                        <p>${this.t('registroBanda.successDesc')}</p>
                        <button type="button" class="registro-banda-btn registro-banda-btn-primary" id="registroBandaSuccessClose">
                            ${this.t('registroBanda.successClose')}
                        </button>
                    </div>
                </div>
                <div class="registro-banda-footer" id="registroBandaFooter">
                    <button type="button" class="registro-banda-btn registro-banda-btn-secondary" id="registroBandaCancel">${this.t('registroBanda.cancel')}</button>
                    <button type="submit" form="registroBandaForm" class="registro-banda-btn registro-banda-btn-primary" id="registroBandaSubmit">
                        <i class="fas fa-paper-plane"></i>
                        ${this.t('registroBanda.submit')}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.registroBandaModal = modal;
        document.body.style.overflow = 'hidden';

        modal.querySelector('.registro-banda-close-btn').addEventListener('click', () => this.closeRegistroBandaModal());
        modal.querySelector('.registro-banda-backdrop').addEventListener('click', () => this.closeRegistroBandaModal());
        modal.querySelector('#registroBandaCancel').addEventListener('click', () => this.closeRegistroBandaModal());
        modal.querySelector('#registroBandaSuccessClose').addEventListener('click', () => this.closeRegistroBandaModal());
        modal.querySelector('#registroBandaForm').addEventListener('submit', (e) => this.submitRegistroBanda(e));

        modal.querySelector('#registroBandaCover').addEventListener('change', (e) => this.previewRegistroCover(e));
        modal.querySelector('#registroBandaSamples').addEventListener('change', (e) => this.previewRegistroSamples(e));

        modal.querySelector('input[name="telefono"]').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });

        modal.querySelector('.registro-banda-toggle-pw')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const input = modal.querySelector('input[name="contrasena"]');
            if (!input) return;
            const icon = btn.querySelector('i');
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            icon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
            btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
        });

        this.registroBandaEscHandler = (e) => {
            if (e.key === 'Escape') this.closeRegistroBandaModal();
        };
        document.addEventListener('keydown', this.registroBandaEscHandler);

        setTimeout(() => modal.classList.add('show'), 10);
        modal.querySelector('input[name="nombre"]')?.focus();
    }

    closeRegistroBandaModal() {
        if (!this.registroBandaModal) return;
        this.registroBandaModal.classList.remove('show');
        if (this.registroBandaEscHandler) {
            document.removeEventListener('keydown', this.registroBandaEscHandler);
            this.registroBandaEscHandler = null;
        }
        setTimeout(() => {
            this.registroBandaModal?.remove();
            this.registroBandaModal = null;
            this.releaseBodyScroll();
        }, 300);
    }

    previewRegistroCover(e) {
        const preview = this.registroBandaModal?.querySelector('#registroBandaCoverPreview');
        if (!preview) return;
        preview.innerHTML = '';
        const file = e.target.files?.[0];
        if (!file) return;
        const img = document.createElement('img');
        img.className = 'registro-banda-img-preview';
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        preview.appendChild(img);
    }

    previewRegistroSamples(e) {
        const preview = this.registroBandaModal?.querySelector('#registroBandaSamplesPreview');
        if (!preview) return;
        preview.innerHTML = '';
        Array.from(e.target.files || []).forEach(file => {
            const chip = document.createElement('span');
            chip.className = 'registro-banda-audio-chip';
            chip.innerHTML = `<i class="fas fa-file-audio"></i> ${file.name}`;
            preview.appendChild(chip);
        });
    }

    readFileAsDataURL(file, maxBytes = 3 * 1024 * 1024) {
        return new Promise(resolve => {
            if (!file || file.size > maxBytes) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    saveBandAccount(registro) {
        if (!registro.nombre?.trim() || !registro.contrasena) return;
        try {
            const key = 'desiertoSonoro_bandAccounts';
            const accounts = JSON.parse(localStorage.getItem(key) || '[]');
            const account = {
                nombre: registro.nombre.trim(),
                nombreKey: registro.nombre.trim().toLowerCase(),
                email: registro.email?.trim() || '',
                emailKey: registro.email?.trim().toLowerCase() || '',
                password: registro.contrasena,
                telefono: registro.telefono
            };
            const idx = accounts.findIndex(a => a.nombreKey === account.nombreKey);
            if (idx >= 0) accounts[idx] = account;
            else accounts.push(account);
            localStorage.setItem(key, JSON.stringify(accounts));
        } catch (_) { /* storage unavailable */ }
    }

    saveBandProfile(registro) {
        if (!registro.nombre?.trim()) return;
        try {
            const key = 'desiertoSonoro_bandProfiles';
            const profiles = JSON.parse(localStorage.getItem(key) || '{}');
            const nombreKey = registro.nombre.trim().toLowerCase();
            const existing = profiles[nombreKey] || {};

            profiles[nombreKey] = {
                ...existing,
                nombre: registro.nombre.trim(),
                nombreKey,
                genero: registro.genero || existing.genero || '',
                duracion: registro.duracion || existing.duracion || '',
                precio: registro.precio ?? existing.precio ?? 0,
                descripcion: registro.descripcion || existing.descripcion || '',
                contacto: registro.contacto || existing.contacto || '',
                telefono: registro.telefono || existing.telefono || '',
                email: registro.email || existing.email || '',
                lugares: registro.lugares?.length ? registro.lugares : (existing.lugares || []),
                avatar: registro.avatar || existing.avatar || null,
                muestras: registro.muestras?.length ? registro.muestras : (existing.muestras || []),
                stats: existing.stats || {
                    vistas: Math.floor(Math.random() * 800) + 200,
                    reservas: Math.floor(Math.random() * 25) + 5,
                    shows: Math.floor(Math.random() * 20) + 3,
                    productos: Math.floor(Math.random() * 6)
                },
                rating: existing.rating || +(4 + Math.random() * 0.9).toFixed(1),
                premium: true,
                fechaRegistro: existing.fechaRegistro || registro.fechaRegistro || new Date().toISOString()
            };
            localStorage.setItem(key, JSON.stringify(profiles));
        } catch (_) { /* storage unavailable */ }
    }

    validateRegistroBandaForm(form) {
        let valid = true;

        form.querySelectorAll('.registro-banda-field, .registro-banda-checks').forEach(el => el.classList.remove('invalid'));

        const required = ['nombre', 'genero', 'duracion', 'precio', 'contacto', 'telefono', 'contrasena'];
        required.forEach(name => {
            const field = form.querySelector(`[name="${name}"]`);
            const wrapper = form.querySelector(`[data-field="${name}"]`);
            if (!field?.value.trim()) {
                wrapper?.classList.add('invalid');
                valid = false;
            }
        });

        const contrasena = form.querySelector('[name="contrasena"]');
        const pwWrapper = form.querySelector('[data-field="contrasena"]');
        if (contrasena?.value && contrasena.value.length < 6) {
            pwWrapper?.classList.add('invalid');
            valid = false;
        }

        const telefono = form.querySelector('[name="telefono"]');
        const telWrapper = form.querySelector('[data-field="telefono"]');
        if (telefono?.value && !/^\d{10}$/.test(telefono.value)) {
            telWrapper?.classList.add('invalid');
            valid = false;
        }

        const email = form.querySelector('[name="email"]');
        const emailWrapper = form.querySelector('[data-field="email"]');
        if (email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            emailWrapper?.classList.add('invalid');
            valid = false;
        }

        const whatsapp = form.querySelector('[name="whatsappConsent"]');
        const terms = form.querySelector('[name="termsConsent"]');
        const checksWrapper = form.querySelector('[data-field="checks"]');
        if (!whatsapp?.checked || !terms?.checked) {
            checksWrapper?.classList.add('invalid');
            valid = false;
        }

        return valid;
    }

    async submitRegistroBanda(e) {
        e.preventDefault();
        const form = e.target;
        if (!this.validateRegistroBandaForm(form)) return;

        const submitBtn = this.registroBandaModal?.querySelector('#registroBandaSubmit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.t('registroBanda.submitting')}`;
        }

        const imageFile = form.querySelector('[name="imagen"]')?.files?.[0];
        const sampleFiles = Array.from(form.querySelector('[name="muestras"]')?.files || []);
        const avatar = imageFile ? await this.readFileAsDataURL(imageFile, 1024 * 1024) : null;
        const muestras = [];
        for (const file of sampleFiles) {
            const dataUrl = await this.readFileAsDataURL(file);
            if (dataUrl) {
                muestras.push({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    titulo: file.name.replace(/\.[^.]+$/, ''),
                    nombre: file.name,
                    dataUrl
                });
            }
        }

        const formData = new FormData(form);
        const registro = {
            nombre: formData.get('nombre'),
            genero: formData.get('genero'),
            duracion: formData.get('duracion'),
            precio: parseInt(formData.get('precio'), 10),
            descripcion: formData.get('descripcion') || '',
            contacto: formData.get('contacto'),
            telefono: `+52${formData.get('telefono')}`,
            email: formData.get('email') || '',
            contrasena: formData.get('contrasena'),
            lugares: (formData.get('lugares') || '').split(',').map(s => s.trim()).filter(Boolean),
            whatsappConsent: true,
            avatar,
            muestras,
            fechaRegistro: new Date().toISOString()
        };

        this.saveBandAccount(registro);
        this.saveBandProfile(registro);

        const { contrasena: _, ...registroLog } = registro;
        console.log('📝 Registro de banda (frontend):', registroLog);

        setTimeout(() => {
            form.classList.add('hidden');
            this.registroBandaModal?.querySelector('#registroBandaFooter')?.remove();
            const success = this.registroBandaModal?.querySelector('#registroBandaSuccess');
            success?.classList.add('show');
            this.showNotification(this.t('notifications.registroBandaOk'), 'success');
        }, 800);
    }

    updateRegistroBandaModalLabels() {
        if (!this.registroBandaModal) return;
        this.closeRegistroBandaModal();
    }

    getRegistroBarTipos() {
        return [
            { value: 'Bar', key: 'typeBar' },
            { value: 'Bar & Grill', key: 'typeBarGrill' },
            { value: 'Restaurante', key: 'typeRestaurant' },
            { value: 'Foro', key: 'typeForum' },
            { value: 'Café', key: 'typeCafe' },
            { value: 'Terraza', key: 'typeTerrace' },
            { value: 'Otro', key: 'typeOther' }
        ];
    }

    openRegistroBarModal() {
        if (this.registroBarModal) return;

        const tipos = this.getRegistroBarTipos()
            .map(t => `<option value="${t.value}">${this.t(`registroBar.${t.key}`)}</option>`)
            .join('');

        const modal = document.createElement('div');
        modal.className = 'registro-bar-modal-native';
        modal.innerHTML = `
            <div class="registro-bar-backdrop"></div>
            <div class="registro-bar-container">
                <div class="registro-bar-header">
                    <div class="registro-bar-header-title">
                        <i class="fas fa-cocktail"></i>
                        <div>
                            <h3>${this.t('registroBar.title')}</h3>
                            <p>${this.t('registroBar.subtitle')}</p>
                        </div>
                    </div>
                    <button class="registro-bar-close-btn" type="button">&times;</button>
                </div>
                <div class="registro-bar-body">
                    <div class="registro-bar-info">
                        <i class="fas fa-info-circle"></i>
                        <p>${this.t('registroBar.infoCallout')}</p>
                    </div>
                    <form class="registro-bar-form" id="registroBarForm" novalidate>
                        <div class="registro-bar-section">
                            <h4 class="registro-bar-section-title"><i class="fas fa-store"></i> ${this.t('registroBar.sectionVenue')}</h4>
                            <div class="registro-bar-grid">
                                <div class="registro-bar-field full" data-field="nombre">
                                    <label>${this.t('registroBar.labelName')} <span class="required">*</span></label>
                                    <input type="text" name="nombre" placeholder="${this.t('registroBar.placeholderName')}" required maxlength="80">
                                    <span class="field-error">${this.t('registroBar.errorRequired')}</span>
                                </div>
                                <div class="registro-bar-field" data-field="tipo">
                                    <label>${this.t('registroBar.labelType')} <span class="required">*</span></label>
                                    <select name="tipo" required>
                                        <option value="">${this.t('registroBar.selectType')}</option>
                                        ${tipos}
                                    </select>
                                    <span class="field-error">${this.t('registroBar.errorRequired')}</span>
                                </div>
                                <div class="registro-bar-field" data-field="capacidad">
                                    <label>${this.t('registroBar.labelCapacity')}</label>
                                    <input type="number" name="capacidad" min="10" max="10000" step="10" placeholder="90">
                                    <span class="field-hint">${this.t('registroBar.hintCapacity')}</span>
                                </div>
                                <div class="registro-bar-field full" data-field="direccion">
                                    <label>${this.t('registroBar.labelAddress')} <span class="required">*</span></label>
                                    <input type="text" name="direccion" placeholder="${this.t('registroBar.placeholderAddress')}" required maxlength="200">
                                    <span class="field-hint">${this.t('registroBar.hintAddress')}</span>
                                    <span class="field-error">${this.t('registroBar.errorRequired')}</span>
                                </div>
                                <div class="registro-bar-field full" data-field="descripcion">
                                    <label>${this.t('registroBar.labelDescription')}</label>
                                    <textarea name="descripcion" rows="3" placeholder="${this.t('registroBar.placeholderDescription')}" maxlength="500"></textarea>
                                    <span class="field-hint">${this.t('registroBar.hintDescription')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="registro-bar-section">
                            <h4 class="registro-bar-section-title"><i class="fas fa-music"></i> ${this.t('registroBar.sectionMusic')}</h4>
                            <div class="registro-bar-grid">
                                <div class="registro-bar-field full" data-field="horarioMusica">
                                    <label>${this.t('registroBar.labelSchedule')}</label>
                                    <input type="text" name="horarioMusica" placeholder="${this.t('registroBar.placeholderSchedule')}" maxlength="80">
                                    <span class="field-hint">${this.t('registroBar.hintSchedule')}</span>
                                </div>
                                <div class="registro-bar-field full" data-field="generosPreferidos">
                                    <label>${this.t('registroBar.labelGenres')}</label>
                                    <input type="text" name="generosPreferidos" placeholder="${this.t('registroBar.placeholderGenres')}" maxlength="200">
                                    <span class="field-hint">${this.t('registroBar.hintGenres')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="registro-bar-section">
                            <h4 class="registro-bar-section-title"><i class="fab fa-whatsapp"></i> ${this.t('registroBar.sectionContact')}</h4>
                            <div class="registro-bar-grid">
                                <div class="registro-bar-field" data-field="contacto">
                                    <label>${this.t('registroBar.labelContact')} <span class="required">*</span></label>
                                    <input type="text" name="contacto" placeholder="${this.t('registroBar.placeholderContact')}" required maxlength="80">
                                    <span class="field-error">${this.t('registroBar.errorRequired')}</span>
                                </div>
                                <div class="registro-bar-field" data-field="telefono">
                                    <label>${this.t('registroBar.labelPhone')} <span class="required">*</span></label>
                                    <div class="registro-bar-phone-wrap">
                                        <span class="registro-bar-phone-prefix"><i class="fab fa-whatsapp"></i> +52</span>
                                        <input type="tel" name="telefono" placeholder="${this.t('registroBar.placeholderPhone')}" required maxlength="10" inputmode="numeric" pattern="[0-9]{10}">
                                    </div>
                                    <span class="field-hint">${this.t('registroBar.hintPhone')}</span>
                                    <span class="field-error">${this.t('registroBar.errorPhone')}</span>
                                </div>
                                <div class="registro-bar-field full" data-field="email">
                                    <label>${this.t('registroBar.labelEmail')}</label>
                                    <input type="email" name="email" placeholder="${this.t('registroBar.placeholderEmail')}">
                                    <span class="field-hint">${this.t('registroBar.hintEmail')}</span>
                                    <span class="field-error">${this.t('registroBar.errorEmail')}</span>
                                </div>
                            </div>
                        </div>
                        <div class="registro-bar-section">
                            <h4 class="registro-bar-section-title"><i class="fas fa-image"></i> ${this.t('registroBar.sectionMedia')}</h4>
                            <div class="registro-bar-grid">
                                <div class="registro-bar-field full" data-field="imagen">
                                    <label>${this.t('registroBar.labelPhoto')}</label>
                                    <div class="registro-bar-file-wrap">
                                        <input type="file" class="registro-bar-file-input" name="imagen" accept="image/jpeg,image/png,image/webp" id="registroBarPhoto">
                                        <label class="registro-bar-file-label" for="registroBarPhoto">
                                            <i class="fas fa-image"></i>
                                            <span>${this.t('registroBar.uploadPhoto')}</span>
                                        </label>
                                    </div>
                                    <span class="field-hint">${this.t('registroBar.hintPhoto')}</span>
                                    <div class="registro-bar-file-preview" id="registroBarPhotoPreview"></div>
                                </div>
                            </div>
                        </div>
                        <div class="registro-bar-section">
                            <div class="registro-bar-checks" data-field="checks">
                                <label class="registro-bar-check">
                                    <input type="checkbox" name="whatsappConsent" required>
                                    <span><i class="fab fa-whatsapp"></i> ${this.t('registroBar.whatsappConsent')}</span>
                                </label>
                                <label class="registro-bar-check">
                                    <input type="checkbox" name="termsConsent" required>
                                    <span>${this.t('registroBar.termsConsent')}</span>
                                </label>
                                <span class="field-error">${this.t('registroBar.errorChecks')}</span>
                            </div>
                        </div>
                    </form>
                    <div class="registro-bar-success" id="registroBarSuccess">
                        <div class="registro-bar-success-icon"><i class="fas fa-check"></i></div>
                        <h4>${this.t('registroBar.successTitle')}</h4>
                        <p>${this.t('registroBar.successDesc')}</p>
                        <button type="button" class="registro-bar-btn registro-bar-btn-primary" id="registroBarSuccessClose">
                            ${this.t('registroBar.successClose')}
                        </button>
                    </div>
                </div>
                <div class="registro-bar-footer" id="registroBarFooter">
                    <button type="button" class="registro-bar-btn registro-bar-btn-secondary" id="registroBarCancel">${this.t('registroBar.cancel')}</button>
                    <button type="submit" form="registroBarForm" class="registro-bar-btn registro-bar-btn-primary" id="registroBarSubmit">
                        <i class="fas fa-paper-plane"></i>
                        ${this.t('registroBar.submit')}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.registroBarModal = modal;
        document.body.style.overflow = 'hidden';

        modal.querySelector('.registro-bar-close-btn').addEventListener('click', () => this.closeRegistroBarModal());
        modal.querySelector('.registro-bar-backdrop').addEventListener('click', () => this.closeRegistroBarModal());
        modal.querySelector('#registroBarCancel').addEventListener('click', () => this.closeRegistroBarModal());
        modal.querySelector('#registroBarSuccessClose').addEventListener('click', () => this.closeRegistroBarModal());
        modal.querySelector('#registroBarForm').addEventListener('submit', (e) => this.submitRegistroBar(e));
        modal.querySelector('#registroBarPhoto').addEventListener('change', (e) => this.previewRegistroBarPhoto(e));

        modal.querySelector('input[name="telefono"]').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
        });

        this.registroBarEscHandler = (e) => {
            if (e.key === 'Escape') this.closeRegistroBarModal();
        };
        document.addEventListener('keydown', this.registroBarEscHandler);

        setTimeout(() => modal.classList.add('show'), 10);
        modal.querySelector('input[name="nombre"]')?.focus();
    }

    closeRegistroBarModal() {
        if (!this.registroBarModal) return;
        this.registroBarModal.classList.remove('show');
        if (this.registroBarEscHandler) {
            document.removeEventListener('keydown', this.registroBarEscHandler);
            this.registroBarEscHandler = null;
        }
        setTimeout(() => {
            this.registroBarModal?.remove();
            this.registroBarModal = null;
            this.releaseBodyScroll();
        }, 300);
    }

    previewRegistroBarPhoto(e) {
        const preview = this.registroBarModal?.querySelector('#registroBarPhotoPreview');
        if (!preview) return;
        preview.innerHTML = '';
        const file = e.target.files?.[0];
        if (!file) return;
        const img = document.createElement('img');
        img.className = 'registro-bar-img-preview';
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        preview.appendChild(img);
    }

    validateRegistroBarForm(form) {
        let valid = true;

        form.querySelectorAll('.registro-bar-field, .registro-bar-checks').forEach(el => el.classList.remove('invalid'));

        const required = ['nombre', 'tipo', 'direccion', 'contacto', 'telefono'];
        required.forEach(name => {
            const field = form.querySelector(`[name="${name}"]`);
            const wrapper = form.querySelector(`[data-field="${name}"]`);
            if (!field?.value.trim()) {
                wrapper?.classList.add('invalid');
                valid = false;
            }
        });

        const telefono = form.querySelector('[name="telefono"]');
        const telWrapper = form.querySelector('[data-field="telefono"]');
        if (telefono?.value && !/^\d{10}$/.test(telefono.value)) {
            telWrapper?.classList.add('invalid');
            valid = false;
        }

        const email = form.querySelector('[name="email"]');
        const emailWrapper = form.querySelector('[data-field="email"]');
        if (email?.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            emailWrapper?.classList.add('invalid');
            valid = false;
        }

        const whatsapp = form.querySelector('[name="whatsappConsent"]');
        const terms = form.querySelector('[name="termsConsent"]');
        const checksWrapper = form.querySelector('[data-field="checks"]');
        if (!whatsapp?.checked || !terms?.checked) {
            checksWrapper?.classList.add('invalid');
            valid = false;
        }

        return valid;
    }

    submitRegistroBar(e) {
        e.preventDefault();
        const form = e.target;
        if (!this.validateRegistroBarForm(form)) return;

        const submitBtn = this.registroBarModal?.querySelector('#registroBarSubmit');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.t('registroBar.submitting')}`;
        }

        const formData = new FormData(form);
        const registro = {
            nombre: formData.get('nombre'),
            tipo: formData.get('tipo'),
            direccion: formData.get('direccion'),
            capacidad: formData.get('capacidad') ? parseInt(formData.get('capacidad'), 10) : null,
            descripcion: formData.get('descripcion') || '',
            horarioMusica: formData.get('horarioMusica') || '',
            generosPreferidos: (formData.get('generosPreferidos') || '').split(',').map(s => s.trim()).filter(Boolean),
            contacto: formData.get('contacto'),
            telefono: `+52${formData.get('telefono')}`,
            email: formData.get('email') || '',
            whatsappConsent: true,
            imagen: form.querySelector('[name="imagen"]')?.files?.[0]?.name || null,
            fechaRegistro: new Date().toISOString()
        };

        console.log('📝 Registro de bar (frontend):', registro);

        setTimeout(() => {
            form.classList.add('hidden');
            this.registroBarModal?.querySelector('.registro-bar-info')?.remove();
            this.registroBarModal?.querySelector('#registroBarFooter')?.remove();
            const success = this.registroBarModal?.querySelector('#registroBarSuccess');
            success?.classList.add('show');
            this.showNotification(this.t('notifications.registroBarOk'), 'success');
        }, 800);
    }

    updateRegistroBarModalLabels() {
        if (!this.registroBarModal) return;
        this.closeRegistroBarModal();
    }

    stopBandasAudio() {
        if (this.bandasAudio) {
            this.bandasAudio.pause();
            this.bandasAudio = null;
        }
        this.bandasModal?.querySelectorAll('.banda-sample-play.playing').forEach(btn => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i>';
        });
    }

    renderStars(rating) {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (rating >= i) {
                stars.push('<i class="fas fa-star"></i>');
            } else if (rating >= i - 0.5) {
                stars.push('<i class="fas fa-star-half-alt"></i>');
            } else {
                stars.push('<i class="far fa-star"></i>');
            }
        }
        return stars.join('');
    }

    renderBandasProfile() {
        const banda = this.bandasState.selectedBanda;
        const container = this.bandasModal?.querySelector('#bandasProfileContent');
        if (!banda || !container) return;

        this.stopBandasAudio();

        const lugares = (banda.lugares || []).map(lugar => `
            <span class="banda-lugar-tag"><i class="fas fa-map-marker-alt"></i> ${lugar}</span>
        `).join('');

        const canciones = (banda.canciones || []).map((cancion, idx) => `
            <div class="banda-sample-item">
                <button class="banda-sample-play" data-src="${cancion.archivo}" data-idx="${idx}" title="${this.t('bandas.playSample')}">
                    <i class="fas fa-play"></i>
                </button>
                <div class="banda-sample-info">
                    <span class="banda-sample-title">${cancion.titulo}</span>
                    <span class="banda-sample-hint">${this.t('bandas.audioSample')}</span>
                </div>
            </div>
        `).join('') || `<p class="banda-profile-empty">${this.t('bandas.noSamples')}</p>`;

        container.innerHTML = `
            <div class="banda-profile">
                <div class="banda-profile-top">
                    <div class="banda-profile-image-wrap">
                        <img src="${banda.imagen || ''}" alt="${banda.nombre}" class="banda-profile-image"
                             onerror="this.style.display='none'; this.parentElement.classList.add('no-image')">
                        <div class="banda-profile-image-fallback"><i class="fas fa-music"></i></div>
                    </div>
                    <div class="banda-profile-header">
                        <h2 class="banda-profile-name">${banda.nombre}</h2>
                        <div class="banda-profile-rating">
                            <span class="banda-stars">${this.renderStars(banda.estrellas || 0)}</span>
                            <span class="banda-rating-num">${(banda.estrellas || 0).toFixed(1)}</span>
                        </div>
                        <span class="banda-profile-genre">${banda.genero}</span>
                        <p class="banda-profile-desc">${banda.descripcion}</p>
                        <div class="banda-profile-meta">
                            <span><i class="fas fa-clock"></i> ${banda.duracion}</span>
                            <span><i class="fas fa-tag"></i> ${this.formatPrice(banda.precio)}</span>
                        </div>
                    </div>
                </div>
                <div class="banda-profile-section">
                    <h4 class="banda-profile-section-title"><i class="fas fa-headphones"></i> ${this.t('bandas.listenSamples')}</h4>
                    <div class="banda-samples">${canciones}</div>
                </div>
                <div class="banda-profile-section">
                    <h4 class="banda-profile-section-title"><i class="fas fa-map-marker-alt"></i> ${this.t('bandas.playedIn')}</h4>
                    <div class="banda-lugares">${lugares || `<p class="banda-profile-empty">${this.t('bandas.noVenues')}</p>`}</div>
                </div>
            </div>
        `;

        container.querySelectorAll('.banda-sample-play').forEach(btn => {
            btn.addEventListener('click', () => this.playBandaSample(btn));
        });
    }

    playBandaSample(btn) {
        const src = btn.dataset.src;
        if (!src) return;

        if (btn.classList.contains('playing')) {
            this.stopBandasAudio();
            return;
        }

        this.stopBandasAudio();

        const audio = new Audio(src);
        this.bandasAudio = audio;

        btn.classList.add('playing');
        btn.innerHTML = '<i class="fas fa-pause"></i>';

        audio.addEventListener('ended', () => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i>';
            this.bandasAudio = null;
        });

        audio.addEventListener('error', () => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i>';
            this.bandasAudio = null;
            this.showNotification(this.t('notifications.audioNotFound'), 'warning');
        });

        audio.play().catch(() => {
            btn.classList.remove('playing');
            btn.innerHTML = '<i class="fas fa-play"></i>';
            this.showNotification(this.t('notifications.sampleError'), 'warning');
        });
    }

    async loadBandas() {
        try {
            const response = await fetch('/api/bandas');
            const data = await response.json();
            this.bandasState.bandas = data.bandas || [];
            this.populateGenreFilter();
            this.renderBandasList();
        } catch (error) {
            console.error('Error cargando bandas:', error);
            const list = this.bandasModal?.querySelector('#bandasList');
            if (list) {
                list.innerHTML = `
                    <div class="bandas-empty">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${this.t('bandas.loadError')}</p>
                    </div>
                `;
            }
        }
    }

    populateGenreFilter() {
        const select = this.bandasModal?.querySelector('#bandasGenreSelect');
        if (!select) return;
        const generos = [...new Set(this.bandasState.bandas.map(b => b.genero))].sort();
        generos.forEach(genero => {
            const option = document.createElement('option');
            option.value = genero;
            option.textContent = genero;
            select.appendChild(option);
        });
    }

    getFilteredBandas() {
        const { bandas, searchQuery, genreFilter } = this.bandasState;
        const query = searchQuery.toLowerCase().trim();
        return bandas.filter(banda => {
            const matchGenre = !genreFilter || banda.genero === genreFilter;
            const matchName = !query ||
                banda.nombre.toLowerCase().includes(query) ||
                banda.genero.toLowerCase().includes(query);
            return matchGenre && matchName;
        });
    }

    formatPrice(centavos) {
        return new Intl.NumberFormat(window.I18n?.getLocale() || 'es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(centavos / 100);
    }

    updateBandasModalLabels() {
        if (!this.bandasModal) return;
        const m = this.bandasModal;
        const title = m.querySelector('.bandas-header-title h3');
        if (title) title.textContent = this.t('bandas.title');
        const steps = ['bandas.stepBand', 'bandas.stepProfile', 'bandas.stepDate', 'bandas.stepPay'];
        m.querySelectorAll('.bandas-step-label').forEach((el, i) => { el.textContent = this.t(steps[i]); });
        const search = m.querySelector('#bandasSearchInput');
        if (search) search.placeholder = this.t('bandas.searchPlaceholder');
        const genreOpt = m.querySelector('#bandasGenreSelect option');
        if (genreOpt) genreOpt.textContent = this.t('common.allGenres');
        m.querySelectorAll('.bandas-cal-legend span').forEach((el, i) => {
            el.innerHTML = `<span class="bandas-cal-legend-dot ${i === 0 ? 'available' : 'unavailable'}"></span> ${this.t(i === 0 ? 'common.available' : 'common.unavailable')}`;
        });
        const stripeBtn = m.querySelector('#bandasStripeBtn');
        if (stripeBtn && !stripeBtn.disabled) stripeBtn.innerHTML = `<i class="fab fa-stripe"></i> ${this.t('common.payStripe')}`;
        const note = m.querySelector('.bandas-stripe-note');
        if (note) note.innerHTML = `<i class="fas fa-lock"></i> ${this.t('common.paySecure')}`;
        const backBtn = m.querySelector('#bandasBackBtn');
        if (backBtn) backBtn.textContent = this.t('common.back');
        this.bandasGoToStep(this.bandasState.currentStep);
    }

    renderBandasList() {
        const list = this.bandasModal?.querySelector('#bandasList');
        if (!list) return;

        const filtered = this.getFilteredBandas();

        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="bandas-empty">
                    <i class="fas fa-music"></i>
                    <p>${this.t('bandas.notFound')}</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(banda => `
            <div class="banda-card ${this.bandasState.selectedBanda?.id === banda.id ? 'selected' : ''}" data-banda-id="${banda.id}">
                <div class="banda-card-icon"><i class="fas fa-music"></i></div>
                <div class="banda-card-info">
                    <div class="banda-card-name">${banda.nombre}</div>
                    <div class="banda-card-meta">
                        <span class="banda-card-genre">${banda.genero}</span>
                        <span class="banda-card-duration">${banda.duracion}</span>
                    </div>
                </div>
                <div class="banda-card-price">${this.formatPrice(banda.precio)}</div>
            </div>
        `).join('');

        list.querySelectorAll('.banda-card').forEach(card => {
            card.addEventListener('click', () => {
                const bandaId = card.dataset.bandaId;
                this.bandasState.selectedBanda = this.bandasState.bandas.find(b => b.id === bandaId);
                this.bandasState.selectedDate = null;
                this.renderBandasList();
                this.updateBandasFooter();
            });
        });
    }

    bandasGoToStep(step) {
        if (step < 1 || step > 4) return;
        if (step >= 2 && !this.bandasState.selectedBanda) return;
        if (step >= 4 && !this.bandasState.selectedDate) return;

        const prevStep = this.bandasState.currentStep;

        if (prevStep === 2 && step !== 2) {
            this.stopBandasAudio();
        }

        this.bandasState.currentStep = step;

        this.bandasModal.querySelectorAll('.bandas-step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.toggle('active', s === step);
            el.classList.toggle('done', s < step);
        });

        this.bandasModal.querySelectorAll('.bandas-panel').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.panel) === step);
        });

        const backBtn = this.bandasModal.querySelector('#bandasBackBtn');
        const nextBtn = this.bandasModal.querySelector('#bandasNextBtn');

        backBtn.style.display = step > 1 ? 'block' : 'none';

        if (step === 1) {
            nextBtn.textContent = this.t('common.continue');
            nextBtn.style.display = 'block';
        } else if (step === 2) {
            nextBtn.textContent = this.t('common.reserve');
            nextBtn.style.display = 'block';
            nextBtn.disabled = false;
            this.renderBandasProfile();
        } else if (step === 3) {
            nextBtn.textContent = this.t('common.continue');
            nextBtn.style.display = 'block';
            if (prevStep === 2) {
                this.bandasState.selectedDate = null;
            }
            this.renderBandasCalendar();
        } else if (step === 4) {
            nextBtn.style.display = 'none';
            this.renderBandasPayment();
        }

        this.updateBandasFooter();
    }

    updateBandasFooter() {
        const nextBtn = this.bandasModal?.querySelector('#bandasNextBtn');
        if (!nextBtn || this.bandasState.currentStep === 4) return;

        if (this.bandasState.currentStep === 1) {
            nextBtn.disabled = !this.bandasState.selectedBanda;
        } else if (this.bandasState.currentStep === 2) {
            nextBtn.disabled = false;
        } else if (this.bandasState.currentStep === 3) {
            nextBtn.disabled = !this.bandasState.selectedDate;
        }
    }

    renderBandasCalendar() {
        const banda = this.bandasState.selectedBanda;
        if (!banda) return;

        const info = this.bandasModal.querySelector('#bandasSelectedInfo');
        info.innerHTML = `
            <h4>${banda.nombre}</h4>
            <p>${banda.genero} · ${banda.duracion} · ${this.t('bandas.selectDate')}</p>
        `;

        const month = this.bandasState.calendarMonth;
        const monthNames = window.I18n.getMonthNames();
        const dayNames = window.I18n.getDayNames();

        this.bandasModal.querySelector('#bandasCalMonth').textContent =
            `${monthNames[month.getMonth()]} ${month.getFullYear()}`;

        const grid = this.bandasModal.querySelector('#bandasCalGrid');
        const year = month.getFullYear();
        const monthIdx = month.getMonth();
        const firstDay = new Date(year, monthIdx, 1).getDay();
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        const disponibles = new Set(banda.disponibilidad || []);

        let html = dayNames.map(d => `<div class="bandas-cal-day-name">${d}</div>`).join('');

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="bandas-cal-day empty"></div>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isAvailable = disponibles.has(dateStr);
            const isSelected = this.bandasState.selectedDate === dateStr;
            const classes = ['bandas-cal-day'];
            if (isAvailable) classes.push('available');
            if (isSelected) classes.push('selected');
            html += `<div class="${classes.join(' ')}" data-date="${isAvailable ? dateStr : ''}">${day}</div>`;
        }

        grid.innerHTML = html;

        grid.querySelectorAll('.bandas-cal-day.available').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                this.bandasState.selectedDate = dayEl.dataset.date;
                this.renderBandasCalendar();
                this.updateBandasFooter();
            });
        });
    }

    changeCalendarMonth(delta) {
        const current = this.bandasState.calendarMonth;
        this.bandasState.calendarMonth = new Date(current.getFullYear(), current.getMonth() + delta, 1);
        this.renderBandasCalendar();
    }

    renderBandasPayment() {
        const { selectedBanda, selectedDate } = this.bandasState;
        if (!selectedBanda || !selectedDate) return;

        const fechaFormateada = this.formatDate(selectedDate);

        this.bandasModal.querySelector('#bandasPaymentSummary').innerHTML = `
            <div class="bandas-payment-row">
                <span class="bandas-payment-label">${this.t('bandas.labelBand')}</span>
                <span class="bandas-payment-value">${selectedBanda.nombre}</span>
            </div>
            <div class="bandas-payment-row">
                <span class="bandas-payment-label">${this.t('bandas.labelGenre')}</span>
                <span class="bandas-payment-value">${selectedBanda.genero}</span>
            </div>
            <div class="bandas-payment-row">
                <span class="bandas-payment-label">${this.t('bandas.labelDuration')}</span>
                <span class="bandas-payment-value">${selectedBanda.duracion}</span>
            </div>
            <div class="bandas-payment-row">
                <span class="bandas-payment-label">${this.t('bandas.labelEventDate')}</span>
                <span class="bandas-payment-value">${fechaFormateada}</span>
            </div>
            <div class="bandas-payment-row bandas-payment-total">
                <span class="bandas-payment-label">${this.t('common.total')}</span>
                <span class="bandas-payment-value">${this.formatPrice(selectedBanda.precio)}</span>
            </div>
        `;

        this.bandasModal.querySelector('#bandasStripeBtn').disabled = false;
    }

    async processBandasPayment() {
        const { selectedBanda, selectedDate } = this.bandasState;
        if (!selectedBanda || !selectedDate) return;

        const btn = this.bandasModal.querySelector('#bandasStripeBtn');
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.t('common.processing')}`;

        try {
            const response = await fetch('/api/bandas/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bandaId: selectedBanda.id,
                    fecha: selectedDate
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || this.t('notifications.paymentSessionError'));
            }

            if (data.url) {
                sessionStorage.setItem('bandasReservaPendiente', JSON.stringify({
                    bandaId: selectedBanda.id,
                    fecha: selectedDate
                }));
                window.location.href = data.url;
            } else {
                throw new Error(this.t('notifications.paymentUrlError'));
            }
        } catch (error) {
            console.error('Error en pago:', error);
            this.showNotification(`❌ ${error.message}`, 'error');
            btn.disabled = false;
            btn.innerHTML = `<i class="fab fa-stripe"></i> ${this.t('common.payStripe')}`;
        }
    }

    checkPaymentResult() {
        const params = new URLSearchParams(window.location.search);
        const pago = params.get('pago');
        const tipo = params.get('tipo') || 'bandas';

        if (pago === 'ok') {
            const messages = {
                bandas: this.t('notifications.paymentOkBandas'),
                estudio: this.t('notifications.paymentOkEstudio'),
                clases: this.t('notifications.paymentOkClases')
            };
            sessionStorage.removeItem('bandasReservaPendiente');
            sessionStorage.removeItem('estudioReservaPendiente');
            sessionStorage.removeItem('clasesReservaPendiente');
            this.showNotification(messages[tipo] || messages.bandas, 'success');
            window.history.replaceState({}, '', window.location.pathname);
        } else if (pago === 'cancelado') {
            const bandasPending = sessionStorage.getItem('bandasReservaPendiente');
            if (bandasPending) {
                const { bandaId, fecha } = JSON.parse(bandasPending);
                fetch('/api/bandas/liberar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bandaId, fecha })
                }).catch(() => {});
                sessionStorage.removeItem('bandasReservaPendiente');
            }
            const estudioPending = sessionStorage.getItem('estudioReservaPendiente');
            if (estudioPending) {
                const { estudioId, fecha, hora } = JSON.parse(estudioPending);
                fetch('/api/estudios/liberar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estudioId, fecha, hora })
                }).catch(() => {});
                sessionStorage.removeItem('estudioReservaPendiente');
            }
            const clasesPending = sessionStorage.getItem('clasesReservaPendiente');
            if (clasesPending) {
                const { maestroId, planId } = JSON.parse(clasesPending);
                fetch('/api/clases/liberar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ maestroId, planId })
                }).catch(() => {});
                sessionStorage.removeItem('clasesReservaPendiente');
            }
            this.showNotification(this.t('notifications.paymentCancelled'), 'info');
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    // ─── Modal de Estudios ───────────────────────────────────────────

    updateEstudioModalLabels() {
        if (!this.estudioModal) return;
        const m = this.estudioModal;
        const title = m.querySelector('.estudio-header-title h3');
        if (title) title.textContent = this.t('estudio.title');
        const steps = ['estudio.stepStudio', 'estudio.stepDetail', 'estudio.stepDate', 'estudio.stepPay'];
        m.querySelectorAll('.estudio-step-label').forEach((el, i) => { el.textContent = this.t(steps[i]); });
        const search = m.querySelector('#estudioSearchInput');
        if (search) search.placeholder = this.t('estudio.searchPlaceholder');
        const tipoOpt = m.querySelector('#estudioTipoSelect option');
        if (tipoOpt) tipoOpt.textContent = this.t('common.allTypes');
        const timeTitle = m.querySelector('#estudioTimeSlots .estudio-section-title');
        if (timeTitle) timeTitle.innerHTML = `<i class="fas fa-clock"></i> ${this.t('estudio.availableSchedule')}`;
        const stripeBtn = m.querySelector('#estudioStripeBtn');
        if (stripeBtn && !stripeBtn.disabled) stripeBtn.innerHTML = `<i class="fab fa-stripe"></i> ${this.t('common.payStripe')}`;
        const note = m.querySelector('.estudio-stripe-note');
        if (note) note.innerHTML = `<i class="fas fa-lock"></i> ${this.t('common.paySecure')}`;
        const backBtn = m.querySelector('#estudioBackBtn');
        if (backBtn) backBtn.textContent = this.t('common.back');
        this.estudioGoToStep(this.estudioState.currentStep);
    }

    async openEstudioModal() {
        if (this.estudioModal) {
            this.closeEstudioModal();
            await new Promise(resolve => setTimeout(resolve, 320));
        }

        this.estudioState = {
            estudios: [],
            selectedEstudio: null,
            selectedDate: null,
            selectedHora: null,
            currentStep: 1,
            calendarMonth: new Date(),
            searchQuery: '',
            tipoFilter: ''
        };

        const modal = document.createElement('div');
        modal.className = 'estudio-modal-native';
        modal.innerHTML = `
            <div class="estudio-backdrop"></div>
            <div class="estudio-container">
                <div class="estudio-header">
                    <div class="estudio-header-title">
                        <i class="fas fa-microphone-alt"></i>
                        <h3>${this.t('estudio.title')}</h3>
                    </div>
                    <button class="estudio-close-btn">&times;</button>
                </div>
                <div class="estudio-steps">
                    <div class="estudio-step active" data-step="1">
                        <span class="estudio-step-num">1</span>
                        <span class="estudio-step-label">${this.t('estudio.stepStudio')}</span>
                    </div>
                    <div class="estudio-step" data-step="2">
                        <span class="estudio-step-num">2</span>
                        <span class="estudio-step-label">${this.t('estudio.stepDetail')}</span>
                    </div>
                    <div class="estudio-step" data-step="3">
                        <span class="estudio-step-num">3</span>
                        <span class="estudio-step-label">${this.t('estudio.stepDate')}</span>
                    </div>
                    <div class="estudio-step" data-step="4">
                        <span class="estudio-step-num">4</span>
                        <span class="estudio-step-label">${this.t('estudio.stepPay')}</span>
                    </div>
                </div>
                <div class="estudio-body">
                    <div class="estudio-panel active" data-panel="1">
                        <div class="estudio-search-bar">
                            <div class="estudio-search-input-wrap">
                                <i class="fas fa-search"></i>
                                <input type="text" class="estudio-search-input" placeholder="${this.t('estudio.searchPlaceholder')}" id="estudioSearchInput">
                            </div>
                            <select class="estudio-filter-select" id="estudioTipoSelect">
                                <option value="">${this.t('common.allTypes')}</option>
                            </select>
                        </div>
                        <div class="estudio-grid" id="estudioGrid">
                            <div class="estudio-loading"><i class="fas fa-spinner fa-spin"></i> ${this.t('estudio.loading')}</div>
                        </div>
                    </div>
                    <div class="estudio-panel" data-panel="2">
                        <div id="estudioProfileContent"></div>
                    </div>
                    <div class="estudio-panel" data-panel="3">
                        <div class="estudio-selected-info" id="estudioSelectedInfo"></div>
                        <div class="estudio-calendar-header">
                            <button class="estudio-cal-nav-btn" id="estudioCalPrev"><i class="fas fa-chevron-left"></i></button>
                            <span class="estudio-cal-month" id="estudioCalMonth"></span>
                            <button class="estudio-cal-nav-btn" id="estudioCalNext"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <div class="estudio-cal-grid" id="estudioCalGrid"></div>
                        <div class="estudio-time-slots" id="estudioTimeSlots" style="display:none">
                            <h4 class="estudio-section-title"><i class="fas fa-clock"></i> ${this.t('estudio.availableSchedule')}</h4>
                            <div class="estudio-time-grid" id="estudioTimeGrid"></div>
                        </div>
                    </div>
                    <div class="estudio-panel" data-panel="4">
                        <div class="estudio-payment-summary" id="estudioPaymentSummary"></div>
                        <button class="estudio-stripe-btn" id="estudioStripeBtn" disabled>
                            <i class="fab fa-stripe"></i> ${this.t('common.payStripe')}
                        </button>
                        <p class="estudio-stripe-note"><i class="fas fa-lock"></i> ${this.t('common.paySecure')}</p>
                    </div>
                </div>
                <div class="estudio-footer">
                    <button class="estudio-btn estudio-btn-secondary" id="estudioBackBtn" style="display:none">${this.t('common.back')}</button>
                    <button class="estudio-btn estudio-btn-primary" id="estudioNextBtn" disabled>${this.t('common.continue')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.estudioModal = modal;
        document.body.style.overflow = 'hidden';

        modal.querySelector('.estudio-close-btn').addEventListener('click', () => this.closeEstudioModal());
        modal.querySelector('.estudio-backdrop').addEventListener('click', () => this.closeEstudioModal());
        modal.querySelector('#estudioSearchInput').addEventListener('input', (e) => {
            this.estudioState.searchQuery = e.target.value;
            this.renderEstudioGrid();
        });
        modal.querySelector('#estudioTipoSelect').addEventListener('change', (e) => {
            this.estudioState.tipoFilter = e.target.value;
            this.renderEstudioGrid();
        });
        modal.querySelector('#estudioBackBtn').addEventListener('click', () => this.estudioGoToStep(this.estudioState.currentStep - 1));
        modal.querySelector('#estudioNextBtn').addEventListener('click', () => this.estudioGoToStep(this.estudioState.currentStep + 1));
        modal.querySelector('#estudioCalPrev').addEventListener('click', () => this.changeEstudioCalendarMonth(-1));
        modal.querySelector('#estudioCalNext').addEventListener('click', () => this.changeEstudioCalendarMonth(1));
        modal.querySelector('#estudioStripeBtn').addEventListener('click', () => this.processEstudioPayment());

        await this.loadEstudios();
        setTimeout(() => modal.classList.add('show'), 10);
    }

    closeEstudioModal() {
        if (!this.estudioModal) return;
        this.estudioModal.classList.remove('show');
        setTimeout(() => {
            this.estudioModal?.remove();
            this.estudioModal = null;
            this.releaseBodyScroll();
        }, 300);
    }

    async fetchEstudiosData() {
        const sources = [
            () => fetch('/api/estudios').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
            () => fetch('estudios.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
            () => Promise.resolve({ estudios: window.MOCK_DATA?.estudios || [] })
        ];
        for (const load of sources) {
            try {
                const data = await load();
                if (data.estudios?.length) return data.estudios;
            } catch (_) { /* siguiente fuente */ }
        }
        return [];
    }

    async loadEstudios() {
        try {
            this.estudioState.estudios = await this.fetchEstudiosData();
            if (!this.estudioState.estudios.length) throw new Error('Sin datos');
            this.populateEstudioTipoFilter();
            this.renderEstudioGrid();
        } catch (error) {
            console.warn('Estudios: usando datos mock embebidos', error);
            const grid = this.estudioModal?.querySelector('#estudioGrid');
            if (grid) {
                grid.innerHTML = `<div class="estudio-empty"><i class="fas fa-exclamation-triangle"></i><p>${this.t('estudio.loadError')}</p></div>`;
            }
        }
    }

    populateEstudioTipoFilter() {
        const select = this.estudioModal?.querySelector('#estudioTipoSelect');
        if (!select) return;
        const tipos = [...new Set(this.estudioState.estudios.map(e => e.tipo))].sort();
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo;
            option.textContent = tipo;
            select.appendChild(option);
        });
    }

    getFilteredEstudios() {
        const { estudios, searchQuery, tipoFilter } = this.estudioState;
        const query = searchQuery.toLowerCase().trim();
        return estudios.filter(e => {
            const matchTipo = !tipoFilter || e.tipo === tipoFilter;
            const matchName = !query || e.nombre.toLowerCase().includes(query) || e.tipo.toLowerCase().includes(query);
            return matchTipo && matchName;
        });
    }

    renderEstudioGrid() {
        const grid = this.estudioModal?.querySelector('#estudioGrid');
        if (!grid) return;
        const filtered = this.getFilteredEstudios();

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="estudio-empty"><i class="fas fa-microphone-slash"></i><p>${this.t('estudio.notFound')}</p></div>`;
            return;
        }

        grid.innerHTML = filtered.map(e => `
            <article class="estudio-card ${this.estudioState.selectedEstudio?.id === e.id ? 'selected' : ''}" data-estudio-id="${e.id}">
                <div class="estudio-card-img-wrap">
                    <img src="${e.imagen}" alt="${e.nombre}" loading="lazy">
                    <span class="estudio-card-badge">${e.tipo}</span>
                    <span class="estudio-card-price-tag">${this.formatPrice(e.precio)}${this.t('common.perHr')}</span>
                </div>
                <div class="estudio-card-body">
                    <div class="estudio-card-name">${e.nombre}</div>
                    <div class="estudio-card-meta">
                        <span><i class="fas fa-map-marker-alt"></i> ${e.ubicacion}</span>
                        <span class="estudio-card-stars">${this.renderStars(e.estrellas)}</span>
                    </div>
                </div>
            </article>
        `).join('');

        grid.querySelectorAll('.estudio-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.estudioId;
                this.estudioState.selectedEstudio = this.estudioState.estudios.find(e => e.id === id);
                this.estudioState.selectedDate = null;
                this.estudioState.selectedHora = null;
                this.renderEstudioGrid();
                this.updateEstudioFooter();
            });
        });
    }

    renderEstudioProfile() {
        const e = this.estudioState.selectedEstudio;
        const container = this.estudioModal?.querySelector('#estudioProfileContent');
        if (!e || !container) return;

        const equipamiento = (e.equipamiento || []).map(item =>
            `<span class="estudio-equip-tag">${item}</span>`
        ).join('');

        const galeria = (e.galeria || [e.imagen]).map((img, i) =>
            `<img src="${img}" alt="Galería ${i + 1}" class="${i === 0 ? 'active' : ''}" data-hero="${img}">`
        ).join('');

        container.innerHTML = `
            <div class="estudio-profile-hero" id="estudioHero">
                <img src="${e.imagen}" alt="${e.nombre}">
                <span class="estudio-hero-badge">${e.tipo}</span>
                <div class="estudio-profile-hero-overlay"><h2>${e.nombre}</h2></div>
            </div>
            <div class="estudio-gallery">${galeria}</div>
            <p class="estudio-profile-desc">${e.descripcion}</p>
            <div class="estudio-profile-meta">
                <span class="estudio-meta-chip"><i class="fas fa-clock"></i> ${this.t('common.min')} ${e.duracionMinima}</span>
                <span class="estudio-meta-chip"><i class="fas fa-users"></i> ${e.capacidad}</span>
                <span class="estudio-meta-chip"><i class="fas fa-map-marker-alt"></i> ${e.ubicacion}</span>
                <span class="estudio-meta-chip"><i class="fas fa-tag"></i> ${this.formatPrice(e.precio)}${this.t('common.perHour')}</span>
            </div>
            <h4 class="estudio-section-title"><i class="fas fa-sliders-h"></i> ${this.t('estudio.equipment')}</h4>
            <div class="estudio-equip-list">${equipamiento}</div>
            <button class="estudio-reserve-btn" id="estudioReserveInlineBtn">
                <i class="fas fa-calendar-check"></i> ${this.t('estudio.reserveStudio')}
            </button>
        `;

        container.querySelectorAll('.estudio-gallery img').forEach(img => {
            img.addEventListener('click', () => {
                container.querySelectorAll('.estudio-gallery img').forEach(i => i.classList.remove('active'));
                img.classList.add('active');
                container.querySelector('#estudioHero img').src = img.dataset.hero;
            });
        });

        container.querySelector('#estudioReserveInlineBtn')?.addEventListener('click', () => {
            this.estudioGoToStep(3);
        });
    }

    estudioGoToStep(step) {
        if (step < 1 || step > 4) return;
        if (step >= 2 && !this.estudioState.selectedEstudio) return;
        if (step >= 4 && (!this.estudioState.selectedDate || !this.estudioState.selectedHora)) return;

        const prevStep = this.estudioState.currentStep;
        this.estudioState.currentStep = step;

        this.estudioModal.querySelectorAll('.estudio-step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.toggle('active', s === step);
            el.classList.toggle('done', s < step);
        });

        this.estudioModal.querySelectorAll('.estudio-panel').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.panel) === step);
        });

        const backBtn = this.estudioModal.querySelector('#estudioBackBtn');
        const nextBtn = this.estudioModal.querySelector('#estudioNextBtn');
        backBtn.style.display = step > 1 ? 'block' : 'none';

        if (step === 1) {
            nextBtn.textContent = this.t('common.continue');
            nextBtn.style.display = 'block';
        } else if (step === 2) {
            nextBtn.textContent = this.t('common.reserve');
            nextBtn.style.display = 'block';
            nextBtn.disabled = false;
            this.renderEstudioProfile();
        } else if (step === 3) {
            nextBtn.textContent = this.t('common.continue');
            nextBtn.style.display = 'block';
            if (prevStep === 2) {
                this.estudioState.selectedDate = null;
                this.estudioState.selectedHora = null;
            }
            this.renderEstudioCalendar();
        } else if (step === 4) {
            nextBtn.style.display = 'none';
            this.renderEstudioPayment();
        }

        this.updateEstudioFooter();
    }

    updateEstudioFooter() {
        const nextBtn = this.estudioModal?.querySelector('#estudioNextBtn');
        if (!nextBtn || this.estudioState.currentStep === 4) return;

        if (this.estudioState.currentStep === 1) {
            nextBtn.disabled = !this.estudioState.selectedEstudio;
        } else if (this.estudioState.currentStep === 2) {
            nextBtn.disabled = false;
        } else if (this.estudioState.currentStep === 3) {
            nextBtn.disabled = !this.estudioState.selectedDate || !this.estudioState.selectedHora;
        }
    }

    renderEstudioCalendar() {
        const e = this.estudioState.selectedEstudio;
        if (!e) return;

        this.estudioModal.querySelector('#estudioSelectedInfo').innerHTML = `
            <h4>${e.nombre}</h4>
            <p>${e.tipo} · ${e.duracionMinima} · ${this.t('estudio.selectDateTime')}</p>
        `;

        const month = this.estudioState.calendarMonth;
        const monthNames = window.I18n.getMonthNames();
        const dayNames = window.I18n.getDayNames();

        this.estudioModal.querySelector('#estudioCalMonth').textContent =
            `${monthNames[month.getMonth()]} ${month.getFullYear()}`;

        const grid = this.estudioModal.querySelector('#estudioCalGrid');
        const year = month.getFullYear();
        const monthIdx = month.getMonth();
        const firstDay = new Date(year, monthIdx, 1).getDay();
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        const disponibles = new Set(e.disponibilidad || []);

        let html = dayNames.map(d => `<div class="estudio-cal-day-name">${d}</div>`).join('');
        for (let i = 0; i < firstDay; i++) html += '<div class="estudio-cal-day"></div>';

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isAvailable = disponibles.has(dateStr);
            const isSelected = this.estudioState.selectedDate === dateStr;
            const classes = ['estudio-cal-day'];
            if (isAvailable) classes.push('available');
            if (isSelected) classes.push('selected');
            html += `<div class="${classes.join(' ')}" data-date="${isAvailable ? dateStr : ''}">${day}</div>`;
        }

        grid.innerHTML = html;

        grid.querySelectorAll('.estudio-cal-day.available').forEach(dayEl => {
            dayEl.addEventListener('click', () => {
                this.estudioState.selectedDate = dayEl.dataset.date;
                this.estudioState.selectedHora = null;
                this.renderEstudioCalendar();
                this.updateEstudioFooter();
            });
        });

        this.renderEstudioTimeSlots();
    }

    renderEstudioTimeSlots() {
        const e = this.estudioState.selectedEstudio;
        const slotsContainer = this.estudioModal?.querySelector('#estudioTimeSlots');
        const timeGrid = this.estudioModal?.querySelector('#estudioTimeGrid');
        if (!e || !slotsContainer || !timeGrid) return;

        if (!this.estudioState.selectedDate) {
            slotsContainer.style.display = 'none';
            return;
        }

        slotsContainer.style.display = 'block';
        const horarios = e.horarios || [];

        timeGrid.innerHTML = horarios.map(hora => `
            <button class="estudio-time-slot ${this.estudioState.selectedHora === hora ? 'selected' : ''}" data-hora="${hora}">${hora}</button>
        `).join('');

        timeGrid.querySelectorAll('.estudio-time-slot').forEach(btn => {
            btn.addEventListener('click', () => {
                this.estudioState.selectedHora = btn.dataset.hora;
                this.renderEstudioTimeSlots();
                this.updateEstudioFooter();
            });
        });
    }

    changeEstudioCalendarMonth(delta) {
        const current = this.estudioState.calendarMonth;
        this.estudioState.calendarMonth = new Date(current.getFullYear(), current.getMonth() + delta, 1);
        this.renderEstudioCalendar();
    }

    renderEstudioPayment() {
        const { selectedEstudio, selectedDate, selectedHora } = this.estudioState;
        if (!selectedEstudio || !selectedDate || !selectedHora) return;

        const fechaFormateada = this.formatDate(selectedDate);

        this.estudioModal.querySelector('#estudioPaymentSummary').innerHTML = `
            <div class="estudio-payment-row">
                <span class="estudio-payment-label">${this.t('estudio.labelStudio')}</span>
                <span class="estudio-payment-value">${selectedEstudio.nombre}</span>
            </div>
            <div class="estudio-payment-row">
                <span class="estudio-payment-label">${this.t('estudio.labelType')}</span>
                <span class="estudio-payment-value">${selectedEstudio.tipo}</span>
            </div>
            <div class="estudio-payment-row">
                <span class="estudio-payment-label">${this.t('estudio.labelDate')}</span>
                <span class="estudio-payment-value">${fechaFormateada}</span>
            </div>
            <div class="estudio-payment-row">
                <span class="estudio-payment-label">${this.t('estudio.labelSchedule')}</span>
                <span class="estudio-payment-value">${selectedHora}</span>
            </div>
            <div class="estudio-payment-row">
                <span class="estudio-payment-label">${this.t('estudio.labelMinDuration')}</span>
                <span class="estudio-payment-value">${selectedEstudio.duracionMinima}</span>
            </div>
            <div class="estudio-payment-row estudio-payment-total">
                <span class="estudio-payment-label">${this.t('common.total')}</span>
                <span class="estudio-payment-value">${this.formatPrice(selectedEstudio.precio)}</span>
            </div>
        `;

        this.estudioModal.querySelector('#estudioStripeBtn').disabled = false;
    }

    async processEstudioPayment() {
        const { selectedEstudio, selectedDate, selectedHora } = this.estudioState;
        if (!selectedEstudio || !selectedDate || !selectedHora) return;

        const btn = this.estudioModal.querySelector('#estudioStripeBtn');
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.t('common.processing')}`;

        try {
            const response = await fetch('/api/estudios/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estudioId: selectedEstudio.id, fecha: selectedDate, hora: selectedHora })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || this.t('notifications.paymentSessionError'));
            if (data.url) {
                sessionStorage.setItem('estudioReservaPendiente', JSON.stringify({
                    estudioId: selectedEstudio.id, fecha: selectedDate, hora: selectedHora
                }));
                window.location.href = data.url;
            } else {
                throw new Error(this.t('notifications.paymentUrlError'));
            }
        } catch (error) {
            this.showNotification(`❌ ${error.message}`, 'error');
            btn.disabled = false;
            btn.innerHTML = `<i class="fab fa-stripe"></i> ${this.t('common.payStripe')}`;
        }
    }

    // ─── Modal de Clases ─────────────────────────────────────────────

    updateClasesModalLabels() {
        if (!this.clasesModal) return;
        const m = this.clasesModal;
        const title = m.querySelector('.clases-header-title h3');
        if (title) title.textContent = this.t('clases.title');
        const steps = ['clases.stepTeacher', 'clases.stepProfile', 'clases.stepPlan', 'clases.stepPay'];
        m.querySelectorAll('.clases-step-label').forEach((el, i) => { el.textContent = this.t(steps[i]); });
        const search = m.querySelector('#clasesSearchInput');
        if (search) search.placeholder = this.t('clases.searchPlaceholder');
        const instOpt = m.querySelector('#clasesInstrumentoSelect option');
        if (instOpt) instOpt.textContent = this.t('common.all');
        const stripeBtn = m.querySelector('#clasesStripeBtn');
        if (stripeBtn && !stripeBtn.disabled) stripeBtn.innerHTML = `<i class="fab fa-stripe"></i> ${this.t('common.payStripe')}`;
        const note = m.querySelector('.clases-stripe-note');
        if (note) note.innerHTML = `<i class="fas fa-lock"></i> ${this.t('common.paySecure')}`;
        const backBtn = m.querySelector('#clasesBackBtn');
        if (backBtn) backBtn.textContent = this.t('common.back');
        this.clasesGoToStep(this.clasesState.currentStep);
    }

    async openClasesModal() {
        if (this.clasesModal) {
            this.closeClasesModal();
            await new Promise(resolve => setTimeout(resolve, 320));
        }

        this.clasesState = {
            maestros: [],
            selectedMaestro: null,
            selectedPlan: null,
            currentStep: 1,
            searchQuery: '',
            instrumentoFilter: ''
        };

        const modal = document.createElement('div');
        modal.className = 'clases-modal-native';
        modal.innerHTML = `
            <div class="clases-backdrop"></div>
            <div class="clases-container">
                <div class="clases-header">
                    <div class="clases-header-title">
                        <i class="fas fa-chalkboard-teacher"></i>
                        <h3>${this.t('clases.title')}</h3>
                    </div>
                    <button class="clases-close-btn">&times;</button>
                </div>
                <div class="clases-steps">
                    <div class="clases-step active" data-step="1">
                        <span class="clases-step-num">1</span>
                        <span class="clases-step-label">${this.t('clases.stepTeacher')}</span>
                    </div>
                    <div class="clases-step" data-step="2">
                        <span class="clases-step-num">2</span>
                        <span class="clases-step-label">${this.t('clases.stepProfile')}</span>
                    </div>
                    <div class="clases-step" data-step="3">
                        <span class="clases-step-num">3</span>
                        <span class="clases-step-label">${this.t('clases.stepPlan')}</span>
                    </div>
                    <div class="clases-step" data-step="4">
                        <span class="clases-step-num">4</span>
                        <span class="clases-step-label">${this.t('clases.stepPay')}</span>
                    </div>
                </div>
                <div class="clases-body">
                    <div class="clases-panel active" data-panel="1">
                        <div class="clases-search-bar">
                            <div class="clases-search-input-wrap">
                                <i class="fas fa-search"></i>
                                <input type="text" class="clases-search-input" placeholder="${this.t('clases.searchPlaceholder')}" id="clasesSearchInput">
                            </div>
                            <select class="clases-filter-select" id="clasesInstrumentoSelect">
                                <option value="">${this.t('common.all')}</option>
                            </select>
                        </div>
                        <div class="clases-grid" id="clasesGrid">
                            <div class="clases-loading"><i class="fas fa-spinner fa-spin"></i> ${this.t('clases.loading')}</div>
                        </div>
                    </div>
                    <div class="clases-panel" data-panel="2">
                        <div id="clasesProfileContent"></div>
                    </div>
                    <div class="clases-panel" data-panel="3">
                        <div class="clases-selected-info" id="clasesSelectedInfo"></div>
                        <div class="clases-plans-grid" id="clasesPlansGrid"></div>
                    </div>
                    <div class="clases-panel" data-panel="4">
                        <div class="clases-payment-summary" id="clasesPaymentSummary"></div>
                        <button class="clases-stripe-btn" id="clasesStripeBtn" disabled>
                            <i class="fab fa-stripe"></i> ${this.t('common.payStripe')}
                        </button>
                        <p class="clases-stripe-note"><i class="fas fa-lock"></i> ${this.t('common.paySecure')}</p>
                    </div>
                </div>
                <div class="clases-footer">
                    <button class="clases-btn clases-btn-secondary" id="clasesBackBtn" style="display:none">${this.t('common.back')}</button>
                    <button class="clases-btn clases-btn-primary" id="clasesNextBtn" disabled>${this.t('common.continue')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.clasesModal = modal;
        document.body.style.overflow = 'hidden';

        modal.querySelector('.clases-close-btn').addEventListener('click', () => this.closeClasesModal());
        modal.querySelector('.clases-backdrop').addEventListener('click', () => this.closeClasesModal());
        modal.querySelector('#clasesSearchInput').addEventListener('input', (e) => {
            this.clasesState.searchQuery = e.target.value;
            this.renderClasesGrid();
        });
        modal.querySelector('#clasesInstrumentoSelect').addEventListener('change', (e) => {
            this.clasesState.instrumentoFilter = e.target.value;
            this.renderClasesGrid();
        });
        modal.querySelector('#clasesBackBtn').addEventListener('click', () => this.clasesGoToStep(this.clasesState.currentStep - 1));
        modal.querySelector('#clasesNextBtn').addEventListener('click', () => this.clasesGoToStep(this.clasesState.currentStep + 1));
        modal.querySelector('#clasesStripeBtn').addEventListener('click', () => this.processClasesPayment());

        await this.loadClases();
        setTimeout(() => modal.classList.add('show'), 10);
    }

    closeClasesModal() {
        if (!this.clasesModal) return;
        this.clasesModal.classList.remove('show');
        setTimeout(() => {
            this.clasesModal?.remove();
            this.clasesModal = null;
            this.releaseBodyScroll();
        }, 300);
    }

    async fetchClasesData() {
        const sources = [
            () => fetch('/api/clases').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
            () => fetch('clases.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
            () => Promise.resolve({ maestros: window.MOCK_DATA?.maestros || [] })
        ];
        for (const load of sources) {
            try {
                const data = await load();
                if (data.maestros?.length) return data.maestros;
            } catch (_) { /* siguiente fuente */ }
        }
        return [];
    }

    async loadClases() {
        try {
            this.clasesState.maestros = await this.fetchClasesData();
            if (!this.clasesState.maestros.length) throw new Error('Sin datos');
            this.populateClasesInstrumentoFilter();
            this.renderClasesGrid();
        } catch (error) {
            console.warn('Clases: usando datos mock embebidos', error);
            const grid = this.clasesModal?.querySelector('#clasesGrid');
            if (grid) {
                grid.innerHTML = `<div class="clases-empty"><i class="fas fa-exclamation-triangle"></i><p>${this.t('clases.loadError')}</p></div>`;
            }
        }
    }

    populateClasesInstrumentoFilter() {
        const select = this.clasesModal?.querySelector('#clasesInstrumentoSelect');
        if (!select) return;
        const instrumentos = [...new Set(this.clasesState.maestros.map(m => m.instrumento))].sort();
        instrumentos.forEach(inst => {
            const option = document.createElement('option');
            option.value = inst;
            option.textContent = inst;
            select.appendChild(option);
        });
    }

    getFilteredMaestros() {
        const { maestros, searchQuery, instrumentoFilter } = this.clasesState;
        const query = searchQuery.toLowerCase().trim();
        return maestros.filter(m => {
            const matchInst = !instrumentoFilter || m.instrumento === instrumentoFilter;
            const matchName = !query ||
                m.nombre.toLowerCase().includes(query) ||
                m.instrumento.toLowerCase().includes(query) ||
                m.genero.toLowerCase().includes(query);
            return matchInst && matchName;
        });
    }

    renderClasesGrid() {
        const grid = this.clasesModal?.querySelector('#clasesGrid');
        if (!grid) return;
        const filtered = this.getFilteredMaestros();

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="clases-empty"><i class="fas fa-user-slash"></i><p>${this.t('clases.notFound')}</p></div>`;
            return;
        }

        grid.innerHTML = filtered.map(m => {
            const precioMin = Math.min(...(m.planes || []).map(p => p.precio));
            return `
            <article class="maestro-card ${this.clasesState.selectedMaestro?.id === m.id ? 'selected' : ''}" data-maestro-id="${m.id}">
                <div class="maestro-card-img-wrap">
                    <img src="${m.imagen}" alt="${m.nombre}" loading="lazy">
                    <span class="maestro-card-badge">${m.instrumento}</span>
                </div>
                <div class="maestro-card-body">
                    <div class="maestro-card-name">${m.nombre}</div>
                    <div class="maestro-card-meta">
                        <span class="maestro-card-stars">${this.renderStars(m.estrellas)} ${(m.estrellas).toFixed(1)}</span>
                        <span class="maestro-card-price">${this.t('common.from')} ${this.formatPrice(precioMin)}</span>
                    </div>
                </div>
            </article>
        `}).join('');

        grid.querySelectorAll('.maestro-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.maestroId;
                this.clasesState.selectedMaestro = this.clasesState.maestros.find(m => m.id === id);
                this.clasesState.selectedPlan = null;
                this.renderClasesGrid();
                this.updateClasesFooter();
            });
        });
    }

    renderClasesProfile() {
        const m = this.clasesState.selectedMaestro;
        const container = this.clasesModal?.querySelector('#clasesProfileContent');
        if (!m || !container) return;

        const niveles = (m.niveles || []).map(n => `<span class="maestro-nivel-tag">${n}</span>`).join('');
        const modalidad = (m.modalidad || []).map(mod =>
            `<span class="maestro-modalidad-tag"><i class="fas fa-${window.I18n.isOnlineModality(mod) ? 'video' : 'map-marker-alt'}"></i> ${window.I18n.translateModality(mod)}</span>`
        ).join('');

        container.innerHTML = `
            <div class="maestro-profile-header">
                <div class="maestro-profile-photo">
                    <img src="${m.imagen}" alt="${m.nombre}">
                </div>
                <div class="maestro-profile-info">
                    <h2 class="maestro-profile-name">${m.nombre}</h2>
                    <span class="maestro-profile-instrument">${m.instrumento} · ${m.genero}</span>
                    <div class="maestro-profile-rating">
                        <span class="maestro-stars">${this.renderStars(m.estrellas)}</span>
                        <span class="maestro-rating-num">${m.estrellas.toFixed(1)}</span>
                    </div>
                </div>
            </div>
            <p class="maestro-profile-desc">${m.descripcion}</p>
            <div class="maestro-stats">
                <div class="maestro-stat">
                    <span class="maestro-stat-value">${m.experiencia}</span>
                    <span class="maestro-stat-label">${this.t('clases.experience')}</span>
                </div>
                <div class="maestro-stat">
                    <span class="maestro-stat-value">${m.alumnos}+</span>
                    <span class="maestro-stat-label">${this.t('clases.students')}</span>
                </div>
                <div class="maestro-stat">
                    <span class="maestro-stat-value"><i class="fas fa-clock"></i></span>
                    <span class="maestro-stat-label">${m.horarios}</span>
                </div>
            </div>
            <h4 class="clases-section-title"><i class="fas fa-layer-group"></i> ${this.t('clases.levels')}</h4>
            <div class="maestro-niveles">${niveles}</div>
            <h4 class="clases-section-title"><i class="fas fa-laptop-house"></i> ${this.t('clases.modality')}</h4>
            <div class="maestro-modalidad">${modalidad}</div>
            <button class="clases-inscribe-btn" id="clasesInscribeInlineBtn">
                <i class="fas fa-graduation-cap"></i> ${this.t('clases.choosePlanBtn')}
            </button>
        `;

        container.querySelector('#clasesInscribeInlineBtn')?.addEventListener('click', () => {
            this.clasesGoToStep(3);
        });
    }

    clasesGoToStep(step) {
        if (step < 1 || step > 4) return;
        if (step >= 2 && !this.clasesState.selectedMaestro) return;
        if (step >= 4 && !this.clasesState.selectedPlan) return;

        const prevStep = this.clasesState.currentStep;
        this.clasesState.currentStep = step;

        this.clasesModal.querySelectorAll('.clases-step').forEach(el => {
            const s = parseInt(el.dataset.step);
            el.classList.toggle('active', s === step);
            el.classList.toggle('done', s < step);
        });

        this.clasesModal.querySelectorAll('.clases-panel').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.panel) === step);
        });

        const backBtn = this.clasesModal.querySelector('#clasesBackBtn');
        const nextBtn = this.clasesModal.querySelector('#clasesNextBtn');
        backBtn.style.display = step > 1 ? 'block' : 'none';

        if (step === 1) {
            nextBtn.textContent = this.t('common.continue');
            nextBtn.style.display = 'block';
        } else if (step === 2) {
            nextBtn.textContent = this.t('common.choosePlan');
            nextBtn.style.display = 'block';
            nextBtn.disabled = false;
            this.renderClasesProfile();
        } else if (step === 3) {
            nextBtn.textContent = this.t('common.continue');
            nextBtn.style.display = 'block';
            if (prevStep === 2) this.clasesState.selectedPlan = null;
            this.renderClasesPlans();
        } else if (step === 4) {
            nextBtn.style.display = 'none';
            this.renderClasesPayment();
        }

        this.updateClasesFooter();
    }

    updateClasesFooter() {
        const nextBtn = this.clasesModal?.querySelector('#clasesNextBtn');
        if (!nextBtn || this.clasesState.currentStep === 4) return;

        if (this.clasesState.currentStep === 1) {
            nextBtn.disabled = !this.clasesState.selectedMaestro;
        } else if (this.clasesState.currentStep === 2) {
            nextBtn.disabled = false;
        } else if (this.clasesState.currentStep === 3) {
            nextBtn.disabled = !this.clasesState.selectedPlan;
        }
    }

    renderClasesPlans() {
        const m = this.clasesState.selectedMaestro;
        if (!m) return;

        this.clasesModal.querySelector('#clasesSelectedInfo').innerHTML = `
            <h4>${m.nombre}</h4>
            <p>${m.instrumento} · ${this.t('clases.chooseMonthly')}</p>
        `;

        const plansGrid = this.clasesModal.querySelector('#clasesPlansGrid');
        plansGrid.innerHTML = (m.planes || []).map(plan => `
            <div class="clases-plan-card ${this.clasesState.selectedPlan?.id === plan.id ? 'selected' : ''}" data-plan-id="${plan.id}">
                <div class="clases-plan-icon"><i class="fas fa-calendar-alt"></i></div>
                <div class="clases-plan-info">
                    <div class="clases-plan-name">${plan.nombre}</div>
                    <div class="clases-plan-desc">${plan.descripcion}</div>
                </div>
                <div class="clases-plan-price">${this.formatPrice(plan.precio)}</div>
            </div>
        `).join('');

        plansGrid.querySelectorAll('.clases-plan-card').forEach(card => {
            card.addEventListener('click', () => {
                const planId = card.dataset.planId;
                this.clasesState.selectedPlan = (m.planes || []).find(p => p.id === planId);
                this.renderClasesPlans();
                this.updateClasesFooter();
            });
        });
    }

    renderClasesPayment() {
        const { selectedMaestro, selectedPlan } = this.clasesState;
        if (!selectedMaestro || !selectedPlan) return;

        this.clasesModal.querySelector('#clasesPaymentSummary').innerHTML = `
            <div class="clases-payment-row">
                <span class="clases-payment-label">${this.t('clases.labelTeacher')}</span>
                <span class="clases-payment-value">${selectedMaestro.nombre}</span>
            </div>
            <div class="clases-payment-row">
                <span class="clases-payment-label">${this.t('clases.labelInstrument')}</span>
                <span class="clases-payment-value">${selectedMaestro.instrumento}</span>
            </div>
            <div class="clases-payment-row">
                <span class="clases-payment-label">${this.t('clases.labelPlan')}</span>
                <span class="clases-payment-value">${selectedPlan.nombre}</span>
            </div>
            <div class="clases-payment-row">
                <span class="clases-payment-label">${this.t('clases.labelSchedules')}</span>
                <span class="clases-payment-value">${selectedMaestro.horarios}</span>
            </div>
            <div class="clases-payment-row">
                <span class="clases-payment-label">${this.t('clases.labelModality')}</span>
                <span class="clases-payment-value">${(selectedMaestro.modalidad || []).map(mod => window.I18n.translateModality(mod)).join(', ')}</span>
            </div>
            <div class="clases-payment-row clases-payment-total">
                <span class="clases-payment-label">${this.t('clases.labelMonthlyTotal')}</span>
                <span class="clases-payment-value">${this.formatPrice(selectedPlan.precio)}</span>
            </div>
        `;

        this.clasesModal.querySelector('#clasesStripeBtn').disabled = false;
    }

    async processClasesPayment() {
        const { selectedMaestro, selectedPlan } = this.clasesState;
        if (!selectedMaestro || !selectedPlan) return;

        const btn = this.clasesModal.querySelector('#clasesStripeBtn');
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.t('common.processing')}`;

        try {
            const response = await fetch('/api/clases/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maestroId: selectedMaestro.id, planId: selectedPlan.id })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || this.t('notifications.paymentSessionError'));
            if (data.url) {
                sessionStorage.setItem('clasesReservaPendiente', JSON.stringify({
                    maestroId: selectedMaestro.id, planId: selectedPlan.id
                }));
                window.location.href = data.url;
            } else {
                throw new Error(this.t('notifications.paymentUrlError'));
            }
        } catch (error) {
            this.showNotification(`❌ ${error.message}`, 'error');
            btn.disabled = false;
            btn.innerHTML = `<i class="fab fa-stripe"></i> ${this.t('common.payStripe')}`;
        }
    }

    handleHeroInteraction(e) {
        const interaction = e.currentTarget.dataset.interaction;
        
        switch (interaction) {
            case 'listen':
                this.togglePlay();
                break;
            case 'products':
                window.location.href = 'productos.html';
                break;
        }
    }

    initGuiaPlatform() {
        const section = document.getElementById('guia');
        if (!section) return;

        section.querySelectorAll('.guia-tab').forEach(tab => {
            bindTap(tab, () => this.setGuiaRole(tab.dataset.guiaRole));
        });

        section.querySelectorAll('.guia-step').forEach(step => {
            bindTap(step, () => this.setGuiaStep(parseInt(step.dataset.step, 10)));
        });

        bindTap(document.getElementById('guiaCtaPrimary'), () => {
            this.handleGuiaCta(this.guiaContent[this.guiaState.role].ctaPrimary.action);
        });

        bindTap(document.getElementById('guiaCtaSecondary'), () => {
            this.handleGuiaCta(this.guiaContent[this.guiaState.role].ctaSecondary.action);
        });

        this.updateGuiaStepsUI();
        this.renderGuiaPreview(false);
        this.updateGuiaCTAs();

        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateGuiaStats();
                    statsObserver.disconnect();
                }
            });
        }, { threshold: 0.3 });

        section.querySelectorAll('.guia-stat-num').forEach(el => statsObserver.observe(el));

        const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
        if (!isTouchDevice) {
            this.guiaAutoTimer = setInterval(() => {
                if (!section.matches(':hover') && !document.hidden) {
                    const next = this.guiaState.step >= 4 ? 1 : this.guiaState.step + 1;
                    this.setGuiaStep(next);
                }
            }, 6000);
        }
    }

    setGuiaRole(role) {
        if (this.guiaState.role === role) return;
        this.guiaState.role = role;
        this.guiaState.step = 1;

        document.querySelectorAll('.guia-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.guiaRole === role);
        });

        const preview = document.getElementById('guiaPreview');
        preview?.classList.remove('role-banda', 'role-bar');
        preview?.classList.add(role === 'banda' ? 'role-banda' : 'role-bar');

        this.updateGuiaStepsUI();
        this.renderGuiaPreview(true);
        this.updateGuiaCTAs();
    }

    setGuiaStep(step) {
        if (step < 1 || step > 4) return;
        this.guiaState.step = step;
        this.updateGuiaStepsUI();
        this.renderGuiaPreview(true);
    }

    updateGuiaStepsUI() {
        const { role, step } = this.guiaState;
        const content = this.guiaContent[role];

        document.querySelectorAll('.guia-step').forEach(el => {
            const s = parseInt(el.dataset.step, 10);
            el.classList.toggle('active', s === step);
            el.classList.toggle('completed', s < step);

            const stepData = content.steps[s - 1];
            if (stepData) {
                el.querySelector('h4').textContent = stepData.title;
                el.querySelector('p').textContent = stepData.desc;
            }
        });

        const fill = document.getElementById('guiaStepLineFill');
        if (fill) {
            fill.style.height = step <= 1 ? '0%' : `${((step - 1) / 3) * 100}%`;
        }
    }

    renderGuiaPreview(animate) {
        const { role, step } = this.guiaState;
        const data = this.guiaContent[role].previews[step - 1];
        const preview = document.getElementById('guiaPreview');
        if (!data || !preview) return;

        const applyContent = () => {
            const tag = document.getElementById('guiaPreviewTag');
            const title = document.getElementById('guiaPreviewTitle');
            const desc = document.getElementById('guiaPreviewDesc');
            const benefits = document.getElementById('guiaPreviewBenefits');
            const potentialLead = document.getElementById('guiaPotentialLead');
            const potential = document.getElementById('guiaPotentialValue');
            const potentialLabel = document.getElementById('guiaPotentialLabel');
            const potentialHint = document.getElementById('guiaPotentialHint');

            if (tag) tag.textContent = data.tag;
            if (title) title.textContent = data.title;
            if (desc) desc.textContent = data.desc;

            if (potentialLead) {
                potentialLead.textContent = data.potentialLead || '';
                potentialLead.style.display = data.potentialLead ? 'inline' : 'none';
            }
            if (potential) potential.textContent = data.potential;
            if (potentialLabel) {
                potentialLabel.textContent = data.potentialLabel || '';
                potentialLabel.style.display = data.potentialLabel ? 'block' : 'none';
            }
            if (potentialHint) {
                potentialHint.textContent = data.potentialHint || '';
                potentialHint.style.display = data.potentialHint ? 'block' : 'none';
            }

            if (benefits) {
                benefits.innerHTML = data.benefits.map(b =>
                    `<span class="guia-benefit-pill"><i class="fas fa-check"></i> ${b}</span>`
                ).join('');
            }

            const commissionEl = document.getElementById('guiaCommissionNote');
            const commissionRate = document.getElementById('guiaCommissionRate');
            const commissionTitle = document.getElementById('guiaCommissionTitle');
            const commissionBody = document.getElementById('guiaCommissionBody');
            const commissionExample = document.getElementById('guiaCommissionExample');
            const potentialWrap = document.getElementById('guiaPreviewPotential');

            if (commissionEl) {
                if (step === 4 && data.commission) {
                    commissionEl.hidden = false;
                    if (commissionRate) commissionRate.textContent = data.commission.rate;
                    if (commissionTitle) commissionTitle.textContent = data.commission.title;
                    if (commissionBody) commissionBody.textContent = data.commission.body;
                    if (commissionExample) {
                        commissionExample.textContent = data.commission.example || '';
                        commissionExample.style.display = data.commission.example ? 'block' : 'none';
                    }
                } else {
                    commissionEl.hidden = true;
                }
            }

            if (potentialWrap) {
                potentialWrap.classList.toggle('has-commission', step === 4 && !!data.commission);
            }

            preview.classList.remove('fade-swap');
        };

        if (animate) {
            preview.classList.add('fade-swap');
            setTimeout(applyContent, 180);
        } else {
            preview.classList.add(role === 'banda' ? 'role-banda' : 'role-bar');
            applyContent();
        }
    }

    updateGuiaCTAs() {
        const { role } = this.guiaState;
        const { ctaPrimary, ctaSecondary } = this.guiaContent[role];
        const primary = document.getElementById('guiaCtaPrimary');
        const secondary = document.getElementById('guiaCtaSecondary');

        if (primary) {
            primary.innerHTML = `<i class="fas ${ctaPrimary.icon}"></i><span>${ctaPrimary.text}</span>`;
        }
        if (secondary) {
            secondary.innerHTML = `<i class="fas ${ctaSecondary.icon}"></i><span>${ctaSecondary.text}</span>`;
        }
    }

    animateGuiaStats() {
        document.querySelectorAll('.guia-stat-num').forEach(el => {
            const target = parseInt(el.dataset.count, 10);
            const duration = 1400;
            const start = performance.now();

            const tick = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                el.textContent = Math.round(target * eased);
                if (progress < 1) requestAnimationFrame(tick);
            };

            requestAnimationFrame(tick);
        });
    }

    handleConectaAction(action) {
        switch (action) {
            case 'bandas':
                this.openRegistroBandaModal();
                break;
            case 'bares':
                this.openRegistroBarModal();
                break;
        }
    }

    handleVerMapa() {
        this.openMapaModal();
    }

    hideMapaFloatPreview() {
        document.getElementById('mapaFloatPreview')?.classList.add('is-hidden');
    }

    showMapaFloatPreview() {
        const el = document.getElementById('mapaFloatPreview');
        if (!el) return;
        el.classList.remove('is-hidden');
        setTimeout(() => this.mapaFloatMap?.invalidateSize(), 120);
    }

    async initMapaFloatPreview() {
        const preview = document.getElementById('mapaFloatPreview');
        const mapEl = document.getElementById('mapaFloatLeaflet');
        if (!preview || !mapEl || typeof L === 'undefined') return;

        bindTap(preview, () => this.openMapaModal());

        const { bandas, bares } = await this.loadMapaData();
        if (!bandas.length && !bares.length) {
            preview.hidden = true;
            return;
        }

        const map = L.map(mapEl, {
            center: [25.428, -100.988],
            zoom: 12,
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            boxZoom: false,
            keyboard: false
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        bares.forEach(bar => {
            if (bar.lat == null || bar.lng == null) return;
            L.circleMarker([bar.lat, bar.lng], {
                radius: 4,
                color: '#00FF88',
                fillColor: '#00FF88',
                fillOpacity: 0.9,
                weight: 1
            }).addTo(map);
        });

        bandas.forEach(banda => {
            const coords = this.getBandaCoords(banda, bares);
            L.circleMarker([coords.lat, coords.lng], {
                radius: 4,
                color: '#00D4FF',
                fillColor: '#00D4FF',
                fillOpacity: 0.9,
                weight: 1
            }).addTo(map);

            const venueName = banda.lugares?.[0];
            const bar = bares.find(b => b.nombre === venueName);
            if (bar?.lat != null && bar?.lng != null) {
                L.polyline([[coords.lat, coords.lng], [bar.lat, bar.lng]], {
                    color: 'rgba(0, 212, 255, 0.35)',
                    weight: 1.5,
                    opacity: 0.7
                }).addTo(map);
            }
        });

        this.mapaFloatMap = map;
        setTimeout(() => map.invalidateSize(), 150);
    }

    updateMapaModalLabels() {
        if (!this.mapaModal) return;
        const m = this.mapaModal;
        const h3 = m.querySelector('.mapa-header-title h3');
        const sub = m.querySelector('.mapa-header-title span');
        if (h3) h3.textContent = this.t('mapa.title');
        if (sub) sub.textContent = this.t('mapa.subtitle');
        const filters = { bandas: 'mapa.showBands', bares: 'mapa.showBars' };
        m.querySelectorAll('.mapa-filter-btn[data-filter]').forEach(btn => {
            btn.title = this.t(filters[btn.dataset.filter]);
            const label = btn.querySelector('span');
            if (label) label.textContent = this.t(btn.dataset.filter === 'bandas' ? 'mapa.legendBands' : 'mapa.legendBars');
        });
        const topBtn = m.querySelector('[data-action="topten"]');
        if (topBtn) {
            topBtn.title = this.t('mapa.topTen');
            const label = topBtn.querySelector('span');
            if (label) label.textContent = this.t('mapa.topTen');
        }
        const loading = m.querySelector('#mapaLoading span');
        if (loading) loading.textContent = this.t('mapa.loading');
        m.querySelectorAll('.mapa-legend-item').forEach((el, i) => {
            el.innerHTML = `<span class="mapa-legend-dot ${i === 0 ? 'banda' : 'bar'}"></span> ${this.t(i === 0 ? 'mapa.legendBands' : 'mapa.legendBars')}`;
        });
        const empty = m.querySelector('.mapa-sidebar-empty p');
        if (empty) empty.textContent = this.t('mapa.sidebarEmpty');
        if (this.mapaState.selected) {
            const { type, data } = this.mapaState.selected;
            if (type === 'banda') this.renderMapaBandaDetail(data);
            else this.renderMapaBarDetail(data);
        }
    }

    updateTopTenModalLabels() {
        if (!this.topTenModal) return;
        const year = new Date().getFullYear();
        const h3 = this.topTenModal.querySelector('.topten-header-title h3');
        const sub = this.topTenModal.querySelector('.topten-header-title span');
        if (h3) h3.textContent = this.t('topten.title', { year });
        if (sub) sub.textContent = this.t('topten.subtitle');
        const heads = this.topTenModal.querySelectorAll('.topten-column-head h4');
        if (heads[0]) heads[0].textContent = this.t('topten.topBands');
        if (heads[1]) heads[1].textContent = this.t('topten.topBars');
        this.topTenModal.querySelectorAll('.topten-item').forEach(item => {
            const stats = item.querySelector('.topten-stats');
            if (!stats) return;
            const isBanda = item.classList.contains('topten-item-banda');
            const star = stats.textContent.match(/[\d.]+/)?.[0] || '';
            const count = stats.textContent.match(/\d+/)?.[0] || '';
            const label = isBanda ? this.t('common.events') : this.t('common.bandsCount');
            stats.innerHTML = `<i class="fas fa-star"></i> ${star} · ${count} ${label}`;
        });
    }

    async openMapaModal() {
        if (this.mapaModal) {
            this.closeMapaModal();
            await new Promise(resolve => setTimeout(resolve, 320));
        }

        this.mapaState = {
            map: null,
            bandas: [],
            bares: [],
            bandaMarkers: [],
            barMarkers: [],
            connectionLines: [],
            selected: null,
            filters: { bandas: true, bares: true },
            layers: { bandas: null, bares: null, lines: null }
        };

        const modal = document.createElement('div');
        modal.className = 'mapa-modal-native';
        modal.innerHTML = `
            <div class="mapa-backdrop"></div>
            <div class="mapa-container">
                <div class="mapa-header">
                    <div class="mapa-header-title">
                        <i class="fas fa-map-marked-alt"></i>
                        <div>
                            <h3>${this.t('mapa.title')}</h3>
                            <span>${this.t('mapa.subtitle')}</span>
                        </div>
                    </div>
                    <div class="mapa-header-controls">
                        <button class="mapa-filter-btn active" data-filter="bandas" title="${this.t('mapa.showBands')}">
                            <i class="fas fa-guitar"></i><span>${this.t('mapa.legendBands')}</span>
                        </button>
                        <button class="mapa-filter-btn active" data-filter="bares" title="${this.t('mapa.showBars')}">
                            <i class="fas fa-cocktail"></i><span>${this.t('mapa.legendBars')}</span>
                        </button>
                        <button class="mapa-filter-btn mapa-topten-btn" data-action="topten" title="${this.t('mapa.topTen')}">
                            <i class="fas fa-trophy"></i><span>${this.t('mapa.topTen')}</span>
                        </button>
                        <button class="mapa-close-btn">&times;</button>
                    </div>
                </div>
                <div class="mapa-body">
                    <div class="mapa-map-wrap">
                        <div class="mapa-loading" id="mapaLoading">
                            <i class="fas fa-spinner"></i>
                            <span>${this.t('mapa.loading')}</span>
                        </div>
                        <div id="mapaLeaflet"></div>
                        <div class="mapa-legend">
                            <div class="mapa-legend-item">
                                <span class="mapa-legend-dot banda"></span> ${this.t('mapa.legendBands')}
                            </div>
                            <div class="mapa-legend-item">
                                <span class="mapa-legend-dot bar"></span> ${this.t('mapa.legendBars')}
                            </div>
                        </div>
                    </div>
                    <aside class="mapa-sidebar" id="mapaSidebar">
                        <div class="mapa-sidebar-empty">
                            <i class="fas fa-hand-pointer"></i>
                            <p>${this.t('mapa.sidebarEmpty')}</p>
                        </div>
                    </aside>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.mapaModal = modal;
        document.body.style.overflow = 'hidden';
        this.hideMapaFloatPreview();

        modal.querySelector('.mapa-close-btn').addEventListener('click', () => this.closeMapaModal());
        modal.querySelector('.mapa-backdrop').addEventListener('click', () => this.closeMapaModal());

        modal.querySelectorAll('.mapa-filter-btn[data-filter]').forEach(btn => {
            btn.addEventListener('click', () => this.toggleMapaFilter(btn.dataset.filter));
        });
        modal.querySelector('[data-action="topten"]')?.addEventListener('click', () => this.openTopTenModal());

        requestAnimationFrame(() => {
            modal.classList.add('show');
            setTimeout(() => this.initMapa(), 80);
        });
    }

    closeMapaModal() {
        if (!this.mapaModal) return;
        this.destroyMapa();
        this.mapaModal.classList.remove('show');
        setTimeout(() => {
            this.mapaModal?.remove();
            this.mapaModal = null;
            this.releaseBodyScroll();
            this.showMapaFloatPreview();
        }, 300);
    }

    destroyMapa() {
        const { map } = this.mapaState;
        if (map) {
            map.remove();
            this.mapaState.map = null;
        }
    }

    async loadMapaData() {
        let bandas = [];
        let bares = [];

        try {
            const [bandasRes, baresRes] = await Promise.all([
                fetch('/api/bandas'),
                fetch('/api/bares')
            ]);
            if (bandasRes.ok) {
                const data = await bandasRes.json();
                bandas = data.bandas || [];
            }
            if (baresRes.ok) {
                const data = await baresRes.json();
                bares = data.bares || [];
            }
        } catch (error) {
            console.warn('API no disponible, usando datos locales:', error);
        }

        if (!bandas.length) {
            try {
                const res = await fetch('bandas.json');
                if (res.ok) {
                    const data = await res.json();
                    bandas = data.bandas || [];
                }
            } catch (_) { /* ignore */ }
        }

        if (!bares.length) {
            try {
                const res = await fetch('bares.json');
                if (res.ok) {
                    const data = await res.json();
                    bares = data.bares || [];
                }
            } catch (_) { /* ignore */ }
        }

        if (!bares.length && window.MOCK_DATA?.bares) {
            bares = window.MOCK_DATA.bares;
        }

        return { bandas, bares };
    }

    getBandaCoords(banda, bares) {
        const venueName = banda.lugares?.[0];
        const bar = bares.find(b => b.nombre === venueName);
        const base = bar || { lat: 25.4232, lng: -100.9923 };
        const offset = this.getMarkerOffset(banda.id);
        return { lat: base.lat + offset.lat, lng: base.lng + offset.lng };
    }

    getMarkerOffset(id) {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = id.charCodeAt(i) + ((hash << 5) - hash);
        }
        return {
            lat: ((hash % 100) - 50) * 0.00006,
            lng: (((hash >> 8) % 100) - 50) * 0.00006
        };
    }

    extractFirstTime(horario) {
        if (!horario) return '';
        const match = String(horario).match(/\d{1,2}:\d{2}/);
        return match ? match[0] : horario;
    }

    getBarMusicaHoyInfo(bar, connectedBandas = []) {
        if (!bar?.musicaHoy) return null;
        const banda = bar.bandaHoy
            || [...connectedBandas].sort((a, b) => (b.estrellas || 0) - (a.estrellas || 0))[0]?.nombre
            || '';
        const horario = bar.horarioHoy || this.extractFirstTime(bar.horarioMusica) || '';
        return { banda, horario };
    }

    renderMusicaHoyBadge(bar, connectedBandas = []) {
        const info = this.getBarMusicaHoyInfo(bar, connectedBandas);
        if (!info) return '';
        return `
            <span class="mapa-detail-badge mapa-live-badge">
                <span class="mapa-live-dot" aria-hidden="true"></span>
                <span class="mapa-live-badge-body">
                    <span class="mapa-live-badge-label">${this.t('common.musicToday')}</span>
                    ${info.banda || info.horario ? `
                        <span class="mapa-live-badge-show">
                            ${info.banda ? `<span class="mapa-live-band"><i class="fas fa-guitar" aria-hidden="true"></i>${info.banda}</span>` : ''}
                            ${info.horario ? `<span class="mapa-live-time"><i class="far fa-clock" aria-hidden="true"></i>${info.horario}</span>` : ''}
                        </span>
                    ` : ''}
                </span>
            </span>
        `;
    }

    createMapaIcon(type) {
        const isBanda = type === 'banda';
        return L.divIcon({
            className: 'mapa-marker-wrap',
            html: `<div class="mapa-marker ${isBanda ? 'mapa-marker-banda' : 'mapa-marker-bar'}">
                <i class="fas fa-${isBanda ? 'guitar' : 'cocktail'}"></i>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, isBanda ? 36 : 17]
        });
    }

    async initMapa() {
        if (!this.mapaModal || typeof L === 'undefined') {
            this.showNotification(this.t('notifications.leafletUnavailable'), 'error');
            return;
        }

        const loading = this.mapaModal.querySelector('#mapaLoading');
        const { bandas, bares } = await this.loadMapaData();

        this.mapaState.bandas = bandas;
        this.mapaState.bares = bares;

        if (!bandas.length && !bares.length) {
            if (loading) {
                loading.innerHTML = `<i class="fas fa-exclamation-triangle"></i><span>${this.t('mapa.noData')}</span>`;
            }
            return;
        }

        const map = L.map('mapaLeaflet', {
            center: [25.428, -100.988],
            zoom: 14,
            zoomControl: true,
            attributionControl: true
        });

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        this.mapaState.map = map;
        this.mapaState.layers.bandas = L.layerGroup().addTo(map);
        this.mapaState.layers.bares = L.layerGroup().addTo(map);
        this.mapaState.layers.lines = L.layerGroup().addTo(map);

        this.renderMapaMarkers();

        if (loading) loading.remove();
        setTimeout(() => map.invalidateSize(), 150);
    }

    renderMapaMarkers() {
        const { map, bandas, bares, filters, layers } = this.mapaState;
        if (!map) return;

        layers.bandas.clearLayers();
        layers.bares.clearLayers();
        layers.lines.clearLayers();
        this.mapaState.bandaMarkers = [];
        this.mapaState.barMarkers = [];
        this.mapaState.connectionLines = [];

        if (filters.bares) {
            bares.forEach(bar => {
                const marker = L.marker([bar.lat, bar.lng], {
                    icon: this.createMapaIcon('bar')
                });

                marker.bindPopup(`
                    <div class="mapa-popup-type">${bar.tipo}</div>
                    <div class="mapa-popup-title">${bar.nombre}</div>
                    ${bar.musicaHoy ? this.t('common.musicTodayShort') : ''}
                `);

                marker.on('click', () => this.selectMapaItem('bar', bar, marker));
                marker.addTo(layers.bares);
                this.mapaState.barMarkers.push({ marker, data: bar });
            });
        }

        if (filters.bandas) {
            bandas.forEach(banda => {
                const coords = this.getBandaCoords(banda, bares);
                const marker = L.marker([coords.lat, coords.lng], {
                    icon: this.createMapaIcon('banda')
                });

                marker.bindPopup(`
                    <div class="mapa-popup-type">${banda.genero}</div>
                    <div class="mapa-popup-title">${banda.nombre}</div>
                    ${this.formatPrice(banda.precio)}
                `);

                marker.on('click', () => this.selectMapaItem('banda', banda, marker));
                marker.addTo(layers.bandas);
                this.mapaState.bandaMarkers.push({ marker, data: banda, coords });
            });
        }

    }

    renderMapaConnections() {
        const { bandas, bares, layers } = this.mapaState;

        bandas.forEach(banda => {
            const bandaCoords = this.getBandaCoords(banda, bares);
            (banda.lugares || []).forEach(lugar => {
                const bar = bares.find(b => b.nombre === lugar);
                if (!bar) return;

                const line = L.polyline(
                    [[bandaCoords.lat, bandaCoords.lng], [bar.lat, bar.lng]],
                    {
                        color: 'rgba(0, 212, 255, 0.35)',
                        weight: 2,
                        dashArray: '6 8',
                        opacity: 0.7
                    }
                );
                line.addTo(layers.lines);
                this.mapaState.connectionLines.push(line);
            });
        });
    }

    selectMapaItem(type, data, marker) {
        this.mapaState.selected = { type, data };

        this.mapaState.bandaMarkers.forEach(({ marker: m }) => {
            m.getElement()?.querySelector('.mapa-marker')?.classList.remove('selected');
        });
        this.mapaState.barMarkers.forEach(({ marker: m }) => {
            m.getElement()?.querySelector('.mapa-marker')?.classList.remove('selected');
        });

        marker.getElement()?.querySelector('.mapa-marker')?.classList.add('selected');

        if (type === 'banda') {
            this.renderMapaBandaDetail(data);
            this.highlightBandaConnections(data);
        } else {
            this.renderMapaBarDetail(data);
            this.highlightBarConnections(data);
        }

        this.mapaState.map?.panTo(marker.getLatLng(), { animate: true });
    }

    highlightBandaConnections(banda) {
        const { bares, layers } = this.mapaState;
        layers.lines.clearLayers();

        const bandaCoords = this.getBandaCoords(banda, bares);
        (banda.lugares || []).forEach(lugar => {
            const bar = bares.find(b => b.nombre === lugar);
            if (!bar) return;
            L.polyline(
                [[bandaCoords.lat, bandaCoords.lng], [bar.lat, bar.lng]],
                { color: 'rgba(139, 92, 246, 0.7)', weight: 3, dashArray: '4 6' }
            ).addTo(layers.lines);
        });
    }

    highlightBarConnections(bar) {
        const { bandas, bares, layers } = this.mapaState;
        layers.lines.clearLayers();

        const connectedBandas = bandas.filter(b =>
            (b.lugares || []).includes(bar.nombre)
        );

        connectedBandas.forEach(banda => {
            const coords = this.getBandaCoords(banda, bares);
            L.polyline(
                [[coords.lat, coords.lng], [bar.lat, bar.lng]],
                { color: 'rgba(0, 255, 136, 0.65)', weight: 3, dashArray: '4 6' }
            ).addTo(layers.lines);
        });
    }

    renderMapaBandaDetail(banda) {
        const sidebar = this.mapaModal?.querySelector('#mapaSidebar');
        if (!sidebar) return;

        const connectedBars = this.mapaState.bares.filter(bar =>
            (banda.lugares || []).includes(bar.nombre)
        );

        sidebar.innerHTML = `
            <div class="mapa-sidebar-content">
                <img class="mapa-detail-img" src="${banda.imagen || ''}" alt="${banda.nombre}"
                     onerror="this.src='https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80'">
                <span class="mapa-detail-badge banda"><i class="fas fa-guitar"></i> ${this.t('mapa.localBand')}</span>
                <h4 class="mapa-detail-name">${banda.nombre}</h4>
                <div class="mapa-detail-meta">
                    <span><i class="fas fa-music"></i> ${banda.genero}</span>
                    <span><i class="fas fa-star"></i> ${(banda.estrellas || 0).toFixed(1)}</span>
                    <span><i class="fas fa-tag"></i> ${this.formatPrice(banda.precio)}</span>
                    <span><i class="fas fa-clock"></i> ${banda.duracion}</span>
                </div>
                <p class="mapa-detail-desc">${banda.descripcion}</p>
                ${connectedBars.length ? `
                    <div class="mapa-detail-section">
                        <div class="mapa-detail-section-title">${this.t('mapa.playedAt')}</div>
                        <div class="mapa-connection-list">
                            ${connectedBars.map(bar => `
                                <button class="mapa-connection-item bar-link" data-bar-id="${bar.id}">
                                    <i class="fas fa-cocktail"></i>
                                    <span>${bar.nombre}</span>
                                    ${bar.musicaHoy ? `<small>${this.t('common.musicTodayLive')}</small>` : ''}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <button class="mapa-reserve-btn mapa-reserve-btn-banda" id="mapaReserveBanda">
                    <i class="fas fa-calendar-check"></i> ${this.t('mapa.reserveBand')}
                </button>
            </div>
        `;

        sidebar.querySelector('#mapaReserveBanda')?.addEventListener('click', () => {
            this.closeMapaModal();
            setTimeout(() => this.openBandasModal(banda.id), 350);
        });

        sidebar.querySelectorAll('[data-bar-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const bar = this.mapaState.bares.find(b => b.id === btn.dataset.barId);
                const entry = this.mapaState.barMarkers.find(m => m.data.id === bar?.id);
                if (bar && entry) this.selectMapaItem('bar', bar, entry.marker);
            });
        });
    }

    renderMapaBarDetail(bar) {
        const sidebar = this.mapaModal?.querySelector('#mapaSidebar');
        if (!sidebar) return;

        const connectedBandas = this.mapaState.bandas.filter(b =>
            (b.lugares || []).includes(bar.nombre)
        );

        sidebar.innerHTML = `
            <div class="mapa-sidebar-content">
                <img class="mapa-detail-img" src="${bar.imagen || ''}" alt="${bar.nombre}"
                     onerror="this.src='https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80'">
                <div class="mapa-detail-badges">
                    <span class="mapa-detail-badge bar"><i class="fas fa-cocktail"></i> ${bar.tipo}</span>
                    ${this.renderMusicaHoyBadge(bar, connectedBandas)}
                </div>
                <h4 class="mapa-detail-name">${bar.nombre}</h4>
                <div class="mapa-detail-meta">
                    <span><i class="fas fa-star"></i> ${bar.estrellas}</span>
                    <span><i class="fas fa-users"></i> ${bar.capacidad} ${this.t('common.people')}</span>
                    <span><i class="fas fa-clock"></i> ${bar.horarioMusica}</span>
                </div>
                <p class="mapa-detail-desc">${bar.descripcion}</p>
                <p class="mapa-detail-desc"><i class="fas fa-map-marker-alt" style="color:var(--neon-blue);margin-right:6px"></i>${bar.direccion}</p>
                ${connectedBandas.length ? `
                    <div class="mapa-detail-section">
                        <div class="mapa-detail-section-title">${this.t('mapa.bandsPlayedHere')}</div>
                        <div class="mapa-connection-list">
                            ${connectedBandas.map(b => `
                                <button class="mapa-connection-item" data-banda-id="${b.id}">
                                    <i class="fas fa-guitar"></i>
                                    <span>${b.nombre}</span>
                                    <small>${b.genero}</small>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="mapa-detail-section">
                        <p class="mapa-detail-desc">${this.t('mapa.noBandsVenue')}</p>
                    </div>
                `}
                <button class="mapa-reserve-btn mapa-reserve-btn-bar" id="mapaReserveBar">
                    <i class="fas fa-link"></i> ${this.t('mapa.reserveBandForBar')}
                </button>
            </div>
        `;

        sidebar.querySelector('#mapaReserveBar')?.addEventListener('click', () => {
            this.closeMapaModal();
            setTimeout(() => this.openBandasModal(), 350);
        });

        sidebar.querySelectorAll('[data-banda-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const banda = this.mapaState.bandas.find(b => b.id === btn.dataset.bandaId);
                const entry = this.mapaState.bandaMarkers.find(m => m.data.id === banda?.id);
                if (banda && entry) this.selectMapaItem('banda', banda, entry.marker);
            });
        });
    }

    computeTopTen(bandas, bares) {
        const topBandas = [...bandas]
            .map(banda => {
                const venues = banda.lugares?.length || 0;
                const muestras = banda.canciones?.length || 0;
                const eventosAnuales = venues * 14 + muestras * 6 + Math.round((banda.estrellas || 0) * 10);
                return {
                    ...banda,
                    eventosAnuales,
                    score: (banda.estrellas || 0) * 100 + venues * 18 + muestras * 8 + eventosAnuales * 0.5
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        const topBares = [...bares]
            .map(bar => {
                const bandasConectadas = bandas.filter(b =>
                    (b.lugares || []).includes(bar.nombre)
                ).length;
                const eventosAnuales = bandasConectadas * 16 + (bar.musicaHoy ? 12 : 0) + Math.round((bar.estrellas || 0) * 8);
                return {
                    ...bar,
                    bandasConectadas,
                    eventosAnuales,
                    score: (bar.estrellas || 0) * 100 + bandasConectadas * 22 + eventosAnuales * 0.4
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        return { topBandas, topBares };
    }

    renderTopTenRankItem(item, rank, type) {
        const isBanda = type === 'banda';
        const rankClass = rank <= 3 ? `topten-rank-${rank}` : '';
        const imgFallback = isBanda
            ? 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&q=80'
            : 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=200&q=80';
        const subtitle = isBanda ? item.genero : item.tipo;
        const statLabel = isBanda
            ? `${item.eventosAnuales} ${this.t('common.events')}`
            : `${item.bandasConectadas} ${this.t('common.bandsCount')}`;
        const stars = typeof item.estrellas === 'number'
            ? item.estrellas.toFixed(1)
            : item.estrellas;

        return `
            <button class="topten-item ${isBanda ? 'topten-item-banda' : 'topten-item-bar'}"
                    data-topten-type="${type}" data-topten-id="${item.id}">
                <span class="topten-rank ${rankClass}">${rank}</span>
                <img class="topten-thumb" src="${item.imagen || imgFallback}" alt="${item.nombre}"
                     onerror="this.src='${imgFallback}'">
                <div class="topten-info">
                    <span class="topten-name">${item.nombre}</span>
                    <span class="topten-sub">${subtitle}</span>
                    <span class="topten-stats">
                        <i class="fas fa-star"></i> ${stars}
                        · ${statLabel}
                    </span>
                </div>
                <i class="fas fa-chevron-right topten-arrow"></i>
            </button>
        `;
    }

    async openTopTenModal() {
        if (this.topTenModal) {
            this.closeTopTenModal();
            await new Promise(resolve => setTimeout(resolve, 280));
        }

        let bandas = this.mapaState.bandas;
        let bares = this.mapaState.bares;

        if (!bandas.length || !bares.length) {
            const data = await this.loadMapaData();
            bandas = data.bandas;
            bares = data.bares;
        }

        const { topBandas, topBares } = this.computeTopTen(bandas, bares);
        const year = new Date().getFullYear();

        const modal = document.createElement('div');
        modal.className = 'topten-modal-native';
        modal.innerHTML = `
            <div class="topten-backdrop"></div>
            <div class="topten-container">
                <div class="topten-header">
                    <div class="topten-header-title">
                        <div class="topten-trophy"><i class="fas fa-trophy"></i></div>
                        <div>
                            <h3>${this.t('topten.title', { year })}</h3>
                            <span>${this.t('topten.subtitle')}</span>
                        </div>
                    </div>
                    <button class="topten-close-btn">&times;</button>
                </div>
                <div class="topten-body">
                    <section class="topten-column">
                        <div class="topten-column-head">
                            <i class="fas fa-guitar"></i>
                            <h4>${this.t('topten.topBands')}</h4>
                        </div>
                        <div class="topten-list" id="toptenBandasList">
                            ${topBandas.map((b, i) => this.renderTopTenRankItem(b, i + 1, 'banda')).join('')}
                        </div>
                    </section>
                    <section class="topten-column">
                        <div class="topten-column-head">
                            <i class="fas fa-cocktail"></i>
                            <h4>${this.t('topten.topBars')}</h4>
                        </div>
                        <div class="topten-list" id="toptenBaresList">
                            ${topBares.map((b, i) => this.renderTopTenRankItem(b, i + 1, 'bar')).join('')}
                        </div>
                    </section>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.topTenModal = modal;
        document.body.style.overflow = 'hidden';

        modal.querySelector('.topten-close-btn').addEventListener('click', () => this.closeTopTenModal());
        modal.querySelector('.topten-backdrop').addEventListener('click', () => this.closeTopTenModal());

        modal.querySelectorAll('.topten-item').forEach(item => {
            item.addEventListener('click', () => {
                this.handleTopTenItemClick(item.dataset.toptenType, item.dataset.toptenId);
            });
        });

        requestAnimationFrame(() => modal.classList.add('show'));
    }

    closeTopTenModal() {
        if (!this.topTenModal) return;
        this.topTenModal.classList.remove('show');
        setTimeout(() => {
            this.topTenModal?.remove();
            this.topTenModal = null;
            this.releaseBodyScroll();
        }, 300);
    }

    handleTopTenItemClick(type, id) {
        this.closeTopTenModal();

        setTimeout(async () => {
            if (type === 'banda') {
                this.openBandasModal(id);
                return;
            }

            if (this.mapaModal && this.mapaState.map) {
                const bar = this.mapaState.bares.find(b => b.id === id);
                const entry = this.mapaState.barMarkers.find(m => m.data.id === id);
                if (bar && entry) {
                    this.selectMapaItem('bar', bar, entry.marker);
                    return;
                }
            }

            await this.openMapaModal();
            setTimeout(() => {
                const bar = this.mapaState.bares.find(b => b.id === id);
                const entry = this.mapaState.barMarkers.find(m => m.data.id === id);
                if (bar && entry) this.selectMapaItem('bar', bar, entry.marker);
            }, 500);
        }, 320);
    }

    toggleMapaFilter(filter) {
        const btn = this.mapaModal?.querySelector(`[data-filter="${filter}"]`);
        if (!btn) return;

        this.mapaState.filters[filter] = !this.mapaState.filters[filter];
        btn.classList.toggle('active', this.mapaState.filters[filter]);

        if (!this.mapaState.filters.bandas && !this.mapaState.filters.bares) {
            this.mapaState.filters[filter] = true;
            btn.classList.add('active');
            this.showNotification(this.t('mapa.filterWarning'), 'warning');
            return;
        }

        this.renderMapaMarkers();

        if (this.mapaState.selected) {
            const { type, data } = this.mapaState.selected;
            const markers = type === 'banda' ? this.mapaState.bandaMarkers : this.mapaState.barMarkers;
            const entry = markers.find(m => m.data.id === data.id);
            if (entry) {
                entry.marker.getElement()?.querySelector('.mapa-marker')?.classList.add('selected');
                if (type === 'banda') this.highlightBandaConnections(data);
                else this.highlightBarConnections(data);
            }
        }
    }

    handleRadioCardAction(action, bandaId) {
        switch (action) {
            case 'play':
                this.togglePlay();
                break;
            case 'bandas':
                this.openBandasModal();
                break;
            case 'banda':
                if (bandaId) {
                    window.location.href = `banda.html?banda=${encodeURIComponent(bandaId)}`;
                } else {
                    this.openBandasModal();
                }
                break;
            case 'estudio':
                this.openEstudioModal();
                break;
            case 'clases':
                this.openClasesModal();
                break;
            case 'shazam':
                this.startShazam();
                break;
        }
    }

    updateRadioLiveBar() {
        const playBtn = document.getElementById('radioLivePlayBtn');
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying
                ? '<i class="fas fa-pause"></i>'
                : '<i class="fas fa-play"></i>';
        }
    }

    setNowPlaying(track) {
        if (!track?.title || !track?.artist) return;
        this.nowPlaying = { title: track.title, artist: track.artist };
        this.updateNowPlayingUI();
        this.syncShazamUI();
    }

    updateNowPlayingUI() {
        const titleEl = document.getElementById('mobileNowTitle');
        const artistEl = document.getElementById('mobileNowArtist');
        const desktopTitle = document.getElementById('desktopNowTitle');
        const desktopArtist = document.getElementById('desktopNowArtist');
        const trackEl = document.getElementById('radioNowTrack');
        const playerEl = document.getElementById('mobileHeaderPlayer');
        const headerPlayer = document.getElementById('headerPlayer');

        let title;
        let artist;

        if (this.nowPlaying) {
            title = this.nowPlaying.title;
            artist = this.nowPlaying.artist;
        } else if (this.isPlaying) {
            title = this.t('radio.mobileIdleTitle');
            artist = this.t('radio.mobileLive');
        } else {
            title = this.t('radio.mobileIdleTitle');
            artist = this.t('radio.mobileTapPlay');
        }

        [titleEl, desktopTitle].forEach((el) => {
            if (el) el.textContent = title;
        });
        [artistEl, desktopArtist].forEach((el) => {
            if (el) el.textContent = artist;
        });
        if (trackEl) {
            trackEl.textContent = this.nowPlaying
                ? `${title} — ${artist}`
                : this.t('radio.nowTrack');
        }
        if (playerEl) {
            playerEl.classList.toggle('is-playing', this.isPlaying);
            playerEl.classList.toggle('has-track', !!this.nowPlaying);
        }
        if (headerPlayer) {
            headerPlayer.classList.toggle('is-playing', this.isPlaying);
            headerPlayer.classList.toggle('has-track', !!this.nowPlaying);
        }
    }

    setNowPlayingArtistLabel(text) {
        const artistEls = [
            document.getElementById('mobileNowArtist'),
            document.getElementById('desktopNowArtist')
        ].filter(Boolean);
        artistEls.forEach((el) => {
            el.textContent = text;
        });
    }

    async fetchNowPlayingMetadata() {
        if (!this.isPlaying || this.nowPlaying || this._nowPlayingFetch) return;

        this._nowPlayingFetch = true;
        const prevArtist = this.isPlaying && !this.nowPlaying
            ? this.t('radio.mobileLive')
            : this.t('radio.mobileTapPlay');

        if (!this.nowPlaying) {
            this.setNowPlayingArtistLabel(this.t('radio.mobileIdentifying'));
        }

        try {
            const result = await this.recognizeViaAPIUrl();
            if (result?.title && result?.artist && this.isPlaying && !this.nowPlaying) {
                this.setNowPlaying(result);
            } else if (!this.nowPlaying) {
                this.setNowPlayingArtistLabel(prevArtist);
            }
        } catch {
            if (!this.nowPlaying) {
                this.setNowPlayingArtistLabel(prevArtist);
            }
        } finally {
            this._nowPlayingFetch = false;
        }
    }

    activateElement(element) {
        element.classList.add('active');
    }

    deactivateElement(element) {
        element.classList.remove('active');
    }

    activateProductCard(card) {
        card.classList.add('active');
    }

    deactivateProductCard(card) {
        card.classList.remove('active');
    }

    openProductModal(card) {
        // Implementar modal de producto
        console.log('Abrir modal de producto:', card);
    }

    handleTimelineClick(point) {
        const year = point.dataset.year;
        console.log('Timeline click:', year);
    }

    handleFormSubmit(e) {
        e.preventDefault();
        console.log('Formulario enviado');
        this.showNotification(this.t('notifications.messageSent'), 'success');
    }

    handleSocialClick(item) {
        const platform = item.dataset.social;
        const urls = {
            instagram: 'https://instagram.com/hechoensaltillo',
            facebook: 'https://facebook.com/hechoensaltillo',
            whatsapp: 'https://wa.me/528441234567'
        };
        
        if (urls[platform]) {
            window.open(urls[platform], '_blank');
        }
    }

    setupCustomCursor() {
        const cursor = document.querySelector('.custom-cursor');
        if (!cursor) return;

        const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches
            || window.matchMedia('(max-width: 768px)').matches;
        if (isTouchDevice) {
            cursor.style.display = 'none';
            return;
        }

        const cursorDot = cursor.querySelector('.cursor-dot');
        const cursorOutline = cursor.querySelector('.cursor-outline');
        
        document.addEventListener('mousemove', (e) => {
            cursorDot.style.left = e.clientX + 'px';
            cursorDot.style.top = e.clientY + 'px';
            cursorOutline.style.left = e.clientX + 'px';
            cursorOutline.style.top = e.clientY + 'px';
        });
        
        document.addEventListener('mousedown', () => {
            cursorDot.style.transform = 'translate(-50%, -50%) scale(0.8)';
            cursorOutline.style.transform = 'translate(-50%, -50%) scale(1.2)';
        });
        
        document.addEventListener('mouseup', () => {
            cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
            cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    }

    initParticles() {
        if (window.matchMedia('(max-width: 768px), (hover: none), (pointer: coarse)').matches) {
            return;
        }

        const container = document.querySelector('.particles-container');
        if (!container) return;

        const particleCount = 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 2 + 's';
            particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
            container.appendChild(particle);
        }
    }

    initAnimations() {
        const targets = document.querySelectorAll('.hero-content, .radio-showcase, .guia-container, .contact-container');
        const isMobile = window.matchMedia('(max-width: 768px), (hover: none), (pointer: coarse)').matches;

        if (isMobile) {
            targets.forEach((el) => el.classList.add('animate-in'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '80px 0px' });

        targets.forEach((el) => observer.observe(el));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Botón de cerrar
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    initLogin() {
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');
        this.loginPassword = document.getElementById('loginPassword');
        this.loginButtons = [
            document.getElementById('loginBtn'),
            document.getElementById('loginBtnMobile')
        ].filter(Boolean);
        this.restoreBandSession();
    }

    isProducerSession() {
        return this.bandSession?.tipo === 'producer';
    }

    initProducerPanel() {
        this.producerProfilePanel = document.getElementById('producerProfilePanel');
        this.producerProfileOverlay = document.getElementById('producerProfileOverlay');
        this.producerProfileContent = document.getElementById('producerProfileContent');
        this.producerMp3Input = document.getElementById('producerMp3Input');

        bindTap(document.getElementById('closeProducerProfile'), () => this.closeProducerProfile());
        bindTap(document.getElementById('producerLogoutBtn'), () => this.logoutProducer());
        this.producerProfileOverlay?.addEventListener('click', () => this.closeProducerProfile());

        this.producerMp3Input?.addEventListener('change', (e) => {
            this.handleProducerMp3Upload(e.target.files);
            e.target.value = '';
        });
    }

    escHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    openProducerProfile() {
        if (!this.isProducerSession()) return;
        this.renderProducerProfile();
        this.producerProfilePanel?.classList.add('open');
        this.producerProfileOverlay?.classList.add('open');
        this.producerProfileOverlay?.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    closeProducerProfile() {
        this.producerProfilePanel?.classList.remove('open');
        this.producerProfileOverlay?.classList.remove('open');
        this.producerProfileOverlay?.setAttribute('aria-hidden', 'true');
        if (!this.loginModal?.classList.contains('open')) {
            document.body.style.overflow = '';
        }
    }

    renderProducerProfile() {
        if (!this.producerProfileContent || !this.bandSession) return;

        const session = this.bandSession;
        const coverUrl = 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=80';

        this.producerProfileContent.innerHTML = `
            <div class="bpp-hero-block">
                <div class="bpp-cover-wrap">
                    <img class="bpp-cover" src="${coverUrl}" alt="">
                </div>
                <div class="bpp-hero bpp-hero-overlap">
                    <div class="bpp-hero-inner">
                        <div class="bpp-avatar-wrap">
                            <div class="bpp-avatar-fallback"><i class="fas fa-broadcast-tower"></i></div>
                        </div>
                        <div class="bpp-hero-info">
                            <div class="bpp-badges">
                                <span class="bpp-producer-badge"><i class="fas fa-sliders"></i> ${this.t('radio.producerBadge')}</span>
                            </div>
                            <h1 class="bpp-name">${this.escHtml(session.nombre)}</h1>
                            ${session.email ? `<p class="bpp-producer-email">${this.escHtml(session.email)}</p>` : ''}
                            <p class="bpp-producer-desc">${this.t('radio.producerDesc')}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="bpp-content">
                <div class="bpp-card full">
                    <h3 class="bpp-card-title"><i class="fas fa-headphones"></i> ${this.t('radio.producerQueueTitle')}</h3>
                    <div class="bpp-tracks" id="producerQueueTracks"></div>
                    <p class="bpp-empty" id="producerQueueEmpty">${this.t('radio.producerQueueEmpty')}</p>
                    <label class="bpp-upload-zone" for="producerMp3Input">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>${this.t('radio.producerUpload')}</span>
                        <small>${this.t('radio.producerUploadHint')}</small>
                    </label>
                </div>
            </div>
        `;

        this.renderProducerQueueUI();
    }

    logoutProducer() {
        this.bandSession = null;
        try {
            localStorage.removeItem('desiertoSonoro_bandSession');
        } catch (_) { /* ignore */ }
        this.closeProducerProfile();
        this.updateLoginUI();
        this.showNotification(this.t('productos.profileLogout'), 'info');
    }

    handleProducerMp3Upload(fileList) {
        if (!this.isProducerSession() || !fileList?.length) return;

        const mp3Files = Array.from(fileList).filter(f =>
            f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3')
        );
        if (!mp3Files.length) {
            this.showNotification(this.t('notifications.audioError'), 'error');
            return;
        }

        const producerName = this.bandSession.nombre;
        mp3Files.forEach(file => {
            this.radioQueue.push({
                id: `pq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                title: file.name.replace(/\.mp3$/i, ''),
                url: URL.createObjectURL(file),
                producerName
            });
        });

        this.renderProducerQueueUI();
        this.showNotification(this.t('radio.producerAdded', { count: mp3Files.length }), 'success');
    }

    renderProducerQueueUI() {
        const tracksEl = document.getElementById('producerQueueTracks');
        const emptyEl = document.getElementById('producerQueueEmpty');
        if (!tracksEl) return;

        const items = [];
        if (this._currentQueueTrack) {
            items.push({ track: this._currentQueueTrack, status: 'playing' });
        }
        this.radioQueue.forEach(track => items.push({ track, status: 'next' }));

        tracksEl.innerHTML = '';
        if (emptyEl) emptyEl.hidden = items.length > 0;

        items.forEach(({ track, status }) => {
            const row = document.createElement('div');
            row.className = `bpp-track${status === 'playing' ? ' bpp-track--live' : ''}`;
            const badge = status === 'playing'
                ? this.t('radio.producerQueuePlaying')
                : this.t('radio.producerQueueNext');
            const badgeClass = status === 'playing' ? 'bpp-track-status' : 'bpp-track-status bpp-track-status--next';
            row.innerHTML = `
                <div class="bpp-track-play bpp-track-play--static" aria-hidden="true">
                    <i class="fas fa-${status === 'playing' ? 'broadcast-tower' : 'music'}"></i>
                </div>
                <div class="bpp-track-info">
                    <span class="bpp-track-title">${this.escHtml(track.title)}</span>
                    <span class="bpp-track-meta">${this.escHtml(track.producerName)}</span>
                </div>
                <span class="${badgeClass}">${badge}</span>
            `;
            tracksEl.appendChild(row);
        });
    }

    playQueuedTrack(track) {
        if (!track?.url || !this.audio) return;

        this._radioMode = 'queue';
        this._currentQueueTrack = track;
        this.audio.src = track.url;
        this.setNowPlaying({ title: track.title, artist: track.producerName });
        this.audio.load();
        this.renderProducerQueueUI();

        return this.audio.play().catch(err => {
            console.error('Error reproduciendo pista en cola:', err);
            this.handleRadioTrackEnded();
        });
    }

    handleRadioTrackEnded() {
        if (this._currentQueueTrack) {
            URL.revokeObjectURL(this._currentQueueTrack.url);
            this._currentQueueTrack = null;
        }

        if (this.radioQueue.length > 0) {
            const next = this.radioQueue.shift();
            this.playQueuedTrack(next);
            return;
        }

        this._radioMode = 'stream';
        this.nowPlaying = null;
        this.updateNowPlayingUI();
        this.renderProducerQueueUI();

        if (!this.isPlaying) return;

        this.audio.src = this.streamUrl;
        this.audio.load();
        this.audio.play().catch(err => {
            console.error('Error retomando stream:', err);
            this.isPlaying = false;
            this.updateRadioLiveBar();
        });
    }

    setupLoginListeners() {
        const closeLogin = document.getElementById('closeLogin');
        const togglePassword = document.getElementById('togglePassword');
        const loginForgotBtn = document.getElementById('loginForgotBtn');
        const loginRegisterBtn = document.getElementById('loginRegisterBtn');

        this.loginButtons.forEach(btn => {
            bindTap(btn, () => {
                if (this.bandSession) {
                    if (this.isProducerSession()) {
                        this.openProducerProfile();
                        return;
                    }
                    window.location.href = 'productos.html';
                    return;
                }
                this.openLoginModal();
            });
        });

        bindTap(closeLogin, () => this.closeLoginModal());
        this.loginForm?.addEventListener('submit', (e) => this.handleLoginSubmit(e));
        this.loginModal?.addEventListener('click', (e) => {
            if (e.target === this.loginModal) this.closeLoginModal();
        });

        togglePassword?.addEventListener('click', () => {
            if (!this.loginPassword) return;
            const isPassword = this.loginPassword.type === 'password';
            this.loginPassword.type = isPassword ? 'text' : 'password';
            const icon = togglePassword.querySelector('i');
            if (icon) icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
        });

        bindTap(loginForgotBtn, () => {
            this.showNotification(this.t('productos.loginDemo'), 'info');
        });

        bindTap(loginRegisterBtn, () => {
            this.closeLoginModal();
            this.openRegistroPickerModal();
        });
    }

    restoreBandSession() {
        const sessionKey = 'desiertoSonoro_bandSession';
        const accountsKey = 'desiertoSonoro_bandAccounts';
        try {
            const raw = localStorage.getItem(sessionKey);
            if (!raw) return;
            const session = JSON.parse(raw);
            const accounts = JSON.parse(localStorage.getItem(accountsKey) || '[]');
            const account = accounts.find(a => a.nombreKey === session.nombreKey);
            if (account) {
                this.bandSession = account;
                this.updateLoginUI();
            }
        } catch (_) { /* ignore */ }
    }

    updateLoginUI() {
        this.loginButtons.forEach(btn => {
            const label = btn.querySelector('[data-login-label]');
            if (!label) return;
            if (this.bandSession) {
                btn.classList.add('logged-in');
                label.removeAttribute('data-i18n');
                label.textContent = this.bandSession.nombre;
            } else {
                btn.classList.remove('logged-in');
                label.setAttribute('data-i18n', 'nav.login');
                label.textContent = window.I18n?.t('nav.login') || 'ENTRAR';
            }
        });
    }

    openLoginModal() {
        if (!this.loginModal) return;
        this.loginModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        document.getElementById('loginIdentifier')?.focus();
    }

    closeLoginModal() {
        if (!this.loginModal) return;
        this.loginModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    handleLoginSubmit(e) {
        e.preventDefault();
        const identifier = document.getElementById('loginIdentifier')?.value.trim();
        const password = this.loginPassword?.value;
        if (!identifier || !password) return;

        const identifierKey = identifier.toLowerCase();
        let matchedAccount = null;
        try {
            const accounts = JSON.parse(localStorage.getItem('desiertoSonoro_bandAccounts') || '[]');
            matchedAccount = accounts.find(a => {
                if (a.password !== password) return false;
                return a.nombreKey === identifierKey || a.emailKey === identifierKey;
            }) || null;
        } catch (_) { /* storage unavailable */ }

        if (matchedAccount) {
            this.bandSession = matchedAccount;
            try {
                localStorage.setItem('desiertoSonoro_bandSession', JSON.stringify({
                    nombreKey: matchedAccount.nombreKey,
                    nombre: matchedAccount.nombre,
                    tipo: matchedAccount.tipo || 'banda'
                }));
            } catch (_) { /* ignore */ }
            this.showNotification(this.t('productos.loginSuccess'), 'success');
            this.closeLoginModal();
            this.loginForm?.reset();
            if (this.loginPassword?.type === 'text') {
                this.loginPassword.type = 'password';
                document.getElementById('togglePassword')?.querySelector('i')?.classList.replace('fa-eye-slash', 'fa-eye');
            }
            this.updateLoginUI();
            if (this.isProducerSession()) {
                this.openProducerProfile();
                return;
            }
            window.location.href = 'productos.html';
            return;
        }

        this.showNotification(this.t('productos.loginError'), 'error');
    }
}

// Funcionalidad del header móvil
class MobileHeader {
    constructor() {
        this.mobilePlayBtn = document.getElementById('mobilePlayBtn');
        this.mobileStopBtn = document.getElementById('mobileStopBtn');
        this.mobileShazamBtn = document.getElementById('mobileShazamBtn');
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.mobileNavOverlay = document.getElementById('mobileNavOverlay');
        this.mobileNavBackdrop = document.getElementById('mobileNavBackdrop');
        this.isMenuOpen = false;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupMobileNavScrollGuard();
        if (this.mobileNavOverlay) {
            this.mobileNavOverlay.inert = true;
            this.mobileNavOverlay.setAttribute('aria-hidden', 'true');
        }
    }

    setupMobileNavScrollGuard() {
        const scrollEl = this.mobileNavOverlay?.querySelector('.mobile-nav-scroll');
        if (!scrollEl) return;

        let touchY = 0;

        scrollEl.addEventListener('touchstart', (e) => {
            touchY = e.touches[0]?.clientY ?? 0;
            mobileNavTouch.moved = false;
            clearTimeout(mobileNavTouch.resetTimer);
        }, { passive: true });

        scrollEl.addEventListener('touchmove', (e) => {
            const y = e.touches[0]?.clientY ?? touchY;
            if (Math.abs(y - touchY) > TAP_MOVE_THRESHOLD) {
                markMobileNavTouchMoved();
            }
        }, { passive: true });

        scrollEl.addEventListener('touchend', () => {
            if (mobileNavTouch.moved) {
                markMobileNavTouchMoved();
            }
        }, { passive: true });

        scrollEl.addEventListener('touchcancel', () => {
            markMobileNavTouchMoved();
        }, { passive: true });
    }

    setupEventListeners() {
        bindTap(this.mobilePlayBtn, () => {
            window.saltilloApp?.togglePlay();
        });
        
        bindTap(this.mobileStopBtn, () => {
            window.saltilloApp?.stopAudio();
        });
        
        bindTap(this.mobileShazamBtn, () => {
            window.saltilloApp?.startShazam();
        });

        this.mobileMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleMobileMenu();
        });

        bindTap(this.mobileNavBackdrop, () => {
            this.closeMobileMenu();
        });

        bindTap(document.getElementById('mobileNavClose'), () => {
            this.closeMobileMenu();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
            }
        });
    }
    
    toggleMobileMenu() {
        if (this.isMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        if (!this.mobileNavOverlay || !this.mobileMenuBtn) return;

        this.isMenuOpen = true;
        this.mobileNavOverlay.inert = false;
        this.mobileNavOverlay.classList.add('open');
        this.mobileNavOverlay.setAttribute('aria-hidden', 'false');
        this.mobileMenuBtn.classList.add('active');
        this.mobileMenuBtn.setAttribute('aria-expanded', 'true');
        document.body.classList.add('mobile-menu-open');

        requestAnimationFrame(() => {
            document.getElementById('mobileNavClose')?.focus({ preventScroll: true });
        });
    }

    closeMobileMenu() {
        if (!this.mobileNavOverlay || !this.mobileMenuBtn) return;

        this.isMenuOpen = false;
        this.mobileNavOverlay.classList.remove('open');
        this.mobileNavOverlay.setAttribute('aria-hidden', 'true');
        this.mobileNavOverlay.inert = true;
        this.mobileMenuBtn.classList.remove('active');
        this.mobileMenuBtn.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('mobile-menu-open');

        const active = document.activeElement;
        if (active && this.mobileNavOverlay.contains(active)) {
            active.blur();
        }
        this.mobileMenuBtn.focus({ preventScroll: true });
    }
    
    updatePlayState(isPlaying) {
        if (this.mobilePlayBtn) {
            const icon = this.mobilePlayBtn.querySelector('i');
            if (icon) {
                icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        }
    }
    
    updateShazamState(isListening, isPlaying = true, isIdentified = false) {
        if (!this.mobileShazamBtn) return;

        const inactive = !isPlaying || (isIdentified && !isListening);
        this.mobileShazamBtn.classList.toggle('inactive', inactive);
        this.mobileShazamBtn.classList.toggle('listening', isPlaying && isListening);
        this.mobileShazamBtn.classList.toggle('identified', isIdentified && !isListening);
        this.mobileShazamBtn.disabled = inactive;
        this.mobileShazamBtn.setAttribute('aria-disabled', inactive ? 'true' : 'false');
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.saltilloApp = new SaltilloApp();
    window.mobileHeader = new MobileHeader();
});
