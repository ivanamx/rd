/**
 * Sistema de internacionalización — Hecho en Saltillo
 * Idiomas: español (es) e inglés (en)
 */
(function () {
    const TRANSLATIONS = {
        es: {
            meta: {
                title: 'Hecho en Saltillo - Experiencia Inmersiva'
            },
            nav: {
                home: 'INICIO',
                radio: 'RADIO',
                bands: 'BANDAS',
                register: 'REGÍSTRATE',
                products: 'PRODUCTOS'
            },
            hero: {
                badge: 'EN VIVO · SALTILLO',
                title1: 'DESIERTO',
                title2: 'SONORO',
                subtitle: 'La escena musical de Saltillo, conectada en un solo lugar. Escucha radio en vivo, reserva bandas para tu bar, graba en estudios profesionales y descubre creadores locales.',
                listen: 'ESCUCHAR',
                products: 'PRODUCTOS',
                transmission: 'TRANSMISIÓN',
                streaming: 'STREAMING',
                years: 'AÑOS',
                scroll: 'SCROLL'
            },
            radio: {
                titleMain: 'RADIO',
                titleSub: 'SALTILLO',
                tagline: 'Streaming en vivo · Música local · Cultura del desierto',
                live: 'EN VIVO',
                nowPlaying: 'Ahora suena',
                nowTrack: 'Desierto Sonoro — Radio Saltillo',
                playTitle: 'Reproducir',
                stopTitle: 'Detener',
                cardGaryBadge: 'Desert Rock · 5.0 ★',
                cardGaryDesc: 'Rock psicodélico del desierto coahuilense. Escucha muestras y reserva para tu evento.',
                cardGaryCta: 'Ver perfil y reservar',
                cardEstudioBadge: 'Estudio',
                cardEstudioTitle: 'Reserva un estudio',
                cardEstudioDesc: 'Cabina de grabación equipada con mezcla, microfonía y monitores profesionales',
                cardEstudioCta: 'Reservar sesión',
                cardClasesBadge: 'Academia',
                cardClasesTitle: 'Clases de música',
                cardClasesDesc: 'Guitarra, batería, voz y producción con maestros locales de Saltillo',
                cardClasesCta: 'Inscribirme',
                cardScheduleBadge: 'Hoy',
                cardScheduleTitle: 'Programación',
                cardEntrevistasBadge: 'Podcast',
                cardEntrevistasTitle: 'Entrevistas',
                cardEntrevistasDesc: 'Artesanos, chefs y creadores saltillenses',
                cardEntrevistasCta: 'Escuchar'
            },
            guia: {
                titleMain: 'ÚNETE',
                titleSub: 'A LA ESCENA',
                intro: 'Tu escenario, tu bar, tu negocio. Descubre cómo unirte, conectar y sacar provecho de la escena musical de Saltillo.',
                tabBanda: 'Soy banda',
                tabBar: 'Soy bar o restaurante',
                statBands: 'Bandas activas',
                statVenues: 'Bares y venues',
                statMinutes: 'Minutos para reservar',
                statLocal: '% talento local'
            },
            contact: {
                titleMain: 'CONECTA',
                titleSub: 'CON NOSOTROS',
                bandasBadge: 'Bandas locales',
                bandasTitle: '¿Tu banda quiere ganar dinero $?',
                bandasDesc: 'Regístrate, sube tus muestras y empieza a recibir reservas en bares y eventos de Saltillo.',
                bandasCta: 'Registra tu banda',
                baresBadge: 'Bares & restaurantes',
                baresTitle: '¿Tu lugar necesita música hoy?',
                baresDesc: 'Encuentra bandas disponibles para esta noche, reserva en minutos y llena tu local con talento local.',
                baresCta: 'Buscar bandas',
                mapBtn: 'Ver mapa'
            },
            footer: {
                tagline: 'Orgullo local, innovación digital',
                copyright: '© 2024 Hecho en Saltillo. Todos los derechos reservados.'
            },
            common: {
                back: 'Atrás',
                continue: 'Continuar',
                reserve: 'Reservar',
                choosePlan: 'Elegir plan',
                payStripe: 'Pagar con Stripe',
                paySecure: 'Pago seguro procesado por Stripe',
                processing: 'Procesando...',
                available: 'Disponible',
                unavailable: 'No disponible',
                total: 'Total',
                play: 'Reproducir',
                share: 'Compartir',
                stop: 'Detener',
                today: 'Hoy',
                from: 'desde',
                perHour: '/hora',
                perHr: '/hr',
                min: 'Mín.',
                all: 'Todos',
                allGenres: 'Todos los géneros',
                allTypes: 'Todos los tipos',
                loading: 'Cargando...',
                events: 'eventos',
                bandsCount: 'bandas',
                people: 'pers.',
                musicToday: 'Música hoy',
                musicTodayShort: '🎵 Música hoy',
                musicTodayLive: '🎵 Hoy',
                online: 'En línea',
                inPerson: 'Presencial'
            },
            shazam: {
                listening: 'Escuchando...',
                songTitle: 'Título de la canción',
                artistName: 'Nombre del artista',
                stopIdentify: 'Detener identificación',
                identifyMusic: 'Identificar música',
                capturing: 'Capturando audio...',
                listeningRadio: 'Escuchando radio (8 seg)...',
                analyzing: 'Analizando con Shazam...',
                analyzingShort: 'Analizando...',
                sending: 'Enviando...',
                gettingResults: 'Obteniendo resultados...',
                noMusic: 'No se detectó música',
                recognitionError: 'Error en reconocimiento',
                identifications: '{{count}} identificaciones',
                shareTitle: 'Canción identificada con Shazam',
                sharePrefix: '🎵 Escuché "{{title}}" de {{artist}}',
                shareAlbum: ' del álbum "{{album}}"',
                shareShazamCount: ' - {{count}} identificaciones en Shazam',
                shareSuffix: ' en Radio Saltillo',
                searching: '🎵 Buscando: {{title}} - {{artist}}'
            },
            bandas: {
                title: 'Reservar Banda Local',
                stepBand: 'Banda',
                stepProfile: 'Perfil',
                stepDate: 'Fecha',
                stepPay: 'Pago',
                searchPlaceholder: 'Buscar por nombre...',
                loading: 'Cargando bandas...',
                loadError: 'No se pudieron cargar las bandas. Verifica que el servidor esté activo.',
                notFound: 'No se encontraron bandas con esos criterios',
                playSample: 'Reproducir muestra',
                audioSample: 'Muestra de audio',
                noSamples: 'Sin muestras disponibles aún',
                listenSamples: 'Escucha muestras',
                playedIn: 'Ha tocado en Saltillo',
                noVenues: 'Sin registros de venues',
                reserveBand: 'Reservar esta banda',
                selectDate: 'Selecciona una fecha disponible',
                labelBand: 'Banda',
                labelGenre: 'Género',
                labelDuration: 'Duración',
                labelEventDate: 'Fecha del evento'
            },
            registroBanda: {
                title: 'Registra tu banda',
                subtitle: 'Completa tu perfil para aparecer en el mapa y recibir reservas. Te notificaremos por WhatsApp.',
                sectionBand: 'Datos de la banda',
                sectionContact: 'Contacto y WhatsApp',
                sectionMedia: 'Foto y muestras',
                sectionExtra: 'Ubicación',
                labelName: 'Nombre de la banda',
                labelGenre: 'Género musical',
                labelDescription: 'Descripción',
                labelPrice: 'Precio por evento (MXN)',
                labelDuration: 'Duración del show',
                labelContact: 'Nombre del contacto',
                labelPhone: 'Teléfono WhatsApp',
                labelEmail: 'Correo electrónico',
                labelCover: 'Foto de portada',
                labelSamples: 'Muestras de audio',
                labelVenues: 'Lugares donde han tocado',
                hintDescription: 'Cuéntales a los venues qué estilo traes y para qué eventos eres ideal.',
                hintPhone: '10 dígitos. Usaremos este número para avisarte de reservas y mensajes.',
                hintEmail: 'Opcional, pero recomendado para confirmaciones.',
                hintCover: 'JPG o PNG, máx. 5 MB',
                hintSamples: 'MP3 u otros formatos de audio. Puedes subir varias.',
                hintVenues: 'Opcional. Ej: Bar El Callejón, Plaza de Armas…',
                placeholderName: 'Ej. Los del Desierto',
                placeholderDescription: 'Describe tu estilo, repertorio y tipo de eventos…',
                placeholderContact: 'Tu nombre o del representante',
                placeholderPhone: '844 123 4567',
                placeholderEmail: 'banda@ejemplo.com',
                placeholderVenues: 'Separa los lugares con comas',
                selectGenre: 'Selecciona un género',
                selectDuration: 'Selecciona duración',
                duration1h: '1 hora',
                duration2h: '2 horas',
                duration3h: '3 horas',
                duration4h: '4+ horas',
                uploadCover: 'Subir foto de portada',
                uploadSamples: 'Subir muestras de audio',
                whatsappConsent: 'Acepto recibir notificaciones por WhatsApp sobre reservas y la plataforma',
                termsConsent: 'Acepto los términos de uso de Desierto Sonoro',
                cancel: 'Cancelar',
                submit: 'Enviar registro',
                submitting: 'Enviando…',
                successTitle: '¡Registro recibido!',
                successDesc: 'Revisaremos tu perfil y te contactaremos por WhatsApp en las próximas 24 horas para activar tu banda en la plataforma.',
                successClose: 'Entendido',
                errorRequired: 'Este campo es obligatorio',
                errorPhone: 'Ingresa un teléfono válido de 10 dígitos',
                errorEmail: 'Ingresa un correo válido',
                errorChecks: 'Debes aceptar las condiciones para continuar'
            },
            registroBar: {
                title: 'Registra tu bar',
                subtitle: 'Para buscar y reservar bandas en Desierto Sonoro, primero debes registrar tu local.',
                infoCallout: 'Solo los bares y restaurantes registrados pueden explorar el catálogo de bandas, ver disponibilidad y confirmar reservas. Completa el formulario y te activamos en minutos.',
                sectionVenue: 'Datos del local',
                sectionMusic: 'Preferencias musicales',
                sectionContact: 'Contacto y WhatsApp',
                sectionMedia: 'Foto del local',
                labelName: 'Nombre del bar o restaurante',
                labelType: 'Tipo de local',
                labelAddress: 'Dirección',
                labelCapacity: 'Capacidad (personas)',
                labelDescription: 'Descripción del local',
                labelSchedule: 'Horario de música en vivo',
                labelGenres: 'Géneros que buscas',
                labelContact: 'Nombre del responsable',
                labelPhone: 'Teléfono WhatsApp',
                labelEmail: 'Correo electrónico',
                labelPhoto: 'Foto del local',
                hintAddress: 'Calle, número, colonia, Saltillo',
                hintCapacity: 'Aproximado de aforo del local',
                hintDescription: 'Cuéntanos el ambiente, tipo de clientela y noches de música.',
                hintSchedule: 'Ej: Jue–Sáb 21:00–01:00',
                hintGenres: 'Separa los géneros con comas. Ej: Rock, Cumbia, Regional',
                hintPhone: '10 dígitos. Te avisaremos cuando confirmes una reserva.',
                hintEmail: 'Opcional, para confirmaciones y facturación.',
                hintPhoto: 'JPG o PNG, máx. 5 MB',
                placeholderName: 'Ej. Bar El Callejón',
                placeholderAddress: 'Calle Allende 245, Centro, Saltillo',
                placeholderDescription: 'Bar de rock alternativo con escenario íntimo…',
                placeholderSchedule: 'Vie–Dom 20:00–00:00',
                placeholderGenres: 'Rock Alternativo, Blues, Indie',
                placeholderContact: 'Tu nombre o del encargado',
                placeholderPhone: '844 123 4567',
                placeholderEmail: 'bar@ejemplo.com',
                selectType: 'Selecciona el tipo',
                typeBar: 'Bar',
                typeBarGrill: 'Bar & Grill',
                typeRestaurant: 'Restaurante',
                typeForum: 'Foro / Venue',
                typeCafe: 'Café',
                typeTerrace: 'Terraza',
                typeOther: 'Otro',
                uploadPhoto: 'Subir foto del local',
                whatsappConsent: 'Acepto recibir notificaciones por WhatsApp sobre reservas y la plataforma',
                termsConsent: 'Acepto los términos de uso de Desierto Sonoro',
                cancel: 'Cancelar',
                submit: 'Registrar mi bar',
                submitting: 'Enviando…',
                successTitle: '¡Registro recibido!',
                successDesc: 'Revisaremos tu local y te contactaremos por WhatsApp en las próximas 24 horas. Una vez activado, podrás buscar y reservar bandas.',
                successClose: 'Entendido',
                errorRequired: 'Este campo es obligatorio',
                errorPhone: 'Ingresa un teléfono válido de 10 dígitos',
                errorEmail: 'Ingresa un correo válido',
                errorChecks: 'Debes aceptar las condiciones para continuar'
            },
            estudio: {
                title: 'Reserva un Estudio',
                stepStudio: 'Estudio',
                stepDetail: 'Detalle',
                stepDate: 'Fecha',
                stepPay: 'Pago',
                searchPlaceholder: 'Buscar estudio...',
                loading: 'Cargando estudios...',
                loadError: 'No se pudieron cargar los estudios.',
                notFound: 'No se encontraron estudios',
                equipment: 'Equipamiento',
                reserveStudio: 'Reservar este estudio',
                availableSchedule: 'Horario disponible',
                selectDateTime: 'Selecciona fecha y horario',
                labelStudio: 'Estudio',
                labelType: 'Tipo',
                labelDate: 'Fecha',
                labelSchedule: 'Horario',
                labelMinDuration: 'Duración mínima'
            },
            clases: {
                title: 'Clases de Música',
                stepTeacher: 'Maestro',
                stepProfile: 'Perfil',
                stepPlan: 'Plan',
                stepPay: 'Pago',
                searchPlaceholder: 'Buscar maestro o instrumento...',
                loading: 'Cargando maestros...',
                loadError: 'No se pudieron cargar los maestros.',
                notFound: 'No se encontraron maestros',
                experience: 'Experiencia',
                students: 'Alumnos',
                levels: 'Niveles',
                modality: 'Modalidad',
                choosePlanBtn: 'Elegir plan de clases',
                chooseMonthly: 'Elige tu plan mensual',
                labelTeacher: 'Maestro',
                labelInstrument: 'Instrumento',
                labelPlan: 'Plan',
                labelSchedules: 'Horarios',
                labelModality: 'Modalidad',
                labelMonthlyTotal: 'Total mensual'
            },
            mapa: {
                title: 'Mapa de conexiones',
                subtitle: 'Bandas y bares en Saltillo',
                showBands: 'Mostrar bandas',
                showBars: 'Mostrar bares',
                topTen: 'Top Ten',
                loading: 'Cargando mapa...',
                noData: 'No hay datos para mostrar',
                legendBands: 'Bandas',
                legendBars: 'Bares',
                sidebarEmpty: 'Selecciona una banda o un bar en el mapa para conectar y reservar',
                localBand: 'Banda local',
                playedAt: 'Ha tocado en',
                bandsPlayedHere: 'Bandas que han tocado aquí',
                noBandsVenue: 'Aún no hay bandas registradas en este venue. ¡Sé el primero en reservar!',
                reserveBand: 'Reservar esta banda',
                reserveBandForBar: 'Reservar banda para este bar',
                filterWarning: '⚠️ Debe haber al menos un tipo visible'
            },
            topten: {
                title: 'Top Ten {{year}}',
                subtitle: 'Lo mejor de bandas y bares en Saltillo',
                topBands: 'Top 10 Bandas',
                topBars: 'Top 10 Bares'
            },
            notifications: {
                shazamUnavailable: '⚠️ Servicio de Shazam no disponible',
                shazamReconnected: '✅ Servicio de Shazam reconectado',
                shazamReconnectFailed: '❌ No se pudo reconectar con Shazam',
                micPermission: '⚠️ Permite acceso al micrófono para identificar la canción',
                shazamStartError: '❌ Error iniciando Shazam',
                linkCopied: '📋 Enlace copiado al portapapeles',
                audioError: '❌ Error reproduciendo audio',
                audioNotFound: '⚠️ Archivo de audio no encontrado. Agrega el MP3 en bandas-media/',
                sampleError: '⚠️ No se pudo reproducir la muestra',
                paymentSessionError: 'Error al crear la sesión de pago',
                paymentUrlError: 'No se recibió URL de pago',
                paymentOkBandas: '✅ ¡Reserva confirmada! Te contactaremos con los detalles del evento.',
                paymentOkEstudio: '✅ ¡Sesión de estudio reservada! Recibirás la confirmación por correo.',
                paymentOkClases: '✅ ¡Inscripción confirmada! Tu maestro te contactará para agendar clases.',
                paymentCancelled: '⚠️ Pago cancelado. Puedes intentar de nuevo cuando quieras.',
                leafletUnavailable: '⚠️ Leaflet no está disponible',
                messageSent: '✅ Mensaje enviado correctamente',
                registroBandaOk: '✅ ¡Registro enviado! Te contactaremos por WhatsApp pronto.',
                registroBarOk: '✅ ¡Bar registrado! Te contactaremos por WhatsApp para activar tu cuenta.'
            },
            months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
            days: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        },
        en: {
            meta: {
                title: 'Made in Saltillo - Immersive Experience'
            },
            nav: {
                home: 'HOME',
                radio: 'RADIO',
                bands: 'BANDS',
                register: 'SIGN UP',
                products: 'PRODUCTS'
            },
            hero: {
                badge: 'LIVE · SALTILLO',
                title1: 'SONIC',
                title2: 'DESERT',
                subtitle: 'Saltillo\'s music scene, all in one place. Listen to live radio, book bands for your venue, record in pro studios and discover local creators.',
                listen: 'LISTEN',
                products: 'PRODUCTS',
                transmission: 'BROADCAST',
                streaming: 'STREAMING',
                years: 'YEARS',
                scroll: 'SCROLL'
            },
            radio: {
                titleMain: 'RADIO',
                titleSub: 'SALTILLO',
                tagline: 'Live streaming · Local music · Desert culture',
                live: 'LIVE',
                nowPlaying: 'Now playing',
                nowTrack: 'Sonic Desert — Radio Saltillo',
                playTitle: 'Play',
                stopTitle: 'Stop',
                cardGaryBadge: 'Desert Rock · 5.0 ★',
                cardGaryDesc: 'Psychedelic desert rock from Coahuila. Listen to samples and book for your event.',
                cardGaryCta: 'View profile & book',
                cardEstudioBadge: 'Studio',
                cardEstudioTitle: 'Book a studio',
                cardEstudioDesc: 'Recording booth equipped with professional mixing, microphones and monitors',
                cardEstudioCta: 'Book session',
                cardClasesBadge: 'Academy',
                cardClasesTitle: 'Music lessons',
                cardClasesDesc: 'Guitar, drums, vocals and production with local Saltillo teachers',
                cardClasesCta: 'Sign up',
                cardScheduleBadge: 'Today',
                cardScheduleTitle: 'Schedule',
                cardEntrevistasBadge: 'Podcast',
                cardEntrevistasTitle: 'Interviews',
                cardEntrevistasDesc: 'Saltillo artisans, chefs and creators',
                cardEntrevistasCta: 'Listen'
            },
            guia: {
                titleMain: 'JOIN',
                titleSub: 'THE SCENE',
                intro: 'Your stage, your bar, your business. Discover how to join, connect and benefit from Saltillo\'s music scene.',
                tabBanda: 'I\'m a band',
                tabBar: 'I\'m a bar or restaurant',
                statBands: 'Active bands',
                statVenues: 'Bars & venues',
                statMinutes: 'Minutes to book',
                statLocal: '% local talent'
            },
            contact: {
                titleMain: 'CONNECT',
                titleSub: 'WITH US',
                bandasBadge: 'Local bands',
                bandasTitle: 'Does your band want to earn money $?',
                bandasDesc: 'Sign up, upload your samples and start receiving bookings at bars and events in Saltillo.',
                bandasCta: 'Register your band',
                baresBadge: 'Bars & restaurants',
                baresTitle: 'Does your bar need music tonight?',
                baresDesc: 'Find available bands for tonight, book in minutes and fill your venue with local talent.',
                baresCta: 'Find bands',
                mapBtn: 'View map'
            },
            footer: {
                tagline: 'Local pride, digital innovation',
                copyright: '© 2024 Made in Saltillo. All rights reserved.'
            },
            common: {
                back: 'Back',
                continue: 'Continue',
                reserve: 'Book',
                choosePlan: 'Choose plan',
                payStripe: 'Pay with Stripe',
                paySecure: 'Secure payment processed by Stripe',
                processing: 'Processing...',
                available: 'Available',
                unavailable: 'Unavailable',
                total: 'Total',
                play: 'Play',
                share: 'Share',
                stop: 'Stop',
                today: 'Today',
                from: 'from',
                perHour: '/hour',
                perHr: '/hr',
                min: 'Min.',
                all: 'All',
                allGenres: 'All genres',
                allTypes: 'All types',
                loading: 'Loading...',
                events: 'events',
                bandsCount: 'bands',
                people: 'people',
                musicToday: 'Music tonight',
                musicTodayShort: '🎵 Music tonight',
                musicTodayLive: '🎵 Tonight',
                online: 'Online',
                inPerson: 'In-person'
            },
            shazam: {
                listening: 'Listening...',
                songTitle: 'Song title',
                artistName: 'Artist name',
                stopIdentify: 'Stop identification',
                identifyMusic: 'Identify music',
                capturing: 'Capturing audio...',
                listeningRadio: 'Listening to radio (8 sec)...',
                analyzing: 'Analyzing with Shazam...',
                analyzingShort: 'Analyzing...',
                sending: 'Sending...',
                gettingResults: 'Getting results...',
                noMusic: 'No music detected',
                recognitionError: 'Recognition error',
                identifications: '{{count}} identifications',
                shareTitle: 'Song identified with Shazam',
                sharePrefix: '🎵 I heard "{{title}}" by {{artist}}',
                shareAlbum: ' from the album "{{album}}"',
                shareShazamCount: ' - {{count}} Shazam identifications',
                shareSuffix: ' on Radio Saltillo',
                searching: '🎵 Searching: {{title}} - {{artist}}'
            },
            bandas: {
                title: 'Book a Local Band',
                stepBand: 'Band',
                stepProfile: 'Profile',
                stepDate: 'Date',
                stepPay: 'Payment',
                searchPlaceholder: 'Search by name...',
                loading: 'Loading bands...',
                loadError: 'Could not load bands. Make sure the server is running.',
                notFound: 'No bands found matching those criteria',
                playSample: 'Play sample',
                audioSample: 'Audio sample',
                noSamples: 'No samples available yet',
                listenSamples: 'Listen to samples',
                playedIn: 'Played in Saltillo',
                noVenues: 'No venue records',
                reserveBand: 'Book this band',
                selectDate: 'Select an available date',
                labelBand: 'Band',
                labelGenre: 'Genre',
                labelDuration: 'Duration',
                labelEventDate: 'Event date'
            },
            registroBanda: {
                title: 'Register your band',
                subtitle: 'Complete your profile to appear on the map and receive bookings. We will notify you via WhatsApp.',
                sectionBand: 'Band details',
                sectionContact: 'Contact & WhatsApp',
                sectionMedia: 'Photo & samples',
                sectionExtra: 'Location',
                labelName: 'Band name',
                labelGenre: 'Music genre',
                labelDescription: 'Description',
                labelPrice: 'Price per event (MXN)',
                labelDuration: 'Show duration',
                labelContact: 'Contact name',
                labelPhone: 'WhatsApp phone',
                labelEmail: 'Email address',
                labelCover: 'Cover photo',
                labelSamples: 'Audio samples',
                labelVenues: 'Places you have played',
                hintDescription: 'Tell venues about your style and what events you are ideal for.',
                hintPhone: '10 digits. We will use this number to notify you about bookings and messages.',
                hintEmail: 'Optional, but recommended for confirmations.',
                hintCover: 'JPG or PNG, max 5 MB',
                hintSamples: 'MP3 or other audio formats. You can upload multiple files.',
                hintVenues: 'Optional. E.g. Bar El Callejón, Plaza de Armas…',
                placeholderName: 'E.g. Los del Desierto',
                placeholderDescription: 'Describe your style, repertoire and event types…',
                placeholderContact: 'Your name or representative',
                placeholderPhone: '844 123 4567',
                placeholderEmail: 'band@example.com',
                placeholderVenues: 'Separate places with commas',
                selectGenre: 'Select a genre',
                selectDuration: 'Select duration',
                duration1h: '1 hour',
                duration2h: '2 hours',
                duration3h: '3 hours',
                duration4h: '4+ hours',
                uploadCover: 'Upload cover photo',
                uploadSamples: 'Upload audio samples',
                whatsappConsent: 'I agree to receive WhatsApp notifications about bookings and the platform',
                termsConsent: 'I accept the Desierto Sonoro terms of use',
                cancel: 'Cancel',
                submit: 'Submit registration',
                submitting: 'Submitting…',
                successTitle: 'Registration received!',
                successDesc: 'We will review your profile and contact you via WhatsApp within 24 hours to activate your band on the platform.',
                successClose: 'Got it',
                errorRequired: 'This field is required',
                errorPhone: 'Enter a valid 10-digit phone number',
                errorEmail: 'Enter a valid email address',
                errorChecks: 'You must accept the terms to continue'
            },
            registroBar: {
                title: 'Register your bar',
                subtitle: 'To search and book bands on Desierto Sonoro, you must first register your venue.',
                infoCallout: 'Only registered bars and restaurants can browse the band catalog, check availability and confirm bookings. Complete the form and we will activate your account shortly.',
                sectionVenue: 'Venue details',
                sectionMusic: 'Music preferences',
                sectionContact: 'Contact & WhatsApp',
                sectionMedia: 'Venue photo',
                labelName: 'Bar or restaurant name',
                labelType: 'Venue type',
                labelAddress: 'Address',
                labelCapacity: 'Capacity (people)',
                labelDescription: 'Venue description',
                labelSchedule: 'Live music schedule',
                labelGenres: 'Genres you are looking for',
                labelContact: 'Contact person',
                labelPhone: 'WhatsApp phone',
                labelEmail: 'Email address',
                labelPhoto: 'Venue photo',
                hintAddress: 'Street, number, neighborhood, Saltillo',
                hintCapacity: 'Approximate venue capacity',
                hintDescription: 'Tell us about the vibe, clientele and music nights.',
                hintSchedule: 'E.g. Thu–Sat 9pm–1am',
                hintGenres: 'Separate genres with commas. E.g. Rock, Cumbia, Regional',
                hintPhone: '10 digits. We will notify you when you confirm a booking.',
                hintEmail: 'Optional, for confirmations and billing.',
                hintPhoto: 'JPG or PNG, max 5 MB',
                placeholderName: 'E.g. Bar El Callejón',
                placeholderAddress: 'Calle Allende 245, Centro, Saltillo',
                placeholderDescription: 'Alternative rock bar with an intimate stage…',
                placeholderSchedule: 'Fri–Sun 8pm–12am',
                placeholderGenres: 'Alternative Rock, Blues, Indie',
                placeholderContact: 'Your name or manager',
                placeholderPhone: '844 123 4567',
                placeholderEmail: 'bar@example.com',
                selectType: 'Select type',
                typeBar: 'Bar',
                typeBarGrill: 'Bar & Grill',
                typeRestaurant: 'Restaurant',
                typeForum: 'Forum / Venue',
                typeCafe: 'Café',
                typeTerrace: 'Terrace',
                typeOther: 'Other',
                uploadPhoto: 'Upload venue photo',
                whatsappConsent: 'I agree to receive WhatsApp notifications about bookings and the platform',
                termsConsent: 'I accept the Desierto Sonoro terms of use',
                cancel: 'Cancel',
                submit: 'Register my bar',
                submitting: 'Submitting…',
                successTitle: 'Registration received!',
                successDesc: 'We will review your venue and contact you via WhatsApp within 24 hours. Once activated, you will be able to search and book bands.',
                successClose: 'Got it',
                errorRequired: 'This field is required',
                errorPhone: 'Enter a valid 10-digit phone number',
                errorEmail: 'Enter a valid email address',
                errorChecks: 'You must accept the terms to continue'
            },
            estudio: {
                title: 'Book a Studio',
                stepStudio: 'Studio',
                stepDetail: 'Details',
                stepDate: 'Date',
                stepPay: 'Payment',
                searchPlaceholder: 'Search studio...',
                loading: 'Loading studios...',
                loadError: 'Could not load studios.',
                notFound: 'No studios found',
                equipment: 'Equipment',
                reserveStudio: 'Book this studio',
                availableSchedule: 'Available schedule',
                selectDateTime: 'Select date and time',
                labelStudio: 'Studio',
                labelType: 'Type',
                labelDate: 'Date',
                labelSchedule: 'Schedule',
                labelMinDuration: 'Minimum duration'
            },
            clases: {
                title: 'Music Lessons',
                stepTeacher: 'Teacher',
                stepProfile: 'Profile',
                stepPlan: 'Plan',
                stepPay: 'Payment',
                searchPlaceholder: 'Search teacher or instrument...',
                loading: 'Loading teachers...',
                loadError: 'Could not load teachers.',
                notFound: 'No teachers found',
                experience: 'Experience',
                students: 'Students',
                levels: 'Levels',
                modality: 'Modality',
                choosePlanBtn: 'Choose lesson plan',
                chooseMonthly: 'Choose your monthly plan',
                labelTeacher: 'Teacher',
                labelInstrument: 'Instrument',
                labelPlan: 'Plan',
                labelSchedules: 'Schedules',
                labelModality: 'Modality',
                labelMonthlyTotal: 'Monthly total'
            },
            mapa: {
                title: 'Connection map',
                subtitle: 'Bands and bars in Saltillo',
                showBands: 'Show bands',
                showBars: 'Show bars',
                topTen: 'Top Ten',
                loading: 'Loading map...',
                noData: 'No data to display',
                legendBands: 'Bands',
                legendBars: 'Bars',
                sidebarEmpty: 'Select a band or bar on the map to connect and book',
                localBand: 'Local band',
                playedAt: 'Played at',
                bandsPlayedHere: 'Bands that have played here',
                noBandsVenue: 'No bands registered at this venue yet. Be the first to book!',
                reserveBand: 'Book this band',
                reserveBandForBar: 'Book a band for this bar',
                filterWarning: '⚠️ At least one type must be visible'
            },
            topten: {
                title: 'Top Ten {{year}}',
                subtitle: 'The best of bands and bars in Saltillo',
                topBands: 'Top 10 Bands',
                topBars: 'Top 10 Bars'
            },
            notifications: {
                shazamUnavailable: '⚠️ Shazam service unavailable',
                shazamReconnected: '✅ Shazam service reconnected',
                shazamReconnectFailed: '❌ Could not reconnect to Shazam',
                micPermission: '⚠️ Allow microphone access to identify the song',
                shazamStartError: '❌ Error starting Shazam',
                linkCopied: '📋 Link copied to clipboard',
                audioError: '❌ Error playing audio',
                audioNotFound: '⚠️ Audio file not found. Add the MP3 in bandas-media/',
                sampleError: '⚠️ Could not play the sample',
                paymentSessionError: 'Error creating payment session',
                paymentUrlError: 'Payment URL not received',
                paymentOkBandas: '✅ Booking confirmed! We will contact you with event details.',
                paymentOkEstudio: '✅ Studio session booked! You will receive confirmation by email.',
                paymentOkClases: '✅ Enrollment confirmed! Your teacher will contact you to schedule lessons.',
                paymentCancelled: '⚠️ Payment cancelled. You can try again whenever you want.',
                leafletUnavailable: '⚠️ Leaflet is not available',
                messageSent: '✅ Message sent successfully',
                registroBandaOk: '✅ Registration sent! We will contact you via WhatsApp soon.',
                registroBarOk: '✅ Bar registered! We will contact you via WhatsApp to activate your account.'
            },
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        }
    };

    const GUIA_CONTENT = {
        es: {
            banda: {
                steps: [
                    { title: 'Crea tu perfil', desc: 'Regístrate gratis y sube muestras de audio' },
                    { title: 'Aparece en el mapa', desc: 'Te ven bares, restaurantes y organizadores' },
                    { title: 'Recibe reservas', desc: 'Calendario, fecha y pago seguro en un flujo' },
                    { title: 'Gana y crece', desc: 'Más eventos, reseñas y lugar en el Top Ten' }
                ],
                previews: [
                    {
                        icon: 'fa-user-plus', tag: 'Paso 1 de 4',
                        title: 'Registra tu banda gratis',
                        desc: 'Sube tu foto, género, precio y muestras de audio. Los venues escuchan antes de reservar — sin perder tiempo en llamadas.',
                        benefits: ['Perfil visible 24/7', 'Muestras en la radio', 'Cero comisión de registro'],
                        potentialLead: 'Ganancia promedio para tu banda =', potential: '$6,500 MXN', potentialLabel: '',
                        potentialHint: 'Según tarifas publicadas por las bandas en la plataforma'
                    },
                    {
                        icon: 'fa-map-marked-alt', tag: 'Paso 2 de 4',
                        title: 'Aparece donde te buscan',
                        desc: 'Tu banda sale en el mapa interactivo de Saltillo junto a bares y restaurantes. Los dueños de venues te encuentran por género, precio y disponibilidad.',
                        benefits: ['Pin en mapa local', 'Visible en Top Ten', 'Conexión directa con bares'],
                        potential: '14', potentialLabel: 'venues conectados'
                    },
                    {
                        icon: 'fa-calendar-check', tag: 'Paso 3 de 4',
                        title: 'Recibe reservas con un clic',
                        desc: 'El bar elige fecha en tu calendario, paga en línea y listo. Tú confirmas el evento sin negociar por WhatsApp ni perseguir pagos.',
                        benefits: ['Calendario en tiempo real', 'Pago seguro con Stripe', 'Reserva confirmada al instante'],
                        potential: '3 min', potentialLabel: 'para cerrar una reserva'
                    },
                    {
                        icon: 'fa-trophy', tag: 'Paso 4 de 4',
                        title: 'Crece y gana más',
                        desc: 'Cada evento suma reseñas, visibilidad y posición en el Top Ten anual. Más escena, más ingresos, más reconocimiento en Saltillo.',
                        benefits: ['Ranking Top Ten', 'Más reservas recurrentes', 'Exposición en radio local'],
                        potential: '4.8★', potentialLabel: 'rating promedio top bandas'
                    }
                ],
                ctaPrimary: { text: 'Registra tu banda', icon: 'fa-rocket', action: 'registro' },
                ctaSecondary: { text: 'Ver mapa de conexiones', icon: 'fa-map-marked-alt', action: 'mapa' }
            },
            bar: {
                steps: [
                    { title: 'Registra tu venue', desc: 'Bar o restaurante visible en el mapa' },
                    { title: 'Explora bandas', desc: 'Filtra por género y disponibilidad hoy' },
                    { title: 'Reserva al instante', desc: 'Elige banda, fecha y confirma en minutos' },
                    { title: 'Llena tu local', desc: 'Música en vivo que trae clientes' }
                ],
                previews: [
                    {
                        icon: 'fa-store', tag: 'Paso 1 de 4',
                        title: 'Pon tu bar en el mapa',
                        desc: 'Registra tu venue con fotos, capacidad, horarios y géneros que buscas. Las bandas locales ven que necesitas música y se postulan solas.',
                        benefits: ['Perfil de venue gratis', 'Badge "Música hoy"', 'Visible para 18+ bandas'],
                        potential: '90', potentialLabel: 'personas de capacidad promedio'
                    },
                    {
                        icon: 'fa-search', tag: 'Paso 2 de 4',
                        title: 'Encuentra la banda ideal',
                        desc: 'Explora el catálogo, escucha muestras, filtra por rock, cumbia, jazz o mariachi. Ve quién ha tocado en venues como el tuyo.',
                        benefits: ['Muestras de audio', 'Filtro por género', 'Historial de venues'],
                        potential: '18+', potentialLabel: 'bandas disponibles'
                    },
                    {
                        icon: 'fa-bolt', tag: 'Paso 3 de 4',
                        title: 'Reserva música para hoy',
                        desc: '¿Necesitas banda esta noche? Revisa disponibilidad en el calendario, reserva y paga en un solo flujo. Sin intermediarios ni sorpresas.',
                        benefits: ['Disponibilidad en vivo', 'Precio transparente', 'Confirmación inmediata'],
                        potential: '3 min', potentialLabel: 'de búsqueda a reserva'
                    },
                    {
                        icon: 'fa-chart-line', tag: 'Paso 4 de 4',
                        title: 'Más clientes, más ingresos',
                        desc: 'La música en vivo llena mesas, aumenta consumo y fideliza clientes. Conecta con talento local y destaca frente a la competencia.',
                        benefits: ['Mayor ticket promedio', 'Clientes recurrentes', 'Eventos sin fricción'],
                        potential: '+35%', potentialLabel: 'ocupación en noches con banda'
                    }
                ],
                ctaPrimary: { text: 'Buscar bandas hoy', icon: 'fa-guitar', action: 'bandas' },
                ctaSecondary: { text: 'Explorar mapa de venues', icon: 'fa-map-marked-alt', action: 'mapa' }
            }
        },
        en: {
            banda: {
                steps: [
                    { title: 'Create your profile', desc: 'Sign up for free and upload audio samples' },
                    { title: 'Appear on the map', desc: 'Bars, restaurants and organizers find you' },
                    { title: 'Receive bookings', desc: 'Calendar, date and secure payment in one flow' },
                    { title: 'Earn and grow', desc: 'More events, reviews and a spot in the Top Ten' }
                ],
                previews: [
                    {
                        icon: 'fa-user-plus', tag: 'Step 1 of 4',
                        title: 'Register your band for free',
                        desc: 'Upload your photo, genre, price and audio samples. Venues listen before booking — no wasted phone calls.',
                        benefits: ['Profile visible 24/7', 'Samples on the radio', 'Zero registration fee'],
                        potentialLead: 'Average earnings for your band =', potential: '$6,500 MXN', potentialLabel: '',
                        potentialHint: 'Based on rates published by bands on the platform'
                    },
                    {
                        icon: 'fa-map-marked-alt', tag: 'Step 2 of 4',
                        title: 'Appear where they search for you',
                        desc: 'Your band appears on Saltillo\'s interactive map alongside bars and restaurants. Venue owners find you by genre, price and availability.',
                        benefits: ['Pin on local map', 'Visible in Top Ten', 'Direct connection with bars'],
                        potential: '14', potentialLabel: 'connected venues'
                    },
                    {
                        icon: 'fa-calendar-check', tag: 'Step 3 of 4',
                        title: 'Receive bookings with one click',
                        desc: 'The bar picks a date on your calendar, pays online and done. You confirm the event without WhatsApp negotiations or chasing payments.',
                        benefits: ['Real-time calendar', 'Secure Stripe payment', 'Instant booking confirmation'],
                        potential: '3 min', potentialLabel: 'to close a booking'
                    },
                    {
                        icon: 'fa-trophy', tag: 'Step 4 of 4',
                        title: 'Grow and earn more',
                        desc: 'Each event adds reviews, visibility and position in the annual Top Ten. More scene, more income, more recognition in Saltillo.',
                        benefits: ['Top Ten ranking', 'More recurring bookings', 'Exposure on local radio'],
                        potential: '4.8★', potentialLabel: 'average rating top bands'
                    }
                ],
                ctaPrimary: { text: 'Register your band', icon: 'fa-rocket', action: 'registro' },
                ctaSecondary: { text: 'View connection map', icon: 'fa-map-marked-alt', action: 'mapa' }
            },
            bar: {
                steps: [
                    { title: 'Register your venue', desc: 'Bar or restaurant visible on the map' },
                    { title: 'Explore bands', desc: 'Filter by genre and availability today' },
                    { title: 'Book instantly', desc: 'Choose band, date and confirm in minutes' },
                    { title: 'Fill your venue', desc: 'Live music that brings customers' }
                ],
                previews: [
                    {
                        icon: 'fa-store', tag: 'Step 1 of 4',
                        title: 'Put your bar on the map',
                        desc: 'Register your venue with photos, capacity, hours and genres you\'re looking for. Local bands see you need music and apply on their own.',
                        benefits: ['Free venue profile', '"Music tonight" badge', 'Visible to 18+ bands'],
                        potential: '90', potentialLabel: 'average capacity people'
                    },
                    {
                        icon: 'fa-search', tag: 'Step 2 of 4',
                        title: 'Find the ideal band',
                        desc: 'Browse the catalog, listen to samples, filter by rock, cumbia, jazz or mariachi. See who has played at venues like yours.',
                        benefits: ['Audio samples', 'Genre filter', 'Venue history'],
                        potential: '18+', potentialLabel: 'available bands'
                    },
                    {
                        icon: 'fa-bolt', tag: 'Step 3 of 4',
                        title: 'Book music for tonight',
                        desc: 'Need a band tonight? Check availability on the calendar, book and pay in one flow. No middlemen, no surprises.',
                        benefits: ['Live availability', 'Transparent pricing', 'Immediate confirmation'],
                        potential: '3 min', potentialLabel: 'from search to booking'
                    },
                    {
                        icon: 'fa-chart-line', tag: 'Step 4 of 4',
                        title: 'More customers, more revenue',
                        desc: 'Live music fills tables, increases spending and builds loyal customers. Connect with local talent and stand out from the competition.',
                        benefits: ['Higher average ticket', 'Returning customers', 'Frictionless events'],
                        potential: '+35%', potentialLabel: 'occupancy on band nights'
                    }
                ],
                ctaPrimary: { text: 'Find bands today', icon: 'fa-guitar', action: 'bandas' },
                ctaSecondary: { text: 'Explore venue map', icon: 'fa-map-marked-alt', action: 'mapa' }
            }
        }
    };

    class I18nManager {
        constructor() {
            const saved = localStorage.getItem('hes_lang');
            this.lang = saved || (navigator.language.startsWith('en') ? 'en' : 'es');
            if (!TRANSLATIONS[this.lang]) this.lang = 'es';
        }

        t(key, vars = {}) {
            const parts = key.split('.');
            let value = TRANSLATIONS[this.lang];
            for (const part of parts) {
                value = value?.[part];
            }
            if (value === undefined) {
                value = TRANSLATIONS.es;
                for (const part of parts) value = value?.[part];
            }
            if (typeof value !== 'string') return key;
            return value.replace(/\{\{(\w+)\}\}/g, (_, name) => vars[name] ?? '');
        }

        get langCode() {
            return this.lang;
        }

        getLocale() {
            return this.lang === 'en' ? 'en-US' : 'es-MX';
        }

        getMonthNames() {
            return TRANSLATIONS[this.lang].months;
        }

        getDayNames() {
            return TRANSLATIONS[this.lang].days;
        }

        getGuiaContent() {
            return GUIA_CONTENT[this.lang];
        }

        translateModality(mod) {
            if (mod === 'En línea' || mod === 'Online') return this.t('common.online');
            if (mod === 'Presencial' || mod === 'In-person') return this.t('common.inPerson');
            return mod;
        }

        isOnlineModality(mod) {
            return mod === 'En línea' || mod === 'Online';
        }

        setLanguage(lang) {
            if (!TRANSLATIONS[lang] || lang === this.lang) return;
            this.lang = lang;
            localStorage.setItem('hes_lang', lang);
            document.documentElement.lang = lang;
            this.apply();
            window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
        }

        apply() {
            document.documentElement.lang = this.lang;

            document.querySelectorAll('[data-i18n]').forEach(el => {
                el.textContent = this.t(el.dataset.i18n);
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                el.placeholder = this.t(el.dataset.i18nPlaceholder);
            });

            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                el.title = this.t(el.dataset.i18nTitle);
            });

            document.querySelectorAll('[data-i18n-aria]').forEach(el => {
                el.setAttribute('aria-label', this.t(el.dataset.i18nAria));
            });

            const titleEl = document.querySelector('title[data-i18n]');
            if (titleEl) document.title = this.t(titleEl.dataset.i18n);

            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === this.lang);
            });
        }

        init() {
            document.documentElement.lang = this.lang;
            this.apply();
            document.querySelectorAll('.lang-btn').forEach(btn => {
                btn.addEventListener('click', () => this.setLanguage(btn.dataset.lang));
            });
        }
    }

    window.I18n = new I18nManager();
})();
