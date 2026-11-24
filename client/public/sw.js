const VERSION = 'ftk-v4';
const CACHE_APP = `${VERSION}-app`;
const CACHE_API = `${VERSION}-api`;
const PRECARGA = ['/', '/manifest.webmanifest', '/img/logo.png', '/img/icono-180.png', '/img/icono-512.png', '/favicon.ico'];
const API_GUARDABLE = [/^\/api\/eventos(\/\d+)?$/, /^\/api\/puntos$/, /^\/api\/citas\/mias$/, /^\/api\/citas\/admin$/, /^\/api\/auth\/yo$/];

async function precargar() {
  const cache = await caches.open(CACHE_APP);
  const html = await (await fetch('/', { cache: 'no-store' })).text();
  const recursos = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll([...new Set([...PRECARGA, ...recursos])]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precargar().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.tipo === 'cerrar-sesion') event.waitUntil(caches.delete(CACHE_API));
});

const sinConexion = () =>
  new Response(JSON.stringify({ error: 'Sin conexión a internet y no hay una copia guardada de esta información.' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });

async function primeroRed(request, cacheNombre, respaldo) {
  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) {
      const cache = await caches.open(cacheNombre);
      await cache.put(request, respuesta.clone());
    }
    return respuesta;
  } catch {
    const guardada = await caches.match(request, { ignoreVary: true });
    if (guardada) {
      const encabezados = new Headers(guardada.headers);
      encabezados.set('X-Desde-Cache', '1');
      return new Response(guardada.body, { status: guardada.status, headers: encabezados });
    }
    return respaldo ? respaldo() : sinConexion();
  }
}

async function primeroCache(request) {
  const guardada = await caches.match(request, { ignoreVary: true });
  if (guardada) return guardada;
  const respuesta = await fetch(request);
  if (respuesta.ok) {
    const cache = await caches.open(CACHE_APP);
    await cache.put(request, respuesta.clone());
  }
  return respuesta;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    if (API_GUARDABLE.some((r) => r.test(url.pathname))) event.respondWith(primeroRed(request, CACHE_API));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(primeroRed(request, CACHE_APP, () => caches.match('/', { ignoreVary: true })));
    return;
  }

  const estatico =
    url.origin === self.location.origin
      ? /^\/(assets|img|eventos|uploads)\//.test(url.pathname) || ['/favicon.ico', '/manifest.webmanifest'].includes(url.pathname)
      : /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (estatico) event.respondWith(primeroCache(request));
});
