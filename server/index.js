// ===== Módulo: Arranque =====
import { iniciarServidor } from './app.js';

iniciarServidor({ desarrollo: process.argv.includes('--dev') });
