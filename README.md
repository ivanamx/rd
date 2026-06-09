# 🎵 Sistema de Reconocimiento de Música - Radio Saltillo

Sistema completo de reconocimiento de canciones como Shazam para Radio Saltillo, con APIs reales y reconocimiento por micrófono.

## 🚀 Instalación y Configuración

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Iniciar el Servidor Proxy

```bash
npm start
```

El servidor se ejecutará en `http://localhost:3001`

### 3. Abrir la Aplicación

Abre `index.html` en tu navegador o usa un servidor local:

```bash
# Opción 1: Servidor Python
python -m http.server 9000

# Opción 2: Servidor Node.js
npx http-server -p 9000
```

Luego visita: `http://localhost:9000`

## 🎯 Características

### ✅ Reconocimiento Real de Canciones
- **APIs Reales**: AudD, AudioTag, ACRCloud
- **Sin CORS**: Servidor proxy local
- **Múltiples Fuentes**: Micrófono o reproductor
- **Base de Datos**: Canciones populares y regionales

### 🎤 Opciones de Reconocimiento

1. **Micrófono**: Graba audio desde el micrófono del dispositivo
2. **Reproductor**: Analiza el audio que está reproduciéndose

### 🔧 APIs Integradas

- **AudD**: API gratuita con buena precisión
- **AudioTag**: API gratuita alternativa
- **ACRCloud**: API premium (requiere clave)

## 📱 Cómo Usar

### Método 1: Reconocimiento por Micrófono
1. Haz clic en el botón Shazam 🎵
2. Selecciona "Micrófono"
3. Permite acceso al micrófono
4. Acerca el dispositivo a la música
5. Espera 10 segundos
6. ¡Ve el resultado!

### Método 2: Reconocimiento del Reproductor
1. Reproduce el archivo `song.mp3`
2. Haz clic en el botón Shazam 🎵
3. Selecciona "Reproductor"
4. Espera 15 segundos
5. ¡Ve el resultado!

## 🎼 Información del Modal de Resultados

- **Artista y Canción**: Información principal
- **Álbum y Género**: Detalles adicionales
- **Confianza**: Porcentaje de precisión
- **Análisis Musical**: Tempo, tonalidad, energía
- **Enlaces**: Spotify, YouTube Music, letras

## 🔧 Configuración Avanzada

### Variables de Entorno (Opcional)

Crea un archivo `.env` para configurar APIs:

```env
AUDD_API_TOKEN=tu_token_aqui
ACRCLOUD_ACCESS_KEY=tu_clave_aqui
ACRCLOUD_SECRET_KEY=tu_secreto_aqui
```

### Personalizar Base de Datos

Edita la función `generateResultFromMusicPatterns()` en `script.js` para agregar más canciones:

```javascript
const songDatabase = [
    {
        song: 'Tu Canción',
        artist: 'Tu Artista',
        album: 'Tu Álbum',
        genre: 'Tu Género',
        tempo: 120,
        key: 'C',
        energy: 0.7,
        danceability: 0.6,
        valence: 0.8
    }
    // Agregar más canciones...
];
```

## 🐛 Solución de Problemas

### Error: "No se pudo identificar la canción"
- Verifica que el servidor proxy esté ejecutándose
- Asegúrate de que el audio sea claro y sin ruido
- Intenta con una canción más popular

### Error: "Permisos requeridos" (Micrófono)
- Permite acceso al micrófono en el navegador
- Verifica que no haya otras aplicaciones usando el micrófono

### Error: "CORS bloqueado"
- Asegúrate de que el servidor proxy esté en `localhost:3001`
- Verifica que no haya firewalls bloqueando la conexión

## 📊 APIs Disponibles

| API | Gratuita | Precisión | Límites |
|-----|----------|-----------|---------|
| AudD | ✅ | Alta | 1000/mes |
| AudioTag | ✅ | Media | Sin límite |
| ACRCloud | ❌ | Muy Alta | Pago |

## 🎵 Archivos del Proyecto

- `index.html` - Página principal
- `script.js` - Lógica del frontend
- `styles.css` - Estilos CSS
- `proxy-server.js` - Servidor proxy
- `package.json` - Dependencias
- `song.mp3` - Archivo de audio de prueba

## 🚀 Despliegue

### Producción
1. Configura un servidor con Node.js
2. Instala las dependencias
3. Configura las variables de entorno
4. Inicia el servidor proxy
5. Sirve los archivos estáticos

### Docker (Opcional)
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## 📝 Notas Técnicas

- **Web Audio API**: Para captura y análisis de audio
- **MediaDevices API**: Para acceso al micrófono
- **Express.js**: Servidor proxy
- **Multer**: Manejo de archivos de audio
- **Fetch API**: Comunicación con APIs externas

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

MIT License - Ver archivo LICENSE para más detalles.

---

**¡Disfruta identificando música con Radio Saltillo! 🎵**
