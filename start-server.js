const { spawn } = require('child_process');
const path = require('path');

class SaltilloServerManager {
    constructor() {
        this.processes = [];
        this.isShuttingDown = false;
    }

    async start() {
        console.log('🚀 Iniciando Radio Saltillo - Servidor Completo');
        console.log('=' .repeat(50));
        
        try {
            // Iniciar servicio de automatización de Shazam
            console.log('🎵 Iniciando servicio de automatización de Shazam...');
            const shazamProcess = spawn('node', ['shazam-automation.js'], {
                stdio: 'inherit',
                cwd: __dirname
            });
            
            this.processes.push({
                name: 'Shazam Automation',
                process: shazamProcess
            });
            
            // Esperar un poco para que el servicio de Shazam se inicie
            await this.sleep(3000);
            
            // Iniciar servidor proxy principal
            console.log('📡 Iniciando servidor proxy principal...');
            const proxyProcess = spawn('node', ['proxy-server.js'], {
                stdio: 'inherit',
                cwd: __dirname
            });
            
            this.processes.push({
                name: 'Proxy Server',
                process: proxyProcess
            });
            
            // Configurar manejo de señales de cierre
            this.setupSignalHandlers();
            
            console.log('✅ Todos los servicios iniciados correctamente');
            console.log('=' .repeat(50));
            console.log('🌐 Servidor principal: http://localhost:3000');
            console.log('🎵 Servicio de Shazam: http://localhost:3002');
            console.log('📱 Abre tu navegador y disfruta de Radio Saltillo');
            console.log('=' .repeat(50));
            
        } catch (error) {
            console.error('❌ Error iniciando servicios:', error);
            await this.shutdown();
            process.exit(1);
        }
    }

    setupSignalHandlers() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        
        signals.forEach(signal => {
            process.on(signal, async () => {
                if (!this.isShuttingDown) {
                    console.log(`\n🛑 Recibida señal ${signal}, cerrando servicios...`);
                    await this.shutdown();
                    process.exit(0);
                }
            });
        });
    }

    async shutdown() {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        console.log('\n🧹 Cerrando todos los servicios...');
        
        const shutdownPromises = this.processes.map(({ name, process }) => {
            return new Promise((resolve) => {
                console.log(`🛑 Cerrando ${name}...`);
                
                process.on('close', (code) => {
                    console.log(`✅ ${name} cerrado (código: ${code})`);
                    resolve();
                });
                
                process.on('error', (error) => {
                    console.error(`❌ Error cerrando ${name}:`, error);
                    resolve();
                });
                
                // Intentar cierre graceful primero
                process.kill('SIGTERM');
                
                // Forzar cierre después de 5 segundos
                setTimeout(() => {
                    if (!process.killed) {
                        console.log(`⚠️ Forzando cierre de ${name}...`);
                        process.kill('SIGKILL');
                    }
                }, 5000);
            });
        });
        
        await Promise.all(shutdownPromises);
        console.log('✅ Todos los servicios cerrados correctamente');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Función principal
async function main() {
    const serverManager = new SaltilloServerManager();
    
    try {
        await serverManager.start();
    } catch (error) {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    }
}

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
    process.exit(1);
});

// Iniciar si se ejecuta directamente
if (require.main === module) {
    main();
}

module.exports = SaltilloServerManager;
