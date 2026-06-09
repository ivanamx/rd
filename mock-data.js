// Datos mock embebidos — fallback cuando la API y los JSON no están disponibles
window.MOCK_DATA = {
    estudios: [
        {
            id: "cabina-neon",
            nombre: "Cabina Neón",
            tipo: "Grabación vocal",
            descripcion: "Cabina aislada acústicamente con cadena de señal premium para voces, podcasts y voice-over.",
            precio: 85000,
            duracionMinima: "2 horas",
            imagen: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80",
            galeria: [
                "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80",
                "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80"
            ],
            equipamiento: ["Neumann U87", "Universal Audio Apollo x8", "Monitores KRK V8"],
            estrellas: 4.9,
            ubicacion: "Centro Histórico, Saltillo",
            capacidad: "1-2 personas",
            disponibilidad: ["2026-06-10", "2026-06-11", "2026-06-12", "2026-06-17", "2026-06-18", "2026-06-24", "2026-06-25"],
            horarios: ["10:00", "13:00", "16:00", "19:00"]
        },
        {
            id: "sala-live",
            nombre: "Sala Live",
            tipo: "Banda en vivo",
            descripcion: "Espacio amplio para ensayos y grabación en vivo de bandas completas.",
            precio: 150000,
            duracionMinima: "3 horas",
            imagen: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
            galeria: [
                "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80",
                "https://images.unsplash.com/photo-1520523839897-bd946433e27e?w=600&q=80"
            ],
            equipamiento: ["Batería Pearl", "Ampeg SVT", "Marshall JCM800", "Mesa de 32 canales"],
            estrellas: 4.8,
            ubicacion: "Zona Norte, Saltillo",
            capacidad: "Hasta 6 músicos",
            disponibilidad: ["2026-06-13", "2026-06-14", "2026-06-20", "2026-06-21", "2026-06-27", "2026-06-28"],
            horarios: ["11:00", "15:00", "19:00"]
        },
        {
            id: "beat-lab",
            nombre: "Beat Lab",
            tipo: "Producción",
            descripcion: "Estudio de producción electrónica y beatmaking con sintetizadores y plugins profesionales.",
            precio: 70000,
            duracionMinima: "2 horas",
            imagen: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80",
            galeria: [
                "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=600&q=80",
                "https://images.unsplash.com/photo-1614149162883-aa63b1d5a6f3?w=600&q=80"
            ],
            equipamiento: ["Ableton Push 2", "Moog Subsequent 37", "Mac Studio M2"],
            estrellas: 4.7,
            ubicacion: "Colonia República, Saltillo",
            capacidad: "1-2 productores",
            disponibilidad: ["2026-06-10", "2026-06-15", "2026-06-16", "2026-06-22", "2026-06-23", "2026-06-29"],
            horarios: ["09:00", "12:00", "15:00", "18:00", "21:00"]
        },
        {
            id: "podcast-room",
            nombre: "Podcast Room",
            tipo: "Podcast & streaming",
            descripcion: "Set multicámara para podcasts, entrevistas y streaming en vivo.",
            precio: 95000,
            duracionMinima: "2 horas",
            imagen: "https://images.unsplash.com/photo-1478737270239-2f02ca77fc06?w=800&q=80",
            galeria: [
                "https://images.unsplash.com/photo-1478737270239-2f02ca77fc06?w=600&q=80",
                "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&q=80"
            ],
            equipamiento: ["3 cámaras 4K", "Rode PodMic x4", "Rodecaster Pro II", "Luces LED RGB"],
            estrellas: 4.9,
            ubicacion: "Centro, Saltillo",
            capacidad: "Hasta 4 personas",
            disponibilidad: ["2026-06-12", "2026-06-13", "2026-06-19", "2026-06-20", "2026-06-26", "2026-06-27"],
            horarios: ["10:00", "14:00", "17:00"]
        }
    ],
    maestros: [
        {
            id: "carlos-guitarra",
            nombre: "Carlos Mendoza",
            instrumento: "Guitarra",
            genero: "Rock & Blues",
            descripcion: "Guitarrista de sesión con más de 12 años en escena. Especialista en técnica e improvisación.",
            imagen: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80",
            estrellas: 4.9,
            experiencia: "12 años",
            alumnos: 85,
            modalidad: ["Presencial", "En línea"],
            horarios: "Lun–Vie 16:00–20:00",
            niveles: ["Principiante", "Intermedio", "Avanzado"],
            planes: [
                { id: "guitarra-4", nombre: "4 clases al mes", descripcion: "1 clase semanal de 60 min", precio: 120000 },
                { id: "guitarra-8", nombre: "8 clases al mes", descripcion: "2 clases semanales de 60 min", precio: 220000 }
            ]
        },
        {
            id: "ana-voz",
            nombre: "Ana Torres",
            instrumento: "Voz",
            genero: "Pop & Musical",
            descripcion: "Cantante lírica y coach vocal. Técnica respiratoria, afinación y performance escénica.",
            imagen: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80",
            estrellas: 5.0,
            experiencia: "10 años",
            alumnos: 120,
            modalidad: ["Presencial", "En línea"],
            horarios: "Mar–Sáb 10:00–18:00",
            niveles: ["Principiante", "Intermedio", "Avanzado"],
            planes: [
                { id: "voz-4", nombre: "4 clases al mes", descripcion: "1 clase semanal de 60 min", precio: 140000 },
                { id: "voz-8", nombre: "8 clases al mes", descripcion: "2 clases semanales de 60 min", precio: 260000 }
            ]
        },
        {
            id: "miguel-bateria",
            nombre: "Miguel Ríos",
            instrumento: "Batería",
            genero: "Rock & Jazz",
            descripcion: "Baterista de jazz fusión. Rudimentos, coordinación, lectura y grooves para banda.",
            imagen: "https://images.unsplash.com/photo-1519892300169-cbED2c5eab56?w=800&q=80",
            estrellas: 4.8,
            experiencia: "15 años",
            alumnos: 60,
            modalidad: ["Presencial"],
            horarios: "Lun–Jue 17:00–21:00",
            niveles: ["Principiante", "Intermedio", "Avanzado"],
            planes: [
                { id: "bateria-4", nombre: "4 clases al mes", descripcion: "1 clase semanal de 60 min", precio: 130000 },
                { id: "bateria-8", nombre: "8 clases al mes", descripcion: "2 clases semanales de 60 min", precio: 240000 }
            ]
        },
        {
            id: "lucia-piano",
            nombre: "Lucía Herrera",
            instrumento: "Piano",
            genero: "Clásico & Pop",
            descripcion: "Pianista clásica. Técnica clásica con arreglos pop y acompañamiento.",
            imagen: "https://images.unsplash.com/photo-1520523839897-bd946433e27e?w=800&q=80",
            estrellas: 4.9,
            experiencia: "8 años",
            alumnos: 95,
            modalidad: ["Presencial", "En línea"],
            horarios: "Lun–Vie 9:00–14:00",
            niveles: ["Principiante", "Intermedio"],
            planes: [
                { id: "piano-4", nombre: "4 clases al mes", descripcion: "1 clase semanal de 60 min", precio: 110000 },
                { id: "piano-8", nombre: "8 clases al mes", descripcion: "2 clases semanales de 60 min", precio: 200000 }
            ]
        },
        {
            id: "diego-produccion",
            nombre: "Diego Vega",
            instrumento: "Producción",
            genero: "Beatmaking & DAW",
            descripcion: "Productor musical. Ableton, mezcla básica, sound design y flujo profesional.",
            imagen: "https://images.unsplash.com/photo-1614149162883-aa63b1d5a6f3?w=800&q=80",
            estrellas: 4.7,
            experiencia: "7 años",
            alumnos: 70,
            modalidad: ["Presencial", "En línea"],
            horarios: "Mié–Sáb 15:00–21:00",
            niveles: ["Principiante", "Intermedio", "Avanzado"],
            planes: [
                { id: "prod-4", nombre: "4 clases al mes", descripcion: "1 clase semanal de 90 min", precio: 160000 },
                { id: "prod-8", nombre: "8 clases al mes", descripcion: "2 clases semanales de 90 min", precio: 300000 }
            ]
        }
    ]
};

