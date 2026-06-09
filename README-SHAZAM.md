# 🎵 Radio Saltillo - Sistema de Reconocimiento de Música Automatizado

Sistema completo de reconocimiento de música que integra Shazam.com con automatización de Chrome usando Puppeteer.

## ✨ Características

- 🎤 **Reconocimiento automático de música** usando Shazam.com
- 🤖 **Automatización completa** con Puppeteer y Chrome
- 🎨 **Modal nativo elegante** para mostrar resultados
- 🔄 **Comunicación en tiempo real** con Socket.IO
- 📱 **Interfaz responsive** y moderna
- 🎵 **Reproductor de radio** integrado

## 🚀 Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Iniciar el sistema completo:**
```bash
npm start
```

3. **Para desarrollo:**
```bash
npm run dev
```

## 🎯 Uso del Sistema

### Iniciar Reconocimiento de Música

1. **Abrir el navegador** en `http://localhost:3000`
2. **Hacer clic** en el botón flotante de Shazam (🎵)
3. **El sistema automáticamente:**
   - Abre Chrome
   - Navega a Shazam.com
   - Hace clic en el botón flotante de Shazam
   - Monitorea los resultados
   - Muestra la información en el modal nativo

### Servicios Disponibles

- **Servidor Principal:** `http://localhost:3000`
- **Servicio de Shazam:** `http://localhost:3001`
- **Socket.IO:** Comunicación en tiempo real

## 🛠️ Scripts Disponibles

```bash
# Iniciar sistema completo
npm start

# Modo desarrollo con auto-reload
npm run dev

# Solo servidor proxy
npm run proxy

# Solo servicio de Shazam
npm run shazam
```

## 📁 Estructura del Proyecto

```
├── index.html              # Página principal
├── script-updated.js       # JavaScript principal actualizado
├── styles.css              # Estilos principales
├── shazam-modal-styles.css # Estilos del modal de Shazam
├── shazam-automation.js    # Servicio de automatización
├── start-server.js         # Gestor de servicios
├── proxy-server.js         # Servidor proxy
├── package.json            # Configuración del proyecto
└── README.md              # Este archivo
```

## 🔧 Configuración Técnica

### Dependencias Principales

- **Puppeteer:** Automatización de Chrome
- **Socket.IO:** Comunicación en tiempo real
- **Express:** Servidor web
- **CORS:** Manejo de CORS

### Requisitos del Sistema

- **Node.js** 16+ 
- **Chrome/Chromium** (instalado automáticamente por Puppeteer)
- **Permisos de micrófono** en el navegador

## 🎨 Características del Modal

- **Diseño futurista** con gradientes y efectos
- **Animaciones suaves** y transiciones
- **Estados visuales** para cada fase del proceso
- **Botones de acción** para reproducir y compartir
- **Responsive** para móviles y desktop

## 🔍 Proceso de Reconocimiento

1. **Inicio:** Usuario hace clic en el botón de Shazam
2. **Automatización:** Puppeteer abre Chrome y navega a Shazam.com
3. **Activación:** Sistema hace clic automáticamente en el botón flotante
4. **Monitoreo:** Detecta cuando Shazam obtiene resultados
5. **Extracción:** Obtiene artista y título de la canción
6. **Presentación:** Muestra resultados en el modal nativo
7. **Acciones:** Permite reproducir o compartir la canción

## 🎵 Integración con Radio

El sistema está integrado con el reproductor de radio de Saltillo:

- **Reproducción automática** de la canción identificada
- **Actualización del "Ahora suena"** con la información
- **Historial de canciones** identificadas
- **Compartir en redes sociales**

## 🐛 Solución de Problemas

### Chrome no se abre
- Verificar que Puppeteer esté instalado correctamente
- Ejecutar `npm install puppeteer` para reinstalar

### No se detecta música
- Verificar permisos de micrófono
- Asegurar que hay música reproduciéndose
- Revisar la consola para errores

### Servicio no responde
- Verificar que el puerto 3001 esté libre
- Reiniciar el servicio con `npm start`

## 📱 Compatibilidad

- ✅ **Chrome/Chromium** (recomendado)
- ✅ **Firefox** (limitado)
- ✅ **Safari** (limitado)
- ✅ **Edge** (limitado)

## 🔒 Seguridad

- **Permisos de micrófono** requeridos
- **Comunicación local** entre servicios
- **No almacenamiento** de datos personales
- **Código abierto** y auditable

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abrir un Pull Request

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles

## 🎵 Radio Saltillo

**"La voz del desierto coahuilense"**

- 📻 Música regional
- 🏺 Productos locales
- 🎨 Cultura tradicional
- 🌵 Orgullo saltillense

---

*Desarrollado con ❤️ para Radio Saltillo*
