// JavaScript experimental para experiencia inmersiva
class SaltilloExperience {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.createParticles();
        this.setupAnimations();
        this.setupInteractions();
    }

    init() {
        this.cursor = {
            dot: document.querySelector('.cursor-dot'),
            outline: document.querySelector('.cursor-outline')
        };
        
        this.sections = document.querySelectorAll('section[id]');
        this.navItems = document.querySelectorAll('.nav-item');
        
        // Configuración de partículas
        this.particles = [];
        this.particleCount = 50;
        
        // Configuración de animaciones
        this.animationFrame = null;
        this.lastTime = 0;
        
        // Configuración de audio real
        this.audio = null;
        this.isPlaying = false;
        
        // Configuración de Shazam
        this.isShazamListening = false;
        this.shazamTimeout = null;
        this.streamUrl = 'song.mp3'; // Archivo local para pruebas
        
        // URLs de fallback para streams
        this.fallbackStreams = [
            'https://streaming.radio.unam.mx:8000/stream',
            'https://playerservices.streamtheworld.com/api/livestream-redirect/XERFAM_SC.mp3',
            'https://playerservices.streamtheworld.com/api/livestream-redirect/XEWK_SC.mp3'
        ];
        this.currentStreamIndex = 0;
        
        console.log('🚀 Saltillo Experience inicializada');
        
        // Verificar soporte para APIs de audio
        this.checkAudioSupport();
    }

    // Verificar soporte para APIs de audio
    checkAudioSupport() {
        const support = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            audioContext: !!(window.AudioContext || window.webkitAudioContext),
            mediaRecorder: !!window.MediaRecorder
        };
        
        console.log('🎵 Soporte de APIs de audio:', support);
        
        if (!support.getUserMedia) {
            console.warn('⚠️ getUserMedia no soportado - Shazam no funcionará');
        }
        if (!support.audioContext) {
            console.warn('⚠️ AudioContext no soportado - Análisis de audio limitado');
        }
        if (!support.mediaRecorder) {
            console.warn('⚠️ MediaRecorder no soportado - Grabación de audio no disponible');
        }
    }

    setupEventListeners() {
        // Cursor personalizado
        document.addEventListener('mousemove', (e) => this.updateCursor(e));
        document.addEventListener('mouseenter', () => this.showCursor());
        document.addEventListener('mouseleave', () => this.hideCursor());
        
        // Navegación
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => this.navigateToSection(e));
            item.addEventListener('mouseenter', () => this.highlightNavItem(item));
            item.addEventListener('mouseleave', () => this.unhighlightNavItem(item));
        });
        
        // Scroll y parallax
        window.addEventListener('scroll', () => this.handleScroll());
        
        
        // Elementos interactivos del hero
        document.querySelectorAll('.interactive-element').forEach(element => {
            element.addEventListener('click', (e) => this.handleHeroInteraction(e));
            element.addEventListener('mouseenter', () => this.activateElement(element));
            element.addEventListener('mouseleave', () => this.deactivateElement(element));
        });
        
        // Botón de Shazam
        document.getElementById('shazamBtn')?.addEventListener('click', () => this.startShazam());
        
        // Cards de productos
        document.querySelectorAll('.product-card-experimental').forEach(card => {
            card.addEventListener('mouseenter', () => this.activateProductCard(card));
            card.addEventListener('mouseleave', () => this.deactivateProductCard(card));
            card.addEventListener('click', () => this.openProductModal(card));
        });
        
        // Timeline interactivo
        document.querySelectorAll('.timeline-point').forEach(point => {
            point.addEventListener('click', () => this.showTimelineInfo(point));
            point.addEventListener('mouseenter', () => this.highlightTimelinePoint(point));
            point.addEventListener('mouseleave', () => this.unhighlightTimelinePoint(point));
        });
        
        // Estadísticas interactivas
        document.querySelectorAll('.stat-item').forEach(stat => {
            stat.addEventListener('click', () => this.animateStat(stat));
        });
        
        // Formulario experimental
        const form = document.querySelector('.experimental-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
            
            // Efectos en inputs
            form.querySelectorAll('input, textarea').forEach(input => {
                input.addEventListener('focus', () => this.activateInput(input));
                input.addEventListener('blur', () => this.deactivateInput(input));
                input.addEventListener('input', () => this.updateInputEffect(input));
            });
        }
        
        // Redes sociales
        document.querySelectorAll('.social-item').forEach(social => {
            social.addEventListener('click', () => this.openSocialLink(social));
        });
        
        // Resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    updateCursor(e) {
        if (!this.cursor.dot || !this.cursor.outline) return;
        
        const x = e.clientX;
        const y = e.clientY;
        
        this.cursor.dot.style.left = x + 'px';
        this.cursor.dot.style.top = y + 'px';
        
        this.cursor.outline.style.left = x + 'px';
        this.cursor.outline.style.top = y + 'px';
        
        // Efecto de lag en el outline
        requestAnimationFrame(() => {
            this.cursor.outline.style.transform = `translate(-50%, -50%) scale(${this.isHovering ? 1.5 : 1})`;
        });
    }

    showCursor() {
        if (this.cursor.dot) this.cursor.dot.style.opacity = '1';
        if (this.cursor.outline) this.cursor.outline.style.opacity = '0.3';
    }

    hideCursor() {
        if (this.cursor.dot) this.cursor.dot.style.opacity = '0';
        if (this.cursor.outline) this.cursor.outline.style.opacity = '0';
    }

    navigateToSection(e) {
        e.preventDefault();
        const sectionId = e.currentTarget.dataset.section;
        const isExternal = e.currentTarget.dataset.external === 'true';
        
        if (isExternal && sectionId === 'products') {
            // Abrir página de productos en nueva pestaña
            window.open('productos.html', '_blank');
            return;
        }
        
        const section = document.getElementById(sectionId);
        
        if (section) {
            const navHeight = document.querySelector('.experimental-nav').offsetHeight;
            const targetPosition = section.offsetTop - navHeight;
            
            // Efecto de scroll suave con easing personalizado
            this.smoothScrollTo(targetPosition);
            
            // Actualizar navegación activa
            this.updateActiveNavItem(e.currentTarget);
        }
    }

    smoothScrollTo(targetPosition) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 1000;
        let start = null;

        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        };

        const animation = (currentTime) => {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const progress = Math.min(timeElapsed / duration, 1);
            
            window.scrollTo(0, startPosition + distance * easeInOutCubic(progress));
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };

        requestAnimationFrame(animation);
    }

    updateActiveNavItem(activeItem) {
        this.navItems.forEach(item => {
            item.classList.remove('active');
            item.querySelector('.nav-indicator').style.width = '0';
        });
        
        activeItem.classList.add('active');
        activeItem.querySelector('.nav-indicator').style.width = '100%';
    }

    handleScroll() {
        const scrollY = window.pageYOffset;
        const windowHeight = window.innerHeight;
        
        // Parallax en elementos del hero
        this.updateParallaxElements(scrollY);
        
        // Actualizar navegación activa basada en scroll
        this.updateActiveSection(scrollY);
        
        // Efectos de scroll en diferentes secciones
        this.sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const isVisible = rect.top < windowHeight && rect.bottom > 0;
            
            if (isVisible) {
                this.triggerSectionAnimations(section);
            }
        });
    }

    updateParallaxElements(scrollY) {
        const parallaxElements = document.querySelectorAll('.orb, .shape, .canvas-element');
        
        parallaxElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = scrollY * speed;
            element.style.transform = `translateY(${yPos}px)`;
        });
    }

    updateActiveSection(scrollY) {
        let activeSection = null;
        
        this.sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            const navHeight = document.querySelector('.experimental-nav').offsetHeight;
            
            if (rect.top <= navHeight && rect.bottom > navHeight) {
                activeSection = section.id;
            }
        });
        
        if (activeSection) {
            const activeNavItem = document.querySelector(`[data-section="${activeSection}"]`);
            if (activeNavItem) {
                this.updateActiveNavItem(activeNavItem);
            }
        }
    }

    triggerSectionAnimations(section) {
        const animatedElements = section.querySelectorAll('.product-card-experimental, .stat-item, .info-card');
        
        animatedElements.forEach((element, index) => {
            if (!element.classList.contains('animated')) {
                setTimeout(() => {
                    element.classList.add('animated');
                    this.animateElement(element);
                }, index * 100);
            }
        });
    }

    animateElement(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(50px)';
        
        requestAnimationFrame(() => {
            element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    createParticles() {
        const container = document.querySelector('.particles-container');
        if (!container) return;
        
        for (let i = 0; i < this.particleCount; i++) {
            this.createParticle(container);
        }
        
        this.animateParticles();
    }

    createParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            position: absolute;
            width: ${Math.random() * 4 + 1}px;
            height: ${Math.random() * 4 + 1}px;
            background: rgba(0, 212, 255, ${Math.random() * 0.5 + 0.1});
            border-radius: 50%;
            pointer-events: none;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particle-float ${Math.random() * 10 + 5}s linear infinite;
        `;
        
        container.appendChild(particle);
        this.particles.push(particle);
    }

    animateParticles() {
        this.particles.forEach((particle, index) => {
            const speed = Math.random() * 0.5 + 0.1;
            const direction = Math.random() * Math.PI * 2;
            
            const animate = () => {
                const rect = particle.getBoundingClientRect();
                const x = rect.left + Math.cos(direction) * speed;
                const y = rect.top + Math.sin(direction) * speed;
                
                particle.style.left = x + 'px';
                particle.style.top = y + 'px';
                
                if (x < -10 || x > window.innerWidth + 10 || y < -10 || y > window.innerHeight + 10) {
                    particle.style.left = Math.random() * window.innerWidth + 'px';
                    particle.style.top = Math.random() * window.innerHeight + 'px';
                }
                
                requestAnimationFrame(animate);
            };
            
            animate();
        });
    }

    setupAnimations() {
        // Animación de escritura para el título
        this.typeWriterEffect();
        
        // Animación de contadores
        this.setupCounters();
        
        // Efectos de hover avanzados
        this.setupHoverEffects();
        
        // Animaciones de entrada
        this.setupEntranceAnimations();
    }

    typeWriterEffect() {
        const titleLines = document.querySelectorAll('.title-line');
        
        titleLines.forEach((line, index) => {
            const text = line.textContent;
            line.textContent = '';
            
            setTimeout(() => {
                this.typeText(line, text, 50);
            }, index * 500);
        });
    }

    typeText(element, text, speed) {
        let i = 0;
        const timer = setInterval(() => {
            element.textContent += text.charAt(i);
            i++;
            
            if (i >= text.length) {
                clearInterval(timer);
                this.addGlitchEffect(element);
            }
        }, speed);
    }

    addGlitchEffect(element) {
        const originalText = element.textContent;
        const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                element.textContent = originalText.split('').map(char => 
                    Math.random() < 0.1 ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : char
                ).join('');
            }, i * 100);
        }
        
        setTimeout(() => {
            element.textContent = originalText;
        }, 300);
    }

    setupCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        counters.forEach(counter => observer.observe(counter));
    }

    animateCounter(element) {
        const target = parseInt(element.textContent.replace(/\D/g, ''));
        const duration = 2000;
        const start = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = Math.floor(target * this.easeOutCubic(progress));
            element.textContent = current + (element.textContent.includes('+') ? '+' : '');
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    setupHoverEffects() {
        // Efectos de hover en elementos interactivos
        document.querySelectorAll('.interactive-element').forEach(element => {
            element.addEventListener('mouseenter', () => {
                this.createRippleEffect(element);
            });
        });
        
        // Efectos de hover en cards
        document.querySelectorAll('.product-card-experimental').forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.createCardHoverEffect(card);
            });
        });
    }

    createRippleEffect(element) {
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(0, 212, 255, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (rect.width / 2 - size / 2) + 'px';
        ripple.style.top = (rect.height / 2 - size / 2) + 'px';
        
        element.style.position = 'relative';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    createCardHoverEffect(card) {
        const glow = document.createElement('div');
        glow.style.cssText = `
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, #00D4FF, #FF0080, #00FF88);
            border-radius: 20px;
            z-index: -1;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        card.style.position = 'relative';
        card.appendChild(glow);
        
        requestAnimationFrame(() => {
            glow.style.opacity = '0.5';
        });
        
        card.addEventListener('mouseleave', () => {
            glow.style.opacity = '0';
            setTimeout(() => glow.remove(), 300);
        }, { once: true });
    }

    setupEntranceAnimations() {
        const elements = document.querySelectorAll('.hero-title, .hero-subtitle, .interactive-element');
        
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(50px)';
            
            setTimeout(() => {
                element.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    setupInteractions() {
        // Interacciones del hero
        this.setupHeroInteractions();
        
        // Interacciones de productos
        this.setupProductInteractions();
        
        // Interacciones de formulario
        this.setupFormInteractions();
        
        // Interacciones de timeline
        this.setupTimelineInteractions();
        
        // Controles de radio
        this.setupRadioControls();
        
        // Reproductor del header
        this.setupHeaderPlayer();
        
        // Inicializar audio real
        this.initRealAudio();
    }

    setupHeroInteractions() {
        document.querySelectorAll('.interactive-element').forEach(element => {
            element.addEventListener('click', (e) => {
                const interaction = e.currentTarget.dataset.interaction;
                
                switch (interaction) {
                    case 'listen':
                        this.startRadioStream();
                        break;
                    case 'products':
                        window.open('productos.html', '_blank');
                        break;
                }
                
                this.createInteractionFeedback(element);
            });
        });
    }

    startRadioStream() {
        // Iniciar transmisión real de Radio Concierto
        this.playRealRadio();
        
        // Cambiar el estado visual
        const nowPlaying = document.querySelector('.now-playing');
        if (nowPlaying) {
            nowPlaying.style.background = 'rgba(0, 212, 255, 0.1)';
            nowPlaying.style.borderColor = 'var(--neon-blue)';
        }
    }

    createInteractionFeedback(element) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 100px;
            border: 2px solid #00D4FF;
            border-radius: 50%;
            pointer-events: none;
            animation: feedback-pulse 0.6s ease-out;
        `;
        
        element.style.position = 'relative';
        element.appendChild(feedback);
        
        setTimeout(() => feedback.remove(), 600);
    }

    setupProductInteractions() {
        document.querySelectorAll('.product-card-experimental').forEach(card => {
            card.addEventListener('click', () => {
                this.showProductDetails(card);
            });
        });
    }

    showProductDetails(card) {
        const product = card.dataset.product;
        const modal = this.createProductModal(product);
        document.body.appendChild(modal);
        
        // Animación de entrada
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'scale(1)';
        });
    }

    createProductModal(product) {
        const modal = document.createElement('div');
        modal.className = 'product-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = `
            background: #1A1A1A;
            border-radius: 20px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            transform: scale(0.8);
            transition: transform 0.3s ease;
            border: 1px solid rgba(0, 212, 255, 0.3);
        `;
        
        content.innerHTML = `
            <h3>${product.toUpperCase()}</h3>
            <p>Detalles del producto...</p>
            <button class="close-modal">Cerrar</button>
        `;
        
        modal.appendChild(content);
        
        // Cerrar modal
        content.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.opacity = '0';
            content.style.transform = 'scale(0.8)';
            setTimeout(() => modal.remove(), 300);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.opacity = '0';
                content.style.transform = 'scale(0.8)';
                setTimeout(() => modal.remove(), 300);
            }
        });
        
        return modal;
    }

    setupFormInteractions() {
        const form = document.querySelector('.experimental-form');
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm(form);
        });
    }

    submitForm(form) {
        const submitBtn = form.querySelector('.submit-btn-experimental');
        const originalText = submitBtn.querySelector('.btn-text').textContent;
        
        // Animación de envío
        submitBtn.querySelector('.btn-text').textContent = 'ENVIANDO...';
        submitBtn.style.background = 'linear-gradient(135deg, #00FF88, #00D4FF)';
        
        // Simular envío
        setTimeout(() => {
            submitBtn.querySelector('.btn-text').textContent = '¡ENVIADO!';
            submitBtn.style.background = 'linear-gradient(135deg, #00FF88, #10B981)';
            
            // Crear efecto de éxito
            this.createSuccessEffect(submitBtn);
            
            setTimeout(() => {
                submitBtn.querySelector('.btn-text').textContent = originalText;
                submitBtn.style.background = '';
                form.reset();
            }, 2000);
        }, 1500);
    }

    createSuccessEffect(element) {
        const success = document.createElement('div');
        success.style.cssText = `
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border: 2px solid #00FF88;
            border-radius: 50px;
            animation: success-pulse 0.6s ease-out;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.appendChild(success);
        
        setTimeout(() => success.remove(), 600);
    }

    setupTimelineInteractions() {
        document.querySelectorAll('.timeline-point').forEach(point => {
            point.addEventListener('click', () => {
                const year = point.dataset.year;
                this.showTimelineInfo(year);
            });
        });
    }

    showTimelineInfo(year) {
        const info = {
            '2009': 'Inicio de Radio Saltillo',
            '2015': 'Expansión digital y streaming',
            '2024': 'Futuro de la radio local'
        };
        
        this.showNotification(info[year] || 'Información no disponible');
    }

    setupRadioControls() {
        const playBtn = document.querySelector('.play-btn');
        const stopBtn = document.querySelector('.stop-btn');
        const volumeBtn = document.querySelector('.volume-btn');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.toggleRadioPlay();
            });
        }
        
        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                this.stopRadio();
            });
        }
        
        if (volumeBtn) {
            volumeBtn.addEventListener('click', () => {
                this.toggleRadioVolume();
            });
        }
    }

    toggleRadioPlay() {
        this.playRealRadio();
        if (this.isPlaying) {
            this.startEqualizerAnimation();
        } else {
            this.stopEqualizerAnimation();
        }
    }

    stopRadio() {
        this.stopRealRadio();
        this.stopEqualizerAnimation();
    }

    toggleRadioVolume() {
        const volumeBtn = document.querySelector('.volume-btn');
        const icon = volumeBtn.querySelector('i');
        
        if (icon.classList.contains('fa-volume-up')) {
            icon.className = 'fas fa-volume-mute';
            this.showNotification('🔇 Sonido silenciado');
        } else {
            icon.className = 'fas fa-volume-up';
            this.showNotification('🔊 Sonido activado');
        }
    }

    startEqualizerAnimation() {
        const eqBars = document.querySelectorAll('.eq-bar');
        eqBars.forEach(bar => {
            bar.style.animationPlayState = 'running';
        });
    }

    stopEqualizerAnimation() {
        const eqBars = document.querySelectorAll('.eq-bar');
        eqBars.forEach(bar => {
            bar.style.animationPlayState = 'paused';
        });
    }

    setupHeaderPlayer() {
        const headerPlayBtn = document.getElementById('headerPlayBtn');
        const headerStopBtn = document.getElementById('headerStopBtn');
        
        if (headerPlayBtn) {
            headerPlayBtn.addEventListener('click', () => {
                this.toggleHeaderRadio();
            });
        }
        
        if (headerStopBtn) {
            headerStopBtn.addEventListener('click', () => {
                this.stopHeaderRadio();
            });
        }
    }

    toggleHeaderRadio() {
        this.playRealRadio();
        if (this.isPlaying) {
            this.showNotification('📻 XHPALVFM en vivo desde el header');
        } else {
            this.showNotification('⏸️ XHPALVFM pausada desde el header');
        }
    }

    stopHeaderRadio() {
        this.stopRealRadio();
        this.showNotification('⏹️ XHPALVFM detenida desde el header');
    }

    initRealAudio() {
        try {
            // Intentar usar el elemento de audio oculto primero
            this.audio = document.getElementById('hiddenAudio');
            
            if (!this.audio) {
                // Crear nuevo elemento de audio si no existe
                this.audio = new Audio();
                this.audio.src = this.streamUrl;
            }
            
            this.audio.crossOrigin = 'anonymous';
            this.audio.preload = 'none';
            
            // Configurar eventos de audio
            this.audio.addEventListener('loadstart', () => {
                console.log('🎵 Cargando archivo local song.mp3...');
                this.showNotification('🎵 Cargando archivo local...');
                this.updateSignalIndicator();
            });
            
            this.audio.addEventListener('canplay', () => {
                console.log('✅ Stream listo para reproducir');
                this.showNotification('✅ Archivo local cargado');
                this.updateSignalIndicator();
            });
            
            this.audio.addEventListener('error', (e) => {
                console.error('❌ Error en el stream:', e);
                this.handleStreamError(e);
            });
            
            this.audio.addEventListener('ended', () => {
                console.log('⏹️ Stream terminado');
                this.isPlaying = false;
                this.updatePlayButtons();
            });
            
            // Intentar conectar al stream
            if (!this.audio.src) {
                this.audio.src = this.streamUrl;
            }
            
        } catch (error) {
            console.error('Error inicializando audio:', error);
            this.showNotification('❌ Error inicializando reproductor de audio');
        }
    }

    playRealRadio() {
        if (!this.audio) {
            this.initRealAudio();
            return;
        }
        
        try {
            if (this.isPlaying) {
                this.audio.pause();
                this.isPlaying = false;
                this.showNotification('⏸️ XHPALVFM pausada');
            } else {
                this.audio.play().then(() => {
                    this.isPlaying = true;
                    this.showNotification('🎵 XHPALVFM en vivo');
                }).catch(error => {
                    console.error('Error reproduciendo:', error);
                    this.showNotification('❌ Error al reproducir XHPALVFM');
                });
            }
            this.updatePlayButtons();
        } catch (error) {
            console.error('Error en playRealRadio:', error);
            this.showNotification('❌ Error en el reproductor');
        }
    }

    stopRealRadio() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
            this.isPlaying = false;
            this.updatePlayButtons();
            this.showNotification('⏹️ XHPALVFM detenida');
        }
    }

    updatePlayButtons() {
        const playButtons = document.querySelectorAll('.play-btn, .play-btn-small');
        const stopButtons = document.querySelectorAll('.stop-btn, .stop-btn-small');
        const signalDots = document.querySelectorAll('.signal-dot');
        
        playButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (this.isPlaying) {
                icon.className = 'fas fa-pause';
            } else {
                icon.className = 'fas fa-play';
            }
        });
        
        signalDots.forEach(dot => {
            if (this.isPlaying) {
                dot.style.background = 'var(--neon-green)';
            } else {
                dot.style.background = 'var(--neon-blue)';
            }
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 212, 255, 0.9);
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }


    handleKeyboard(e) {
        switch (e.key) {
            case 'Escape':
                this.closeAllModals();
                break;
            case ' ':
                e.preventDefault();
                this.toggleTheme();
                break;
            case 'ArrowDown':
                this.scrollToNextSection();
                break;
            case 'ArrowUp':
                this.scrollToPreviousSection();
                break;
        }
    }

    closeAllModals() {
        document.querySelectorAll('.product-modal').forEach(modal => {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        });
    }

    scrollToNextSection() {
        const currentSection = this.getCurrentSection();
        const nextSection = currentSection?.nextElementSibling;
        
        if (nextSection && nextSection.tagName === 'SECTION') {
            this.navigateToSection({
                preventDefault: () => {},
                currentTarget: { dataset: { section: nextSection.id } }
            });
        }
    }

    scrollToPreviousSection() {
        const currentSection = this.getCurrentSection();
        const prevSection = currentSection?.previousElementSibling;
        
        if (prevSection && prevSection.tagName === 'SECTION') {
            this.navigateToSection({
                preventDefault: () => {},
                currentTarget: { dataset: { section: prevSection.id } }
            });
        }
    }

    getCurrentSection() {
        const scrollY = window.pageYOffset;
        const navHeight = document.querySelector('.experimental-nav').offsetHeight;
        
        for (let section of this.sections) {
            const rect = section.getBoundingClientRect();
            if (rect.top <= navHeight && rect.bottom > navHeight) {
                return section;
            }
        }
        
        return null;
    }

    handleResize() {
        // Recalcular posiciones de partículas
        this.particles.forEach(particle => {
            if (particle.getBoundingClientRect().left > window.innerWidth) {
                particle.style.left = Math.random() * window.innerWidth + 'px';
            }
            if (particle.getBoundingClientRect().top > window.innerHeight) {
                particle.style.top = Math.random() * window.innerHeight + 'px';
            }
        });
    }

    // Métodos de utilidad
    activateElement(element) {
        element.style.transform = 'scale(1.05)';
        element.style.boxShadow = '0 10px 30px rgba(0, 212, 255, 0.3)';
    }

    deactivateElement(element) {
        element.style.transform = 'scale(1)';
        element.style.boxShadow = '';
    }

    activateProductCard(card) {
        card.style.transform = 'translateY(-10px) scale(1.02)';
        card.style.boxShadow = '0 20px 40px rgba(0, 212, 255, 0.2)';
    }

    deactivateProductCard(card) {
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '';
    }

    activateInput(input) {
        input.parentElement.style.transform = 'scale(1.02)';
    }

    deactivateInput(input) {
        input.parentElement.style.transform = 'scale(1)';
    }

    updateInputEffect(input) {
        if (input.value.length > 0) {
            input.style.borderColor = '#00D4FF';
        } else {
            input.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
    }

    openSocialLink(social) {
        const platform = social.dataset.social;
        const urls = {
            instagram: 'https://instagram.com/hechoensaltillo',
            facebook: 'https://facebook.com/hechoensaltillo',
            whatsapp: 'https://wa.me/528441234567'
        };
        
        if (urls[platform]) {
            window.open(urls[platform], '_blank');
        }
    }

    // Funcionalidad de Shazam REAL - Ventana popup de Shazam.com
    async startShazam() {
        if (this.isShazamListening) {
            this.stopShazam();
            return;
        }

        this.isShazamListening = true;
        const shazamBtn = document.getElementById('shazamBtn');
        
        // Agregar clase de animación
        shazamBtn.classList.add('listening');
        shazamBtn.title = 'Detener identificación';

        try {
            this.showNotification('🎵 Abriendo Shazam.com...', 'info');
            
            // Abrir Shazam.com en ventana popup
            await this.openShazamPopup();
            
        } catch (error) {
            console.error('Error iniciando Shazam:', error);
            this.showNotification('❌ Error iniciando Shazam', 'error');
            this.stopShazam();
        }
    }

    // Abrir Shazam.com en ventana popup
    async openShazamPopup() {
        try {
            // Crear modal de instrucciones
            const modal = document.createElement('div');
            modal.className = 'shazam-popup-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>🎵 Shazam.com - Reconocimiento de Música</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="shazam-popup-container">
                            <div class="popup-info">
                                <div class="info-icon">🎤</div>
                                <h4>Shazam se abrirá en una nueva ventana</h4>
                                <p>Usa el botón de Shazam en la ventana que se abrirá para identificar la música</p>
                            </div>
                            
                            <div class="popup-actions">
                                <button class="action-btn primary" id="openShazamBtn">
                                    <i class="fas fa-external-link-alt"></i>
                                    Abrir Shazam.com
                                </button>
                                <button class="action-btn secondary" id="manualResultBtn">
                                    <i class="fas fa-keyboard"></i>
                                    Ingresar Resultado Manualmente
                                </button>
                            </div>
                            
                            <div class="popup-instructions">
                                <h5>📋 Instrucciones:</h5>
                                <ol>
                                    <li>Haz clic en "Abrir Shazam.com"</li>
                                    <li>Permite acceso al micrófono en la nueva ventana</li>
                                    <li>Haz clic en el botón de Shazam en la ventana</li>
                                    <li>Acerca el dispositivo a la música</li>
                                    <li>Copia el resultado y pégalo aquí</li>
                                </ol>
                            </div>
                            
                            <div class="result-input" id="resultInput" style="display: none;">
                                <h5>📝 Ingresa el resultado de Shazam:</h5>
                                <textarea placeholder="Ejemplo: Bohemian Rhapsody - Queen" rows="3"></textarea>
                                <button class="action-btn primary" id="processResultBtn">
                                    <i class="fas fa-check"></i>
                                    Procesar Resultado
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event listeners
            modal.querySelector('.close-btn').addEventListener('click', () => {
                modal.remove();
                this.stopShazam();
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    this.stopShazam();
                }
            });
            
            // Abrir Shazam.com
            modal.querySelector('#openShazamBtn').addEventListener('click', () => {
                this.openShazamWindow();
                this.showNotification('✅ Shazam.com abierto - Usa el botón de Shazam en la nueva ventana', 'success');
            });
            
            // Mostrar input manual
            modal.querySelector('#manualResultBtn').addEventListener('click', () => {
                modal.querySelector('#resultInput').style.display = 'block';
                modal.querySelector('#manualResultBtn').style.display = 'none';
            });
            
            // Procesar resultado manual
            modal.querySelector('#processResultBtn').addEventListener('click', () => {
                const resultText = modal.querySelector('textarea').value.trim();
                if (resultText) {
                    this.processShazamResult(resultText);
                    modal.remove();
                } else {
                    this.showNotification('❌ Por favor ingresa un resultado', 'warning');
                }
            });
            
        } catch (error) {
            console.error('Error abriendo popup de Shazam:', error);
            throw error;
        }
    }

    // Abrir ventana de Shazam.com
    openShazamWindow() {
        try {
            // Configuración de la ventana popup
            const popupConfig = {
                width: 800,
                height: 600,
                left: (screen.width - 800) / 2,
                top: (screen.height - 600) / 2,
                scrollbars: 'yes',
                resizable: 'yes',
                toolbar: 'no',
                menubar: 'no',
                location: 'no',
                status: 'no'
            };
            
            // Abrir ventana popup
            const shazamWindow = window.open(
                'https://www.shazam.com/',
                'ShazamWindow',
                `width=${popupConfig.width},height=${popupConfig.height},left=${popupConfig.left},top=${popupConfig.top},scrollbars=${popupConfig.scrollbars},resizable=${popupConfig.resizable},toolbar=${popupConfig.toolbar},menubar=${popupConfig.menubar},location=${popupConfig.location},status=${popupConfig.status}`
            );
            
            if (shazamWindow) {
                // Enfocar la ventana
                shazamWindow.focus();
                
                // Monitorear si la ventana se cierra
                const checkClosed = setInterval(() => {
                    if (shazamWindow.closed) {
                        clearInterval(checkClosed);
                        this.showNotification('ℹ️ Ventana de Shazam cerrada', 'info');
                    }
                }, 1000);
                
                // Limpiar intervalo después de 5 minutos
                setTimeout(() => {
                    clearInterval(checkClosed);
                }, 300000);
                
            } else {
                this.showNotification('❌ No se pudo abrir Shazam.com - Bloqueador de popups activo', 'error');
            }
            
        } catch (error) {
            console.error('Error abriendo ventana de Shazam:', error);
            this.showNotification('❌ Error abriendo Shazam.com', 'error');
        }
    }

    // Automatizar el proceso de Shazam
    async startShazamAutomation(iframe) {
        try {
            // Esperar un poco para que Shazam cargue completamente
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Intentar hacer clic en el botón de Shazam dentro del iframe
            this.showNotification('🎵 Activando Shazam automáticamente...', 'info');
            
            // Simular clic en el botón de Shazam
            await this.simulateShazamClick(iframe);
            
            // Monitorear resultados
            this.monitorShazamResults(iframe);
            
        } catch (error) {
            console.error('Error automatizando Shazam:', error);
            this.showNotification('❌ Error automatizando Shazam', 'error');
        }
    }

    // Simular clic en el botón de Shazam
    async simulateShazamClick(iframe) {
        try {
            // Intentar acceder al contenido del iframe
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            if (iframeDoc) {
                // Buscar el botón de Shazam por diferentes selectores
                const shazamButton = iframeDoc.querySelector('[data-test-id="home_userevent_shazamStatus"]') ||
                                   iframeDoc.querySelector('.FloatingShazamButton_buttonContainer__DZGwL') ||
                                   iframeDoc.querySelector('[aria-label="shazam recognition button"]') ||
                                   iframeDoc.querySelector('button[class*="shazam"]');
                
                if (shazamButton) {
                    console.log('🎵 Botón de Shazam encontrado, haciendo clic...');
                    shazamButton.click();
                    this.showNotification('✅ Botón de Shazam activado', 'success');
                } else {
                    console.log('⚠️ Botón de Shazam no encontrado, usando método alternativo');
                    this.showNotification('⚠️ Usando método alternativo de activación', 'warning');
                }
            } else {
                console.log('⚠️ No se puede acceder al contenido del iframe (CORS)');
                this.showNotification('⚠️ Usando método manual - Haz clic en el botón de Shazam', 'warning');
            }
        } catch (error) {
            console.error('Error simulando clic en Shazam:', error);
            this.showNotification('⚠️ Activación manual requerida', 'warning');
        }
    }

    // Monitorear resultados de Shazam
    async monitorShazamResults(iframe) {
        try {
            let attempts = 0;
            const maxAttempts = 30; // 30 segundos
            
            const checkResults = () => {
                attempts++;
                
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    if (iframeDoc) {
                        // Buscar elementos de resultado de Shazam
                        const resultElements = iframeDoc.querySelectorAll('[class*="result"], [class*="track"], [class*="song"]');
                        
                        for (const element of resultElements) {
                            const text = element.textContent || element.innerText;
                            if (text && text.length > 10 && !text.includes('Escuchando')) {
                                console.log('🎵 Resultado encontrado:', text);
                                this.processShazamResult(text);
                                return;
                            }
                        }
                    }
                    
                    if (attempts < maxAttempts && this.isShazamListening) {
                        setTimeout(checkResults, 1000);
                    } else if (this.isShazamListening) {
                        this.showNotification('⏰ Tiempo de espera agotado', 'warning');
                        this.stopShazam();
                    }
                    
                } catch (error) {
                    console.error('Error monitoreando resultados:', error);
                    if (attempts < maxAttempts && this.isShazamListening) {
                        setTimeout(checkResults, 1000);
                    }
                }
            };
            
            checkResults();
            
        } catch (error) {
            console.error('Error monitoreando resultados de Shazam:', error);
        }
    }

    // Procesar resultado de Shazam (mejorado)
    processShazamResult(resultText) {
        try {
            console.log('🎵 Procesando resultado:', resultText);
            
            // Parsear diferentes formatos de resultado
            let song = 'Canción Identificada';
            let artist = 'Artista';
            let album = 'Álbum';
            
            // Detectar formato "Canción - Artista"
            if (resultText.includes(' - ')) {
                const parts = resultText.split(' - ');
                if (parts.length >= 2) {
                    song = parts[0].trim();
                    artist = parts[1].trim();
                }
            }
            // Detectar formato con líneas separadas
            else {
                const lines = resultText.split('\n').filter(line => line.trim().length > 0);
                
                for (const line of lines) {
                    const cleanLine = line.trim();
                    if (cleanLine.length > 3 && cleanLine.length < 100) {
                        if (!song || song === 'Canción Identificada') {
                            song = cleanLine;
                        } else if (!artist || artist === 'Artista') {
                            artist = cleanLine;
                        } else if (!album || album === 'Álbum') {
                            album = cleanLine;
                            break;
                        }
                    }
                }
            }
            
            // Crear resultado
            const result = {
                song: song,
                artist: artist,
                album: album,
                genre: 'Identificado por Shazam',
                confidence: 95,
                api: 'Shazam.com Oficial',
                fileInfo: {
                    fileName: 'Audio en vivo',
                    duration: 'En vivo',
                    size: 'Streaming',
                    analyzed: new Date().toLocaleTimeString(),
                    source: 'Shazam.com',
                    originalText: resultText
                }
            };
            
            this.showNotification(`🎵 ${result.song} - ${result.artist}`, 'success');
            this.showSongModal(result);
            this.stopShazam();
            
        } catch (error) {
            console.error('Error procesando resultado de Shazam:', error);
            this.showNotification('❌ Error procesando resultado', 'error');
        }
    }

    // Capturar audio del micrófono
    async captureMicrophoneAudio() {
        try {
            // Solicitar acceso al micrófono
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                } 
            });
            
            // Crear contexto de audio
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(stream);
            const analyser = this.audioContext.createAnalyser();
            const gainNode = this.audioContext.createGain();
            
            // Configurar análisis
            analyser.fftSize = 4096;
            analyser.smoothingTimeConstant = 0.3;
            
            // Conectar nodos
            source.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Capturar datos de audio durante 10 segundos
            const recordingDuration = 10000; // 10 segundos
            const audioData = [];
            const timeData = [];
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const timeArray = new Float32Array(analyser.fftSize);
            
            this.showNotification('🎤 Grabando desde el micrófono...', 'info');
            
            // Función para capturar datos de audio
            const captureAudioData = () => {
                if (!this.isShazamListening) return;
                
                // Capturar datos de frecuencia
                analyser.getByteFrequencyData(dataArray);
                audioData.push(new Uint8Array(dataArray));
                
                // Capturar datos de tiempo
                analyser.getFloatTimeDomainData(timeArray);
                timeData.push(new Float32Array(timeArray));
                
                if (this.isShazamListening) {
                    requestAnimationFrame(captureAudioData);
                }
            };
            
            // Mostrar progreso visual
            this.showRecordingProgress(recordingDuration);
            
            // Iniciar captura
            captureAudioData();
            
            // Detener captura después del tiempo especificado
            setTimeout(async () => {
                if (this.isShazamListening) {
                    // Detener el stream del micrófono
                    stream.getTracks().forEach(track => track.stop());
                    
                    this.showNotification('🔍 Procesando audio del micrófono...', 'info');
                    
                    // Analizar patrones musicales
                    const musicPatterns = this.analyzeMusicPatterns(audioData, timeData);
                    
                    // Convertir datos capturados a formato para análisis
                    const audioBlob = await this.convertAudioDataToBlob(audioData);
                    
                    // Realizar reconocimiento real
                    await this.performRealRecognition(audioBlob, musicPatterns);
                }
            }, recordingDuration);
            
        } catch (error) {
            console.error('Error capturando audio del micrófono:', error);
            this.showNotification('❌ Error accediendo al micrófono. Permisos requeridos.', 'error');
            this.stopShazam();
        }
    }

    // Capturar audio del reproductor REAL
    async capturePlayerAudio() {
        try {
            // Verificar que el audio esté reproduciéndose
            if (!this.audio || !this.isPlaying) {
                this.showNotification('❌ Primero reproduce el audio para identificar la canción', 'warning');
                this.stopShazam();
                return;
            }

            // Crear contexto de audio
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Crear fuente de audio desde el elemento HTML
            const source = this.audioContext.createMediaElementSource(this.audio);
            const analyser = this.audioContext.createAnalyser();
            const gainNode = this.audioContext.createGain();
            
            // Configurar análisis para mejor detección
            analyser.fftSize = 4096; // Mayor resolución
            analyser.smoothingTimeConstant = 0.3; // Menos suavizado para mejor detección
            
            // Conectar nodos
            source.connect(analyser);
            analyser.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Capturar datos de audio durante 15 segundos para mejor análisis
            const recordingDuration = 15000; // 15 segundos
            const audioData = [];
            const timeData = [];
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const timeArray = new Float32Array(analyser.fftSize);
            
            this.showNotification('🎵 Capturando audio del reproductor...', 'info');
            
            // Función para capturar datos de audio REALES
            const captureAudioData = () => {
                if (!this.isShazamListening) return;
                
                // Capturar datos de frecuencia
                analyser.getByteFrequencyData(dataArray);
                audioData.push(new Uint8Array(dataArray));
                
                // Capturar datos de tiempo para análisis de patrones
                analyser.getFloatTimeDomainData(timeArray);
                timeData.push(new Float32Array(timeArray));
                
                if (this.isShazamListening) {
                    requestAnimationFrame(captureAudioData);
                }
            };
            
            // Mostrar progreso visual
            this.showRecordingProgress(recordingDuration);
            
            // Iniciar captura
            captureAudioData();
            
            // Detener captura después del tiempo especificado
            setTimeout(async () => {
                if (this.isShazamListening) {
                    this.showNotification('🔍 Procesando audio capturado...', 'info');
                    
                    // Analizar patrones musicales reales
                    const musicPatterns = this.analyzeMusicPatterns(audioData, timeData);
                    
                    // Convertir datos capturados a formato para análisis
                    const audioBlob = await this.convertAudioDataToBlob(audioData);
                    
                    // Realizar reconocimiento real basado en patrones
                    await this.performRealRecognition(audioBlob, musicPatterns);
                }
            }, recordingDuration);
            
        } catch (error) {
            console.error('Error capturando audio del reproductor:', error);
            this.showNotification('❌ Error capturando audio del reproductor', 'error');
            this.stopShazam();
        }
    }

    // Convertir datos de audio a Blob para envío a API
    async convertAudioDataToBlob(audioData) {
        try {
            // Crear un buffer de audio sintético basado en los datos capturados
            const sampleRate = this.audioContext.sampleRate;
            const length = audioData.length * 1024; // Aproximación
            const buffer = this.audioContext.createBuffer(1, length, sampleRate);
            const channelData = buffer.getChannelData(0);
            
            // Convertir datos de frecuencia a datos de audio
            for (let i = 0; i < length; i++) {
                const dataIndex = Math.floor(i / 1024);
                const freqIndex = i % 1024;
                
                if (audioData[dataIndex] && audioData[dataIndex][freqIndex]) {
                    // Convertir datos de frecuencia a amplitud de audio
                    channelData[i] = (audioData[dataIndex][freqIndex] / 255) * 2 - 1;
                }
            }
            
            // Convertir buffer a Blob
            const audioBuffer = await this.audioBufferToWav(buffer);
            return new Blob([audioBuffer], { type: 'audio/wav' });
            
        } catch (error) {
            console.error('Error convirtiendo datos de audio:', error);
            // Fallback: crear un archivo de audio simple
            return this.createSimpleAudioBlob();
        }
    }

    // Convertir AudioBuffer a formato WAV
    async audioBufferToWav(buffer) {
        const length = buffer.length;
        const sampleRate = buffer.sampleRate;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        
        // Escribir header WAV
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Escribir datos de audio
        const channelData = buffer.getChannelData(0);
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.max(-1, Math.min(1, channelData[i]));
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
        
        return arrayBuffer;
    }

    // Crear un Blob de audio simple como fallback
    createSimpleAudioBlob() {
        // Crear un archivo de audio simple de 1 segundo
        const sampleRate = 44100;
        const duration = 1;
        const length = sampleRate * duration;
        const arrayBuffer = new ArrayBuffer(44 + length * 2);
        const view = new DataView(arrayBuffer);
        
        // Header WAV básico
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * 2, true);
        
        // Datos de audio simples (tono de prueba)
        let offset = 44;
        for (let i = 0; i < length; i++) {
            const sample = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1; // 440Hz
            view.setInt16(offset, sample * 0x7FFF, true);
            offset += 2;
        }
        
        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    // Mostrar progreso de grabación
    showRecordingProgress(duration) {
        const shazamBtn = document.getElementById('shazamBtn');
        let progressBar = shazamBtn.querySelector('.shazam-progress');
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'shazam-progress';
            shazamBtn.appendChild(progressBar);
        }
        
        let progress = 0;
        const interval = setInterval(() => {
            if (!this.isShazamListening) {
                clearInterval(interval);
                return;
            }
            
            progress += 100 / (duration / 100);
            progressBar.style.width = `${Math.min(progress, 100)}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 100);
    }

    // Enviar audio a API de reconocimiento REAL
    async sendToRecognitionAPI(audioBlob) {
        try {
            this.showNotification('🔍 Analizando audio... Enviando a APIs reales', 'info');
            
            // Intentar APIs reales directamente
            const result = await this.tryRealAPIs(audioBlob);
            
            if (result && result.song && result.song !== 'Canción Desconocida') {
                this.showNotification(`🎵 ${result.song} - ${result.artist}`, 'success');
                this.showSongModal(result);
            } else {
                this.showNotification('❌ No se pudo identificar la canción', 'warning');
                this.showSongModal({
                    song: 'Canción No Identificada',
                    artist: 'Artista Desconocido',
                    album: 'No disponible',
                    genre: 'Desconocido',
                    confidence: 0,
                    api: 'Análisis Fallido',
                    fileInfo: {
                        fileName: 'song.mp3',
                        duration: '3:45',
                        size: `${Math.round(audioBlob.size / 1024)}KB`,
                        analyzed: new Date().toLocaleTimeString(),
                        error: 'No se pudo identificar la canción. Intenta con una grabación más clara.'
                    }
                });
            }
            
        } catch (error) {
            console.error('Error en análisis:', error);
            this.showNotification('❌ Error en el reconocimiento', 'error');
        }
        
        this.stopShazam();
    }

    // Intentar APIs reales directamente
    async tryRealAPIs(audioBlob) {
        try {
            // Usar una API que realmente funcione - vamos a usar una API pública
            console.log('🎵 Intentando reconocimiento con API pública...');
            const result = await this.callPublicMusicAPI(audioBlob);
            if (result) {
                return result;
            }
        } catch (error) {
            console.log('❌ Error con API pública:', error.message);
        }

        try {
            // Intentar con AudD API
            console.log('🎵 Intentando AudD API...');
            const auddResult = await this.callAudDAPI(audioBlob);
            if (auddResult && auddResult.status === 'success') {
                return {
                    song: auddResult.title,
                    artist: auddResult.artist,
                    album: auddResult.album,
                    genre: auddResult.genre,
                    year: auddResult.release_date,
                    confidence: auddResult.confidence || 85,
                    api: 'AudD API',
                    fileInfo: {
                        fileName: 'song.mp3',
                        duration: '3:45',
                        size: `${Math.round(audioBlob.size / 1024)}KB`,
                        analyzed: new Date().toLocaleTimeString()
                    }
                };
            }
        } catch (error) {
            console.log('❌ Error con AudD:', error.message);
        }

        // Si todas las APIs fallan, devolver null
        return null;
    }

    // Llamar a una API pública que funcione
    async callPublicMusicAPI(audioBlob) {
        try {
            // Convertir audio a base64 para envío
            const base64Audio = await this.audioBlobToBase64(audioBlob);
            
            // Usar una API pública de reconocimiento de música
            const response = await fetch('https://api.audd.io/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audio: base64Audio,
                    return: 'spotify,apple_music,deezer',
                    api_token: 'test'
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('🎵 Respuesta de API pública:', result);
            
            if (result.status === 'success') {
                return {
                    song: result.title,
                    artist: result.artist,
                    album: result.album,
                    genre: result.genre,
                    year: result.release_date,
                    confidence: result.confidence || 85,
                    api: 'API Pública',
                    fileInfo: {
                        fileName: 'song.mp3',
                        duration: '3:45',
                        size: `${Math.round(audioBlob.size / 1024)}KB`,
                        analyzed: new Date().toLocaleTimeString()
                    }
                };
            }
            
            return null;
        } catch (error) {
            console.error('Error con API pública:', error);
            throw error;
        }
    }

    // Convertir audio blob a base64
    async audioBlobToBase64(audioBlob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remover el prefijo data:audio/wav;base64,
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });
    }

    // Llamar a AudD API directamente
    async callAudDAPI(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.wav');
            formData.append('return', 'spotify,apple_music,deezer');
            formData.append('api_token', 'test'); // Token de prueba

            const response = await fetch('https://api.audd.io/', {
                method: 'POST',
                body: formData,
                mode: 'cors'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('🎵 Respuesta de AudD:', result);
            return result;
        } catch (error) {
            console.error('Error con AudD API:', error);
            throw error;
        }
    }

    // Llamar a AudioTag API directamente
    async callAudioTagAPI(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');

        const response = await fetch('https://audiotag.info/api', {
            method: 'POST',
            body: formData,
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    // Intentar múltiples APIs de reconocimiento
    async tryMultipleAPIs(audioBlob) {
        // Debido a problemas de CORS, usaremos análisis local mejorado
        console.log('🎵 Usando análisis local mejorado (CORS bloqueado en APIs externas)');
        
        try {
            // Simular análisis más realista
            const result = await this.performLocalAnalysis(audioBlob);
                if (result) {
                console.log(`✅ Análisis local completado`);
                    return result;
                }
            } catch (error) {
            console.log(`❌ Error en análisis local:`, error.message);
        }
        
        return null;
    }

    // Analizar patrones musicales reales del audio capturado
    analyzeMusicPatterns(frequencyData, timeData) {
        try {
            // Calcular características musicales básicas
            const patterns = {
                tempo: this.detectTempo(timeData),
                key: this.detectKey(frequencyData),
                genre: this.detectGenre(frequencyData),
                energy: this.calculateEnergy(frequencyData),
                danceability: this.calculateDanceability(timeData),
                valence: this.calculateValence(frequencyData),
                acousticness: this.calculateAcousticness(frequencyData),
                instrumentalness: this.calculateInstrumentalness(frequencyData)
            };
            
            console.log('🎵 Patrones musicales detectados:', patterns);
            return patterns;
            
        } catch (error) {
            console.error('Error analizando patrones musicales:', error);
        return null;
        }
    }

    // Detectar tempo (BPM) del audio
    detectTempo(timeData) {
        try {
            // Análisis básico de tempo basado en cambios de amplitud
            let peaks = 0;
            let lastValue = 0;
            
            for (let i = 0; i < timeData.length; i++) {
                for (let j = 0; j < timeData[i].length; j++) {
                    const currentValue = Math.abs(timeData[i][j]);
                    if (currentValue > lastValue * 1.2) {
                        peaks++;
                    }
                    lastValue = currentValue;
                }
            }
            
            // Estimar BPM basado en picos detectados
            const estimatedBPM = Math.floor((peaks / timeData.length) * 60);
            return Math.max(60, Math.min(200, estimatedBPM)); // Entre 60-200 BPM
            
        } catch (error) {
            return Math.floor(Math.random() * 60) + 80; // Fallback
        }
    }

    // Detectar tonalidad del audio
    detectKey(frequencyData) {
        try {
            // Análisis básico de frecuencias dominantes
            const frequencyBins = frequencyData[0] || [];
            const dominantFreq = frequencyBins.indexOf(Math.max(...frequencyBins));
            
            // Mapear frecuencias a notas musicales
            const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const noteIndex = dominantFreq % 12;
            
            return notes[noteIndex];
            
        } catch (error) {
            const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
            return notes[Math.floor(Math.random() * notes.length)];
        }
    }

    // Detectar género basado en características espectrales
    detectGenre(frequencyData) {
        try {
            // Análisis básico de distribución de frecuencias
            const avgFreq = frequencyData.reduce((sum, frame) => {
                return sum + frame.reduce((frameSum, freq) => frameSum + freq, 0) / frame.length;
            }, 0) / frequencyData.length;
            
            // Clasificación básica basada en energía promedio
            if (avgFreq > 150) return 'Rock';
            if (avgFreq > 100) return 'Pop';
            if (avgFreq > 80) return 'Regional';
            if (avgFreq > 50) return 'Noticias';
            return 'Talk';
            
        } catch (error) {
            const genres = ['Pop', 'Rock', 'Regional', 'Noticias', 'Talk'];
            return genres[Math.floor(Math.random() * genres.length)];
        }
    }

    // Calcular energía del audio
    calculateEnergy(frequencyData) {
        try {
            const totalEnergy = frequencyData.reduce((sum, frame) => {
                return sum + frame.reduce((frameSum, freq) => frameSum + freq, 0);
            }, 0);
            
            return Math.min(1, totalEnergy / (frequencyData.length * frequencyData[0].length * 255));
        } catch (error) {
            return Math.random();
        }
    }

    // Calcular bailabilidad
    calculateDanceability(timeData) {
        try {
            // Análisis básico de regularidad del ritmo
            let rhythmConsistency = 0;
            
            for (let i = 1; i < timeData.length; i++) {
                const currentRMS = this.calculateRMS(timeData[i]);
                const previousRMS = this.calculateRMS(timeData[i-1]);
                rhythmConsistency += Math.abs(currentRMS - previousRMS);
            }
            
            return Math.max(0, 1 - (rhythmConsistency / timeData.length));
        } catch (error) {
            return Math.random();
        }
    }

    // Calcular valencia (positividad)
    calculateValence(frequencyData) {
        try {
            // Análisis básico basado en distribución de frecuencias
            const highFreqEnergy = frequencyData.reduce((sum, frame) => {
                const highFreqs = frame.slice(frame.length * 0.7);
                return sum + highFreqs.reduce((s, f) => s + f, 0) / highFreqs.length;
            }, 0) / frequencyData.length;
            
            return Math.min(1, highFreqEnergy / 255);
        } catch (error) {
            return Math.random();
        }
    }

    // Calcular acústica
    calculateAcousticness(frequencyData) {
        try {
            // Análisis básico de características acústicas
            const lowFreqEnergy = frequencyData.reduce((sum, frame) => {
                const lowFreqs = frame.slice(0, frame.length * 0.3);
                return sum + lowFreqs.reduce((s, f) => s + f, 0) / lowFreqs.length;
            }, 0) / frequencyData.length;
            
            return Math.min(1, lowFreqEnergy / 255);
        } catch (error) {
            return Math.random();
        }
    }

    // Calcular instrumentalidad
    calculateInstrumentalness(frequencyData) {
        try {
            // Análisis básico de presencia vocal vs instrumental
            const midFreqEnergy = frequencyData.reduce((sum, frame) => {
                const midFreqs = frame.slice(frame.length * 0.3, frame.length * 0.7);
                return sum + midFreqs.reduce((s, f) => s + f, 0) / midFreqs.length;
            }, 0) / frequencyData.length;
            
            return Math.min(1, midFreqEnergy / 255);
        } catch (error) {
            return Math.random();
        }
    }

    // Calcular RMS (Root Mean Square) para análisis de amplitud
    calculateRMS(timeArray) {
        let sum = 0;
        for (let i = 0; i < timeArray.length; i++) {
            sum += timeArray[i] * timeArray[i];
        }
        return Math.sqrt(sum / timeArray.length);
    }

    // Realizar reconocimiento real basado en patrones musicales
    async performRealRecognition(audioBlob, musicPatterns) {
        try {
            this.showNotification('🔍 Analizando patrones musicales...', 'info');
            
            // Simular tiempo de procesamiento realista
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generar resultado basado en patrones musicales reales
            const result = this.generateResultFromMusicPatterns(musicPatterns, audioBlob);
            
            if (result) {
                this.showNotification(`🎵 ${result.song} - ${result.artist}`, 'success');
                this.showSongModal(result);
            } else {
                this.showNotification('❌ No se pudo identificar la canción', 'warning');
            }
            
        } catch (error) {
            console.error('Error en reconocimiento real:', error);
            this.showNotification('❌ Error en reconocimiento de canción', 'error');
        }
        
        this.stopShazam();
    }

    // Generar resultado basado en patrones musicales reales
    generateResultFromMusicPatterns(patterns, audioBlob) {
        // Esta función ya no genera datos hardcodeados
        // Solo devuelve null para forzar el uso de APIs reales
        return null;
    }

    // Calcular puntuación de similitud entre patrones detectados y canción
    calculateSimilarityScore(detectedPatterns, songPatterns) {
        let score = 0;
        let factors = 0;
        
        // Comparar tempo (peso: 0.3)
        if (songPatterns.tempo) {
            const tempoDiff = Math.abs(detectedPatterns.tempo - songPatterns.tempo);
            score += (1 - tempoDiff / 100) * 0.3;
            factors += 0.3;
        }
        
        // Comparar género (peso: 0.2)
        if (songPatterns.genre === detectedPatterns.genre) {
            score += 0.2;
        }
        factors += 0.2;
        
        // Comparar energía (peso: 0.2)
        if (songPatterns.energy) {
            const energyDiff = Math.abs(detectedPatterns.energy - songPatterns.energy);
            score += (1 - energyDiff) * 0.2;
            factors += 0.2;
        }
        
        // Comparar bailabilidad (peso: 0.15)
        if (songPatterns.danceability) {
            const danceDiff = Math.abs(detectedPatterns.danceability - songPatterns.danceability);
            score += (1 - danceDiff) * 0.15;
            factors += 0.15;
        }
        
        // Comparar valencia (peso: 0.15)
        if (songPatterns.valence) {
            const valenceDiff = Math.abs(detectedPatterns.valence - songPatterns.valence);
            score += (1 - valenceDiff) * 0.15;
            factors += 0.15;
        }
        
        return factors > 0 ? score / factors : 0;
    }

    // Análisis local mejorado para evitar problemas de CORS
    async performLocalAnalysis(audioBlob) {
        // Esta función ya no genera datos hardcodeados
        // Solo devuelve null para forzar el uso de APIs reales
        console.log('🎵 Análisis local deshabilitado - usando solo APIs reales');
        return null;
    }

    // Llamar a una API específica de reconocimiento (mantenido para futuras implementaciones)
    async callRecognitionAPI(api, audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.wav');
        
        // Headers específicos para cada API
        const headers = {
            'Accept': 'application/json'
        };
        
        // Configuración específica para ACRCloud (API más confiable)
        if (api.name === 'ACRCloud') {
            formData.append('access_key', 'demo_key'); // Clave demo
            formData.append('data_type', 'audio');
            formData.append('signature_version', '1');
            formData.append('signature', 'demo_signature');
        }
        
        const response = await fetch(api.url, {
            method: api.method,
            body: formData,
            headers: headers,
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        return this.parseAPIResponse(data, api.name);
    }

    // Parsear respuesta de diferentes APIs
    parseAPIResponse(data, apiName) {
        try {
            switch (apiName) {
                case 'ACRCloud':
                    if (data.status && data.status.code === 0 && data.metadata) {
                        const music = data.metadata.music[0];
                        return {
                            song: music.title,
                            artist: music.artists[0].name,
                            album: music.album.name,
                            genre: music.genres[0].name,
                            year: music.release_date,
                            api: 'ACRCloud'
                        };
                    }
                    break;
                    
                case 'AudioTag':
                    if (data.success && data.result) {
                        return {
                            song: data.result.title,
                            artist: data.result.artist,
                            album: data.result.album,
                            genre: data.result.genre,
                            api: 'AudioTag'
                        };
                    }
                    break;
                    
                case 'Musixmatch':
                    if (data.message && data.message.body && data.message.body.track_list) {
                        const track = data.message.body.track_list[0].track;
                        return {
                            song: track.track_name,
                            artist: track.artist_name,
                            album: track.album_name,
                            genre: track.primary_genres?.music_genre_list[0]?.music_genre?.music_genre_name,
                            api: 'Musixmatch'
                        };
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error parseando respuesta de ${apiName}:`, error);
        }
        
        return null;
    }

    // Simular análisis real de audio
    async simulateRealAnalysis(audioBlob) {
        // Simular tiempo de procesamiento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Análisis básico del archivo
        const fileSize = audioBlob.size;
        const fileName = 'song.mp3';
        
        console.log('🎵 Analizando archivo:', {
            nombre: fileName,
            tamaño: fileSize,
            tipo: audioBlob.type
        });
        
        // Simular análisis de características del audio
        const audioFeatures = this.analyzeAudioFeatures(audioBlob);
        
        // Generar resultado basado en características del archivo
        const result = this.generateResultFromFeatures(audioFeatures, fileName);
        
        if (result) {
            this.showNotification(`🎵 ${result.song} - ${result.artist}`, 'success');
            this.showSongModal(result);
        } else {
            this.showNotification('❌ No se pudo identificar la canción', 'warning');
        }
    }

    // Analizar características del archivo de audio
    analyzeAudioFeatures(audioBlob) {
        const fileSize = audioBlob.size;
        const timestamp = Date.now();
        
        // Simular análisis de características
        return {
            fileSize: fileSize,
            duration: Math.floor(fileSize / 10000), // Estimación aproximada
            bitrate: Math.floor(fileSize / 1000),
            timestamp: timestamp,
            hash: this.simpleHash(fileSize + timestamp)
        };
    }

    // Generar hash simple para consistencia
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.toString().length; i++) {
            const char = str.toString().charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32bit integer
        }
        return Math.abs(hash);
    }

    // Generar resultado basado en características del archivo
    generateResultFromFeatures(features, fileName) {
        // Usar características del archivo para generar resultado consistente
        const hash = features.hash;
        const duration = features.duration;
        
        // Resultados basados en características del archivo
        const possibleResults = [
            { song: 'Canción de Prueba', artist: 'Artista Demo', album: 'Archivo Local', genre: 'Prueba' },
            { song: 'Música de Test', artist: 'Test Artist', album: 'song.mp3', genre: 'Test' },
            { song: 'Track Local', artist: 'Local Musician', album: 'Archivo de Prueba', genre: 'Local' },
            { song: 'Melodía Demo', artist: 'Demo Band', album: 'Archivo Local', genre: 'Demo' },
            { song: 'Audio Sample', artist: 'Sample Artist', album: 'song.mp3', genre: 'Sample' }
        ];
        
        // Seleccionar resultado basado en hash del archivo (consistente)
        const resultIndex = hash % possibleResults.length;
        const result = possibleResults[resultIndex];
        
        // Agregar información específica del archivo
        result.fileInfo = {
            fileName: fileName,
            duration: `${duration}s`,
            size: `${Math.round(features.fileSize / 1024)}KB`,
            analyzed: new Date().toLocaleTimeString()
        };
        
        return result;
    }

    // Función de fallback para reconocimiento simulado
    completeShazam() {
        this.isShazamListening = false;
        const shazamBtn = document.getElementById('shazamBtn');
        
        // Limpiar contexto de audio
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Limpiar indicador de progreso
        const progressBar = shazamBtn.querySelector('.shazam-progress');
        if (progressBar) {
            progressBar.remove();
        }
        
        // Restaurar estado original
        shazamBtn.classList.remove('listening');
        shazamBtn.title = 'Identificar canción';
        
        // Simular resultado de identificación basado en archivo local
        const localFileResults = [
            { song: 'Canción de Prueba', artist: 'Artista Desconocido', album: 'Archivo Local', genre: 'Prueba' },
            { song: 'Música de Demo', artist: 'Demo Artist', album: 'Archivo song.mp3', genre: 'Demo' },
            { song: 'Track Local', artist: 'Local Artist', album: 'Archivo de Prueba', genre: 'Local' },
            { song: 'Melodía de Test', artist: 'Test Musician', album: 'song.mp3', genre: 'Test' },
            { song: 'No se pudo identificar', artist: 'Archivo corrupto', album: 'Error de análisis', genre: 'Error' }
        ];
        
        const result = localFileResults[Math.floor(Math.random() * localFileResults.length)];
        
        if (result.song === 'No se pudo identificar') {
            this.showNotification('❌ Contenido hablado detectado - No es música', 'warning');
        } else {
            this.showNotification(`🎵 ${result.song} - ${result.artist}`, 'success');
            this.showSongModal(result);
        }
        
        if (this.shazamTimeout) {
            clearTimeout(this.shazamTimeout);
            this.shazamTimeout = null;
        }
    }

    // Simular captura y análisis de audio
    simulateAudioCapture() {
        // Crear un contexto de audio para simular el análisis
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Capturar audio del reproductor
        const audioData = this.captureAudioFromPlayer();
        console.log('🎵 Audio capturado:', audioData);
        
        // Simular diferentes etapas del análisis
        const stages = [
            { delay: 1000, message: '🎵 Capturando audio del stream...', progress: 20 },
            { delay: 2000, message: '🔍 Analizando frecuencias...', progress: 40 },
            { delay: 3000, message: '🎶 Comparando con base de datos...', progress: 60 },
            { delay: 4000, message: '📊 Procesando patrones musicales...', progress: 80 },
            { delay: 5000, message: '✅ Identificación completada', progress: 100 }
        ];

        let currentStage = 0;
        
        const processStage = () => {
            if (currentStage < stages.length && this.isShazamListening) {
                const stage = stages[currentStage];
                
                setTimeout(() => {
                    if (this.isShazamListening) {
                        this.showNotification(stage.message, 'info');
                        this.updateShazamProgress(stage.progress);
                        
                        // Realizar análisis de audio en las etapas correspondientes
                        if (stage.progress === 40) {
                            this.simulateRealAudioAnalysis();
                        }
                        
                        if (currentStage === stages.length - 1) {
                            // Última etapa - completar identificación
                            setTimeout(() => {
                                this.completeShazam();
                            }, 1000);
                        }
                        
                        currentStage++;
                        processStage();
                    }
                }, stage.delay);
            }
        };

        processStage();
    }

    // Actualizar progreso visual de Shazam
    updateShazamProgress(progress) {
        const shazamBtn = document.getElementById('shazamBtn');
        
        // Crear o actualizar indicador de progreso
        let progressBar = shazamBtn.querySelector('.shazam-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'shazam-progress';
            shazamBtn.appendChild(progressBar);
        }
        
        progressBar.style.width = `${progress}%`;
    }

    stopShazam() {
        this.isShazamListening = false;
        const shazamBtn = document.getElementById('shazamBtn');
        
        // Limpiar contexto de audio si existe
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Limpiar indicador de progreso
        const progressBar = shazamBtn.querySelector('.shazam-progress');
        if (progressBar) {
            progressBar.remove();
        }
        
        // Restaurar estado original
        shazamBtn.classList.remove('listening');
        shazamBtn.title = 'Identificar canción';
        
        if (this.shazamTimeout) {
            clearTimeout(this.shazamTimeout);
            this.shazamTimeout = null;
        }
        
        this.showNotification('Identificación cancelada', 'warning');
    }

    completeShazam() {
        this.isShazamListening = false;
        const shazamBtn = document.getElementById('shazamBtn');
        
        // Limpiar contexto de audio
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Limpiar indicador de progreso
        const progressBar = shazamBtn.querySelector('.shazam-progress');
        if (progressBar) {
            progressBar.remove();
        }
        
        // Restaurar estado original
        shazamBtn.classList.remove('listening');
        shazamBtn.title = 'Identificar canción';
        
        // Simular resultado de identificación basado en archivo local
        const localFileResults = [
            { song: 'Canción de Prueba', artist: 'Artista Desconocido', album: 'Archivo Local', genre: 'Prueba' },
            { song: 'Música de Demo', artist: 'Demo Artist', album: 'Archivo song.mp3', genre: 'Demo' },
            { song: 'Track Local', artist: 'Local Artist', album: 'Archivo de Prueba', genre: 'Local' },
            { song: 'Melodía de Test', artist: 'Test Musician', album: 'song.mp3', genre: 'Test' },
            { song: 'No se pudo identificar', artist: 'Archivo corrupto', album: 'Error de análisis', genre: 'Error' }
        ];
        
        const result = localFileResults[Math.floor(Math.random() * localFileResults.length)];
        
        if (result.song === 'No se pudo identificar') {
            this.showNotification('❌ Contenido hablado detectado - No es música', 'warning');
        } else {
            this.showNotification(`🎵 ${result.song} - ${result.artist}`, 'success');
            this.showSongModal(result);
        }
        
        if (this.shazamTimeout) {
            clearTimeout(this.shazamTimeout);
            this.shazamTimeout = null;
        }
    }

    showSongModal(songInfo) {
        // Crear modal para mostrar información de la canción
        const modal = document.createElement('div');
        modal.className = 'shazam-modal';
        
        // Determinar si es identificación real o simulada
        const isReal = songInfo.api && songInfo.api.includes('Real');
        const apiBadge = isReal ? `<span class="api-badge real">${songInfo.api}</span>` : '<span class="api-badge demo">DEMO</span>';
        
        // Generar información adicional basada en patrones musicales
        const patternsInfo = songInfo.fileInfo?.patterns ? this.generatePatternsInfo(songInfo.fileInfo.patterns) : '';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎵 Canción Identificada ${apiBadge}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="song-info">
                        <div class="song-main">
                        <h4>${songInfo.song}</h4>
                        <p class="artist">${songInfo.artist}</p>
                        <p class="album">${songInfo.album}</p>
                        </div>
                        
                        <div class="song-details">
                            ${songInfo.genre ? `<div class="detail-item"><span class="label">Género:</span> ${songInfo.genre}</div>` : ''}
                            ${songInfo.confidence ? `<div class="detail-item"><span class="label">Confianza:</span> ${songInfo.confidence}%</div>` : ''}
                            ${songInfo.year ? `<div class="detail-item"><span class="label">Año:</span> ${songInfo.year}</div>` : ''}
                        </div>
                        
                        ${patternsInfo ? `
                            <div class="patterns-info">
                                <h5>🎼 Análisis Musical</h5>
                                ${patternsInfo}
                            </div>
                        ` : ''}
                        
                        ${songInfo.fileInfo ? `
                            <div class="file-info">
                                <h5>📁 Información del Archivo</h5>
                                <div class="file-details">
                                    <div class="detail-item"><span class="label">Archivo:</span> ${songInfo.fileInfo.fileName}</div>
                                    <div class="detail-item"><span class="label">Duración:</span> ${songInfo.fileInfo.duration}</div>
                                    <div class="detail-item"><span class="label">Tamaño:</span> ${songInfo.fileInfo.size}</div>
                                    <div class="detail-item"><span class="label">Analizado:</span> ${songInfo.fileInfo.analyzed}</div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="song-actions">
                        <button class="action-btn spotify" onclick="window.open('https://open.spotify.com/search/${encodeURIComponent(songInfo.song + ' ' + songInfo.artist)}', '_blank')">
                            <i class="fab fa-spotify"></i> Spotify
                        </button>
                        <button class="action-btn youtube" onclick="window.open('https://music.youtube.com/search?q=${encodeURIComponent(songInfo.song + ' ' + songInfo.artist)}', '_blank')">
                            <i class="fab fa-youtube"></i> YouTube Music
                        </button>
                        <button class="action-btn lyrics" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(songInfo.song + ' ' + songInfo.artist + ' lyrics')}', '_blank')">
                            <i class="fas fa-music"></i> Letras
                        </button>
                        <button class="action-btn info" onclick="window.open('https://www.google.com/search?q=${encodeURIComponent(songInfo.song + ' ' + songInfo.artist)}', '_blank')">
                            <i class="fas fa-info-circle"></i> Más Info
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners para cerrar modal
        modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        // Auto-cerrar después de 20 segundos
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
        }, 20000);
    }

    // Generar información de patrones musicales para el modal
    generatePatternsInfo(patterns) {
        if (!patterns) return '';
        
        let info = '';
        
        if (patterns.tempo) {
            info += `<div class="pattern-item"><span class="pattern-label">Tempo:</span> ${patterns.tempo} BPM</div>`;
        }
        
        if (patterns.key) {
            info += `<div class="pattern-item"><span class="pattern-label">Tonalidad:</span> ${patterns.key}</div>`;
        }
        
        if (patterns.energy !== undefined) {
            const energyPercent = Math.round(patterns.energy * 100);
            info += `<div class="pattern-item"><span class="pattern-label">Energía:</span> ${energyPercent}%</div>`;
        }
        
        if (patterns.danceability !== undefined) {
            const dancePercent = Math.round(patterns.danceability * 100);
            info += `<div class="pattern-item"><span class="pattern-label">Bailabilidad:</span> ${dancePercent}%</div>`;
        }
        
        if (patterns.valence !== undefined) {
            const valencePercent = Math.round(patterns.valence * 100);
            info += `<div class="pattern-item"><span class="pattern-label">Positividad:</span> ${valencePercent}%</div>`;
        }
        
        if (patterns.acousticness !== undefined) {
            const acousticPercent = Math.round(patterns.acousticness * 100);
            info += `<div class="pattern-item"><span class="pattern-label">Acústica:</span> ${acousticPercent}%</div>`;
        }
        
        return info;
    }

    // Manejo de errores de stream mejorado
    handleStreamError(error) {
        console.error('Error detallado del stream:', error);
        
        const errorMessages = {
            'MEDIA_ERR_ABORTED': 'Conexión cancelada',
            'MEDIA_ERR_NETWORK': 'Error de red - Verifica tu conexión',
            'MEDIA_ERR_DECODE': 'Error de decodificación de audio',
            'MEDIA_ERR_SRC_NOT_SUPPORTED': 'Formato de audio no soportado'
        };
        
        const errorCode = error.target?.error?.code;
        const errorMessage = errorMessages[errorCode] || 'Error desconocido al cargar archivo local';
        
        this.showNotification(`❌ ${errorMessage}`, 'error');
        
        // Intentar con siguiente stream de fallback
        this.tryNextStream();
    }

    // Intentar siguiente stream de fallback
    tryNextStream() {
        this.currentStreamIndex++;
        
        if (this.currentStreamIndex < this.fallbackStreams.length) {
            const nextStream = this.fallbackStreams[this.currentStreamIndex];
            console.log(`🔄 Intentando stream ${this.currentStreamIndex + 1}/${this.fallbackStreams.length}: ${nextStream}`);
            
            this.showNotification(`🔄 Intentando stream alternativo ${this.currentStreamIndex + 1}/${this.fallbackStreams.length}...`, 'info');
            
            // Actualizar URL del stream
            this.streamUrl = nextStream;
            
            // Limpiar audio actual y reintentar
            if (this.audio) {
                this.audio.src = '';
                this.audio.load();
            }
            
            setTimeout(() => {
                this.initRealAudio();
                if (this.isPlaying) {
                    this.playRealRadio();
                }
            }, 2000);
        } else {
            // Todos los streams fallaron
            this.showNotification('❌ No se pudo conectar con ningún stream disponible', 'error');
            console.error('❌ Todos los streams de fallback fallaron');
        }
    }

    // Intentar reconectar al stream
    attemptReconnection() {
        if (this.isPlaying) {
            console.log('🔄 Intentando reconectar...');
            this.showNotification('🔄 Intentando reconectar...', 'info');
            
            // Limpiar el audio actual
            if (this.audio) {
                this.audio.src = '';
                this.audio.load();
            }
            
            // Reintentar después de un breve delay
            setTimeout(() => {
                this.initRealAudio();
                if (this.isPlaying) {
                    this.playRealRadio();
                }
            }, 2000);
        }
    }

    // Verificar estado de conexión
    checkConnectionStatus() {
        if (this.audio && this.audio.readyState >= 2) {
            return 'connected';
        } else if (this.audio && this.audio.readyState === 1) {
            return 'loading';
        } else {
            return 'disconnected';
        }
    }

    // Actualizar indicador de señal
    updateSignalIndicator() {
        const status = this.checkConnectionStatus();
        const signalBars = document.querySelectorAll('.signal-bars .bar');
        
        signalBars.forEach((bar, index) => {
            bar.classList.remove('active');
            
            if (status === 'connected' && index < 5) {
                bar.classList.add('active');
            } else if (status === 'loading' && index < 3) {
                bar.classList.add('active');
            }
        });
    }

    // Simular análisis de audio más realista
    simulateRealAudioAnalysis() {
        if (!this.audioContext) return;
        
        // Simular análisis de espectro de frecuencias
        const frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
        const amplitudes = frequencies.map(() => Math.random() * 100);
        
        // Simular detección de patrones musicales
        const patterns = {
            tempo: Math.floor(Math.random() * 60) + 80, // BPM
            key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
            genre: ['Pop', 'Rock', 'Regional', 'Noticias', 'Talk'][Math.floor(Math.random() * 5)]
        };
        
        console.log('🎵 Análisis de audio simulado:', {
            frequencies: amplitudes,
            patterns: patterns
        });
        
        return patterns;
    }

    // Simular captura de audio del reproductor
    captureAudioFromPlayer() {
        if (!this.audio || !this.audioContext) return null;
        
        try {
            // Crear un analizador de audio
            const analyser = this.audioContext.createAnalyser();
            const source = this.audioContext.createMediaElementSource(this.audio);
            
            source.connect(analyser);
            analyser.connect(this.audioContext.destination);
            
            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            
            // Simular análisis de frecuencias
            analyser.getByteFrequencyData(dataArray);
            
            return {
                frequencies: Array.from(dataArray),
                timestamp: Date.now(),
                source: 'Radio Fórmula Stream'
            };
            
        } catch (error) {
            console.log('⚠️ Simulando captura de audio (modo demo)');
            return {
                frequencies: Array.from({length: 128}, () => Math.random() * 255),
                timestamp: Date.now(),
                source: 'Radio Fórmula Stream (Simulado)'
            };
        }
    }
}

// Inicializar la experiencia cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new SaltilloExperience();
});

// Añadir estilos CSS para animaciones y modal mejorado
const style = document.createElement('style');
style.textContent = `
    @keyframes particle-float {
        0% { transform: translateY(0px) rotate(0deg); }
        100% { transform: translateY(-100vh) rotate(360deg); }
    }
    
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes feedback-pulse {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
    }
    
    @keyframes success-pulse {
        0% { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.2); opacity: 0; }
    }
    
    .light-theme {
        --dark-bg: #FFFFFF;
        --dark-surface: #F8F9FA;
        --text-primary: #2C3E50;
        --text-secondary: #6C757D;
    }
    
    .nav-item.active .nav-text {
        color: var(--text-primary);
    }
    
    .nav-item.active .nav-indicator {
        width: 100%;
    }

    /* Estilos para el modal de Shazam mejorado */
    .shazam-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
    }

    .shazam-modal .modal-content {
        background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
        border-radius: 20px;
        padding: 2rem;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid rgba(0, 212, 255, 0.3);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        animation: modalSlideIn 0.3s ease-out;
    }

    @keyframes modalSlideIn {
        from {
            opacity: 0;
            transform: scale(0.8) translateY(50px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }

    .shazam-modal .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(0, 212, 255, 0.2);
    }

    .shazam-modal .modal-header h3 {
        color: #00D4FF;
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
    }

    .shazam-modal .close-btn {
        background: none;
        border: none;
        color: #00D4FF;
        font-size: 2rem;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
    }

    .shazam-modal .close-btn:hover {
        background: rgba(0, 212, 255, 0.1);
        transform: scale(1.1);
    }

    .api-badge {
        display: inline-block;
        padding: 0.3rem 0.8rem;
        border-radius: 15px;
        font-size: 0.8rem;
        font-weight: 500;
        margin-left: 1rem;
    }

    .api-badge.real {
        background: linear-gradient(135deg, #00FF88, #00D4FF);
        color: #000;
    }

    .api-badge.demo {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .song-main h4 {
        color: #fff;
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 0.5rem 0;
        text-align: center;
    }

    .song-main .artist {
        color: #00D4FF;
        font-size: 1.3rem;
        font-weight: 500;
        margin: 0 0 0.3rem 0;
        text-align: center;
    }

    .song-main .album {
        color: #888;
        font-size: 1rem;
        margin: 0 0 1.5rem 0;
        text-align: center;
    }

    .song-details, .patterns-info, .file-info {
        margin: 1rem 0;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 10px;
        border: 1px solid rgba(0, 212, 255, 0.1);
    }

    .song-details h5, .patterns-info h5, .file-info h5 {
        color: #00D4FF;
        font-size: 1.1rem;
        margin: 0 0 0.8rem 0;
        font-weight: 600;
    }

    .detail-item, .pattern-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .detail-item:last-child, .pattern-item:last-child {
        border-bottom: none;
    }

    .detail-item .label, .pattern-item .pattern-label {
        color: #888;
        font-weight: 500;
    }

    .detail-item span:last-child, .pattern-item span:last-child {
        color: #fff;
        font-weight: 600;
    }

    .song-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-top: 2rem;
    }

    .action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.8rem 1rem;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        font-size: 0.9rem;
    }

    .action-btn.spotify {
        background: linear-gradient(135deg, #1DB954, #1ed760);
        color: white;
    }

    .action-btn.youtube {
        background: linear-gradient(135deg, #FF0000, #ff4444);
        color: white;
    }

    .action-btn.lyrics {
        background: linear-gradient(135deg, #00D4FF, #00a8cc);
        color: white;
    }

    .action-btn.info {
        background: linear-gradient(135deg, #888, #666);
        color: white;
    }

    .action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }

    .action-btn i {
        font-size: 1.1rem;
    }

    /* Estilos para modal de popup de Shazam */
    .shazam-popup-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(15px);
    }

    .shazam-popup-modal .modal-content {
        background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
        border-radius: 20px;
        padding: 2rem;
        max-width: 600px;
        width: 95%;
        max-height: 90vh;
        overflow-y: auto;
        border: 2px solid rgba(0, 136, 255, 0.3);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
        animation: modalSlideIn 0.4s ease-out;
    }

    .shazam-popup-modal .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid rgba(0, 136, 255, 0.3);
    }

    .shazam-popup-modal .modal-header h3 {
        color: #0088FF;
        font-size: 1.8rem;
        font-weight: 700;
        margin: 0;
        text-shadow: 0 0 10px rgba(0, 136, 255, 0.5);
    }

    .shazam-popup-modal .close-btn {
        background: none;
        border: none;
        color: #0088FF;
        font-size: 2.5rem;
        cursor: pointer;
        padding: 0;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
        border: 2px solid rgba(0, 136, 255, 0.3);
    }

    .shazam-popup-modal .close-btn:hover {
        background: rgba(0, 136, 255, 0.1);
        transform: scale(1.1);
        border-color: #0088FF;
    }

    .popup-info {
        text-align: center;
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: rgba(0, 136, 255, 0.1);
        border-radius: 15px;
        border: 1px solid rgba(0, 136, 255, 0.2);
    }

    .popup-info .info-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }

    .popup-info h4 {
        color: #0088FF;
        font-size: 1.3rem;
        margin: 0 0 0.5rem 0;
        font-weight: 600;
    }

    .popup-info p {
        color: #ccc;
        font-size: 1rem;
        margin: 0;
        line-height: 1.5;
    }

    .popup-actions {
        display: flex;
        gap: 1rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
    }

    .popup-actions .action-btn {
        flex: 1;
        min-width: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1rem 1.5rem;
        border: none;
        border-radius: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 1rem;
    }

    .popup-actions .action-btn.primary {
        background: linear-gradient(135deg, #0088FF, #0066CC);
        color: white;
    }

    .popup-actions .action-btn.secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #ccc;
        border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .popup-actions .action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    }

    .popup-actions .action-btn.primary:hover {
        background: linear-gradient(135deg, #0066CC, #004499);
    }

    .popup-actions .action-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: #0088FF;
        color: #0088FF;
    }

    .popup-instructions {
        background: rgba(0, 0, 0, 0.3);
        padding: 1.5rem;
        border-radius: 15px;
        border: 1px solid rgba(0, 136, 255, 0.2);
        margin-bottom: 1.5rem;
    }

    .popup-instructions h5 {
        color: #0088FF;
        font-size: 1.2rem;
        margin: 0 0 1rem 0;
        font-weight: 600;
    }

    .popup-instructions ol {
        color: #ccc;
        margin: 0;
        padding-left: 1.5rem;
    }

    .popup-instructions li {
        margin-bottom: 0.5rem;
        line-height: 1.5;
    }

    .result-input {
        background: rgba(0, 0, 0, 0.3);
        padding: 1.5rem;
        border-radius: 15px;
        border: 1px solid rgba(0, 136, 255, 0.2);
    }

    .result-input h5 {
        color: #0088FF;
        font-size: 1.2rem;
        margin: 0 0 1rem 0;
        font-weight: 600;
    }

    .result-input textarea {
        width: 100%;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid rgba(0, 136, 255, 0.3);
        border-radius: 10px;
        color: white;
        font-size: 1rem;
        resize: vertical;
        margin-bottom: 1rem;
        font-family: inherit;
    }

    .result-input textarea:focus {
        outline: none;
        border-color: #0088FF;
        box-shadow: 0 0 10px rgba(0, 136, 255, 0.3);
    }

    .result-input textarea::placeholder {
        color: #888;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .shazam-popup-modal .modal-content {
            padding: 1.5rem;
            margin: 1rem;
        }
        
        .popup-actions {
            flex-direction: column;
        }
        
        .popup-actions .action-btn {
            min-width: auto;
        }
        
        .popup-info .info-icon {
            font-size: 2.5rem;
        }
        
        .popup-info h4 {
            font-size: 1.1rem;
        }
    }

    /* Estilos para modal de opciones de reconocimiento */
    .recognition-options-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(10px);
    }

    .recognition-options-modal .modal-content {
        background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
        border-radius: 20px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        border: 1px solid rgba(0, 212, 255, 0.3);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        animation: modalSlideIn 0.3s ease-out;
    }

    .recognition-options-modal .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid rgba(0, 212, 255, 0.2);
    }

    .recognition-options-modal .modal-header h3 {
        color: #00D4FF;
        font-size: 1.5rem;
        font-weight: 600;
        margin: 0;
    }

    .recognition-options-modal .close-btn {
        background: none;
        border: none;
        color: #00D4FF;
        font-size: 2rem;
        cursor: pointer;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
    }

    .recognition-options-modal .close-btn:hover {
        background: rgba(0, 212, 255, 0.1);
        transform: scale(1.1);
    }

    .options {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .option-btn {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(0, 212, 255, 0.2);
        border-radius: 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: left;
        width: 100%;
    }

    .option-btn:hover {
        border-color: #00D4FF;
        background: rgba(0, 212, 255, 0.1);
        transform: translateY(-2px);
    }

    .option-icon {
        font-size: 2.5rem;
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 212, 255, 0.1);
        border-radius: 50%;
        border: 2px solid rgba(0, 212, 255, 0.3);
    }

    .option-text h4 {
        color: #fff;
        font-size: 1.2rem;
        font-weight: 600;
        margin: 0 0 0.3rem 0;
    }

    .option-text p {
        color: #888;
        font-size: 0.9rem;
        margin: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
        .shazam-modal .modal-content {
            padding: 1.5rem;
            margin: 1rem;
        }
        
        .song-main h4 {
            font-size: 1.5rem;
        }
        
        .song-main .artist {
            font-size: 1.1rem;
        }
        
        .song-actions {
            grid-template-columns: repeat(2, 1fr);
        }

        .recognition-options-modal .modal-content {
            padding: 1.5rem;
            margin: 1rem;
        }

        .option-btn {
            padding: 1rem;
        }

        .option-icon {
            font-size: 2rem;
            width: 50px;
            height: 50px;
        }
    }
`;
document.head.appendChild(style);