// Bares y venues — fallback para el mapa
window.MOCK_DATA.bares = [
    {
        id: "bar-el-callejon",
        nombre: "Bar El Callejón",
        tipo: "Bar",
        descripcion: "Bar de rock alternativo en el centro. Escenario íntimo, cerveza artesanal y noches de música en vivo los jueves y sábados.",
        imagen: "https://images.unsplash.com/photo-1572116469696-31de077fa5ee?w=600&q=80",
        direccion: "Calle Allende 245, Centro, Saltillo",
        lat: 25.4218,
        lng: -100.9945,
        capacidad: 90,
        musicaHoy: true,
        generosPreferidos: ["Rock Alternativo", "Blues", "Indie"],
        estrellas: 4.6,
        horarioMusica: "Jue–Sáb 21:00–01:00"
    },
    {
        id: "la-siberia",
        nombre: "La Siberia",
        tipo: "Bar & Grill",
        descripcion: "Terraza con ambiente relajado. Ideal para cumbia, regional y noches de karaoke con banda en vivo los fines de semana.",
        imagen: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
        direccion: "Blvd. Venustiano Carranza 1200, Saltillo",
        lat: 25.4255,
        lng: -100.9880,
        capacidad: 150,
        musicaHoy: true,
        generosPreferidos: ["Cumbia", "Regional Mexicano", "Pop"],
        estrellas: 4.4,
        horarioMusica: "Vie–Dom 20:00–00:00"
    },
    {
        id: "foro-cultural-saltillo",
        nombre: "Foro Cultural Saltillo",
        tipo: "Foro",
        descripcion: "Espacio cultural con escenario amplio para conciertos, festivales y eventos musicales de la escena local.",
        imagen: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80",
        direccion: "Av. Universidad 151, Saltillo",
        lat: 25.4280,
        lng: -100.9850,
        capacidad: 400,
        musicaHoy: true,
        generosPreferidos: ["Rock", "Metal", "Folk", "Electrónica"],
        estrellas: 4.7,
        horarioMusica: "Eventos según cartelera"
    },
    {
        id: "plaza-de-armas",
        nombre: "Plaza de Armas",
        tipo: "Plaza pública",
        descripcion: "Corazón del centro histórico. Serenatas, mariachis y presentaciones culturales en la kiosko central.",
        imagen: "https://images.unsplash.com/photo-1555881400-74d7619f9e9d?w=600&q=80",
        direccion: "Plaza de Armas, Centro, Saltillo",
        lat: 25.4232,
        lng: -100.9923,
        capacidad: 300,
        musicaHoy: true,
        generosPreferidos: ["Mariachi", "Folk", "Regional Mexicano"],
        estrellas: 4.6,
        horarioMusica: "Diario 19:00–22:00"
    }
];
