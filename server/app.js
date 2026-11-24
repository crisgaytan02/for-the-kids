// ===== Módulo: Aplicación =====
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { APP_URL, ROOT_DIR, UPLOADS_DIR, iniciarRecordatorios, migrar, verificarCorreo } from './core.js';
import api from './api.js';

const proxyConfiable = (valor) => {
  if (valor === undefined || valor === '') return 'loopback';
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return /^\d+$/.test(valor) ? Number(valor) : valor;
};

const app = express();
let estado = 'listo';
app.disable('x-powered-by');
app.set('trust proxy', proxyConfiable(process.env.TRUST_PROXY));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use((req, res, next) => {
  if (estado === 'listo' || req.path === '/api/salud') return next();
  res.setHeader('Retry-After', '5');
  const mensaje = estado === 'error' ? 'El servicio no está disponible en este momento.' : 'Estamos iniciando, intenta de nuevo en unos segundos.';
  if (req.path.startsWith('/api')) return res.status(503).json({ error: mensaje });
  res.status(503).type('html').send(`<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="5"><title>For The Kids</title><p style="font-family:system-ui;text-align:center;margin-top:20vh">${mensaje}</p></html>`);
});
app.use(cors({ origin: APP_URL }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/api/salud', (_req, res) => res.status(estado === 'error' ? 503 : 200).json({ ok: estado === 'listo', estado, servicio: 'for-the-kids' }));
app.use('/api', api);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// ===== Módulo: Manejo de errores =====
const manejarErrores = (err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'La imagen pesa más de 5 MB.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'La solicitud es demasiado grande.' });
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
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    console.log('No existe client/dist: compilando la página...');
    try {
      const { build } = await import('vite');
      await build({ configFile: path.join(ROOT_DIR, 'vite.config.js'), logLevel: 'warn' });
      console.log('Página compilada.');
    } catch (err) {
      console.error(`No se pudo compilar la página: ${err.message}`);
      return;
    }
  }
  app.use(express.static(dist, { redirect: false }));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const puertoDeEscucha = () => {
  const valor = process.env.PORT;
  if (!valor) return 4000;
  return /^\d+$/.test(valor) ? Number(valor) : valor;
};

export async function iniciarServidor({ desarrollo = false } = {}) {
  if (!process.env.JWT_SECRET) {
    console.error('Falta JWT_SECRET en las variables de entorno.');
    process.exit(1);
  }
  process.on('unhandledRejection', (err) => console.error('Error no manejado:', err));
  estado = 'iniciando';
  const puerto = puertoDeEscucha();
  await new Promise((resolve) => app.listen(puerto, resolve));
  const direccion = typeof puerto === 'number' ? `http://localhost:${puerto}` : puerto;
  console.log(`For The Kids escuchando en ${direccion}${desarrollo ? ' (modo desarrollo)' : ''}`);
  try {
    await migrar();
    await montarFrontend(desarrollo);
    app.use(manejarErrores);
    estado = 'listo';
    console.log('For The Kids listo para recibir visitas.');
  } catch (err) {
    estado = 'error';
    console.error(`No se pudo preparar la aplicación: ${err.message}`);
    return;
  }
  verificarCorreo();
  iniciarRecordatorios();
}
