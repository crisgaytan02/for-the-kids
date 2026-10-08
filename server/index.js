// ===== Módulo: Servidor =====
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { APP_URL, ROOT_DIR, UPLOADS_DIR, iniciarRecordatorios, verificarCorreo } from './core.js';
import api from './api.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: APP_URL }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/api/salud', (_req, res) => res.json({ ok: true, servicio: 'for-the-kids' }));
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// ===== Módulo: Manejo de errores =====
const manejarErrores = (err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'La imagen pesa más de 5 MB.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON viene mal formado.' });
  if (err.code === '23514') return res.status(400).json({ error: 'Algún dato no cumple las reglas del sistema.' });
  if (['22P02', '22007', '22008'].includes(err.code)) return res.status(400).json({ error: 'Algún dato viene con un formato inválido.' });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? 'Algo salió mal de nuestro lado. Intenta de nuevo.' : err.message,
    ...(err.details ? { detalles: err.details } : {}),
  });
};
app.use('/api', manejarErrores);

export default app;

// ===== Módulo: Página web =====
async function montarFrontend(desarrollo) {
  const clientDir = path.join(ROOT_DIR, 'client');
  if (desarrollo) {
    const { createServer } = await import('vite');
    const vite = await createServer({ configFile: path.join(ROOT_DIR, 'vite.config.js'), server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    return;
  }
  const dist = path.join(clientDir, 'dist');
  if (!fs.existsSync(dist)) {
    console.warn('No existe client/dist. Corre "npm run build" o usa "npm run dev".');
    return;
  }
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

export async function iniciarServidor({ desarrollo = false } = {}) {
  if (!process.env.JWT_SECRET) {
    console.error('Falta JWT_SECRET en el .env. Copia .env.example como .env y llénalo.');
    process.exit(1);
  }
  await montarFrontend(desarrollo);
  app.use(manejarErrores);
  const puerto = Number(process.env.PORT || 4000);
  app.listen(puerto, () => {
    console.log(`For The Kids en http://localhost:${puerto}${desarrollo ? ' (modo desarrollo)' : ''}`);
    verificarCorreo();
    iniciarRecordatorios();
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  iniciarServidor({ desarrollo: process.argv.includes('--dev') });
}
