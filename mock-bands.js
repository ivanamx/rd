/**
 * Datos mock de bandas para login frontend (localStorage).
 * Credenciales Gary Garcia:
 *   Usuario: Gary Garcia  o  gary@desierto.com
 *   Contraseña: gary2024
 */
(function () {
    const ACCOUNTS_KEY = 'desiertoSonoro_bandAccounts';
    const PROFILES_KEY = 'desiertoSonoro_bandProfiles';

    const IMG = {
        avatar: 'bandas-media/gary-garcia/ggprofile.jpeg',
        cover: 'bandas-media/gary-garcia/cover.svg',
        gary1: 'bandas-media/gary-garcia/gary1.mp4',
        coverVideo: 'bandas-media/gary-garcia/timeoutforgary.mp4',
        g1: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop&auto=format',
        g2: 'https://images.unsplash.com/photo-1459749411175-04bf52929825?w=600&h=400&fit=crop&auto=format',
        g3: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=600&h=400&fit=crop&auto=format',
        g4: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=600&h=400&fit=crop&auto=format',
        g5: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop&auto=format',
        g6: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&h=400&fit=crop&auto=format'
    };

    const GARY_GARCIA = {
        account: {
            nombre: 'Gary Garcia',
            nombreKey: 'gary garcia',
            email: 'gary@desierto.com',
            emailKey: 'gary@desierto.com',
            password: 'gary2024',
            telefono: '+528441234567',
            tipo: 'banda'
        },
        profile: {
            nombre: 'Gary Garcia',
            nombreKey: 'gary garcia',
            genero: 'Desert Rock',
            duracion: '2.5 horas',
            precio: 7200,
            descripcion: 'Desde las dunas de Coahuila surge un muro de distorsión, bajo pesado y ecos psicodélicos que convierten el desierto en escenario. Gary Garcia fusiona el rock ácido de los 70 con la crudeza del norte mexicano: riffs que queman como el mediodía, baterías que retumban como trueno seco y letras que hablan de carretera, polvo y libertad.',
            contacto: 'Gary Garcia',
            telefono: '+528441234567',
            email: 'gary@desierto.com',
            lugares: ['La Siberia', 'Parque Saltillo 400', 'Foro Cultural Saltillo', 'Bar El Callejón', 'Centro Histórico'],
            avatar: IMG.avatar,
            cover: IMG.cover,
            coverVideo: IMG.coverVideo,
            heroLink: { text: 'we like soccer', video: IMG.gary1 },
            galeria: [
                { id: 'gary-g1', url: IMG.g1, caption: 'Parque Saltillo 400 — Jun 2026', type: 'image' },
                { id: 'gary-g2', url: IMG.g2, caption: 'Bar El Callejón — May 2026', type: 'image' },
                { id: 'gary-g3', url: IMG.g3, caption: 'Sesión de estudio — Abr 2026', type: 'image' },
                { id: 'gary-g4', url: IMG.g4, caption: 'Backline en Foro Cultural', type: 'image' },
                { id: 'gary-g5', url: IMG.g5, caption: 'La Siberia — Mar 2026', type: 'image' },
                { id: 'gary-g6', url: IMG.g6, caption: 'Centro Histórico — Feb 2026', type: 'image' },
                { id: 'gary-v1', url: IMG.gary1, caption: 'gary1', type: 'video' }
            ],
            muestras: [
                { id: 'gary-m1', titulo: 'Highway to the Bravo', nombre: 'muestra-1.mp3', dataUrl: 'bandas-media/gary-garcia/muestra-1.mp3' },
                { id: 'gary-m2', titulo: 'Dust Devil', nombre: 'muestra-2.mp3', dataUrl: 'bandas-media/gary-garcia/muestra-2.mp3' },
                { id: 'gary-m3', titulo: 'Mirage (en vivo)', nombre: 'muestra-3.mp3', dataUrl: 'bandas-media/gary-garcia/muestra-3.mp3' }
            ],
            stats: {
                vistas: 3842,
                reservas: 47,
                shows: 31,
                productos: 5
            },
            management: {
                earnings: {
                    month: 21600,
                    year: 187200,
                    pending: 14400,
                    avgPerShow: 7200,
                    monthTrend: 18,
                    yearTrend: 34
                },
                venues: {
                    totalUnique: 12,
                    thisMonth: 3,
                    thisYear: 18,
                    repeatRate: 42,
                    topVenues: [
                        { name: 'Bar El Callejón', shows: 8, lastDate: '2026-05-28', revenue: 57600 },
                        { name: 'La Siberia', shows: 5, lastDate: '2026-04-12', revenue: 36000 },
                        { name: 'Foro Cultural Saltillo', shows: 4, lastDate: '2026-03-21', revenue: 32000 },
                        { name: 'Parque Saltillo 400', shows: 3, lastDate: '2026-06-01', revenue: 21600 }
                    ]
                },
                stageTime: {
                    hoursThisMonth: 7.5,
                    hoursThisYear: 65,
                    showsThisMonth: 3,
                    showsThisYear: 26,
                    avgSetLength: 2.5
                }
            },
            proximosShows: [
                { fecha: '2026-06-14', venue: 'Parque Saltillo 400', fee: 7200, status: 'confirmado' },
                { fecha: '2026-06-19', venue: 'La Siberia', fee: 7200, status: 'confirmado' },
                { fecha: '2026-06-26', venue: 'Bar El Callejón', fee: 7200, status: 'pendiente' },
                { fecha: '2026-07-03', venue: 'Foro Cultural Saltillo', fee: 8000, status: 'pendiente' }
            ],
            showsRecientes: [
                { fecha: '2026-06-01', venue: 'Parque Saltillo 400', fee: 7200, hours: 2.5 },
                { fecha: '2026-05-28', venue: 'Bar El Callejón', fee: 7200, hours: 2.5 },
                { fecha: '2026-05-17', venue: 'Centro Histórico', fee: 6500, hours: 2 },
                { fecha: '2026-05-04', venue: 'La Siberia', fee: 7200, hours: 2.5 }
            ],
            rating: 5.0,
            premium: true,
            fechaRegistro: '2025-11-15T10:00:00.000Z'
        }
    };

    function upsertAccount(account) {
        const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
        const idx = accounts.findIndex(a => a.nombreKey === account.nombreKey);
        if (idx >= 0) accounts[idx] = account;
        else accounts.push(account);
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    }

    function upsertProfile(profile) {
        const profiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
        profiles[profile.nombreKey] = profile;
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }

    window.seedMockBands = function seedMockBands() {
        upsertAccount(GARY_GARCIA.account);
        upsertProfile(GARY_GARCIA.profile);
    };

    window.MOCK_BAND_CREDENTIALS = {
        garyGarcia: {
            bandName: GARY_GARCIA.account.nombre,
            email: GARY_GARCIA.account.email,
            password: GARY_GARCIA.account.password
        }
    };
})();
