// ===== Módulo: Pruebas de integración =====
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from './index.js';
import { pool, query } from './core.js';
import { ADMIN, DONANTES } from './seed.js';

const [, , CORREO_DONANTE, PASS_DONANTE] = DONANTES[0];

process.env.NODE_ENV = 'test';
let server;
let base;

const api = async (metodo, ruta, { token, body } = {}) => {
  const res = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  return { status: res.status, data };
};

let tokenAdmin;
let tokenMaria;
const correoNuevo = `qa.${Date.now()}@correo.com`;
let tokenNuevo;

before(async () => {
  server = app.listen(0);
  base = `http://localhost:${server.address().port}/api`;
  tokenAdmin = (await api('POST', '/auth/login', { body: { correo: ADMIN.correo, password: ADMIN.password } })).data.token;
  tokenMaria = (await api('POST', '/auth/login', { body: { correo: CORREO_DONANTE, password: PASS_DONANTE } })).data.token;
});

after(async () => {
  await query('DELETE FROM usuarios WHERE correo LIKE $1', ['qa.%']);
  await query(`DELETE FROM eventos WHERE nombre LIKE 'QA %'`);
  await query(`DELETE FROM notificaciones WHERE mensaje LIKE '%QA%'`);
  server.close();
  await pool.end();
});

test('RF-01 registro valida campos obligatorios y correo duplicado', async () => {
  const sinTel = await api('POST', '/auth/registro', { body: { nombre: 'QA', correo: correoNuevo, password: '12345678', consentimientoDatos: true } });
  assert.equal(sinTel.status, 400);

  const ok = await api('POST', '/auth/registro', {
    body: { nombre: 'QA', apellido: 'Tester', correo: correoNuevo, telefono: '33 1234 5678', password: '12345678', consentimientoDatos: true },
  });
  assert.equal(ok.status, 201);
  tokenNuevo = ok.data.token;

  const dup = await api('POST', '/auth/registro', {
    body: { nombre: 'QA', correo: correoNuevo, telefono: '33 1234 5678', password: '12345678', consentimientoDatos: true },
  });
  assert.equal(dup.status, 409);
});

test('RF-01 / SRS 3.4 sin consentimiento de datos o con contraseña sin número no se registra', async () => {
  const base = { nombre: 'QA', correo: `qa.consent.${Date.now()}@correo.com`, telefono: '33 1111 2222' };
  const sinConsentimiento = await api('POST', '/auth/registro', { body: { ...base, password: 'clave1234' } });
  assert.equal(sinConsentimiento.status, 400);
  const sinNumero = await api('POST', '/auth/registro', { body: { ...base, password: 'soloLetras', consentimientoDatos: true } });
  assert.equal(sinNumero.status, 400);
});

test('RF-02 bloquea después de 5 intentos fallidos', async () => {
  const correo = `qa.lock.${Date.now()}@correo.com`;
  await api('POST', '/auth/registro', { body: { nombre: 'QA', correo, telefono: '3312345678', password: '12345678', consentimientoDatos: true } });
  for (let i = 0; i < 4; i++) {
    const r = await api('POST', '/auth/login', { body: { correo, password: 'malisima' } });
    assert.equal(r.status, 401);
  }
  const quinto = await api('POST', '/auth/login', { body: { correo, password: 'malisima' } });
  assert.equal(quinto.status, 423);
  const aunqueSeaBuena = await api('POST', '/auth/login', { body: { correo, password: '12345678', consentimientoDatos: true } });
  assert.equal(aunqueSeaBuena.status, 423);
});

test('RF-03 / RF-04 eventos y puntos se consultan sin login', async () => {
  const ev = await api('GET', '/eventos');
  assert.equal(ev.status, 200);
  assert.ok(ev.data.length > 0);
  assert.ok(ev.data.every((e) => e.estado === 'activo' && 'cupo_restante' in e));

  const pts = await api('GET', '/puntos');
  assert.equal(pts.status, 200);
  assert.ok(pts.data.every((p) => p.direccion && p.telefono && p.horario));
});

test('RF-14 un donante recibe 403 en rutas de admin', async () => {
  for (const ruta of ['/reportes/dashboard', '/eventos/admin/todos', '/donaciones', '/citas/admin']) {
    const r = await api('GET', ruta, { token: tokenMaria });
    assert.equal(r.status, 403, ruta);
  }
});

test('RF-12 rechaza cupos menores o iguales a 0', async () => {
  const r = await api('POST', '/eventos', {
    token: tokenAdmin,
    body: {
      nombre: 'QA cupo cero', fecha: '2030-01-10', hora_inicio: '08:00', hora_fin: '10:00', cupo_total: 0,
      centro: 'QA', direccion: 'QA', ciudad: 'QA',
    },
  });
  assert.equal(r.status, 400);
});

test('RF-05 / RF-06 / RF-07 flujo de cita con cupo y sin sobrecupo', async () => {
  const { data: ev } = await api('POST', '/eventos', {
    token: tokenAdmin,
    body: {
      nombre: 'QA último lugar', fecha: '2030-01-10', hora_inicio: '08:00', hora_fin: '09:00', cupo_total: 1,
      capacidad_por_horario: 1, centro: 'QA', direccion: 'QA', ciudad: 'QA', estado: 'activo',
    },
  });

  const [a, b] = await Promise.all([
    api('POST', '/citas', { token: tokenMaria, body: { evento_id: ev.id, hora: '08:00' } }),
    api('POST', '/citas', { token: tokenNuevo, body: { evento_id: ev.id, hora: '08:00' } }),
  ]);
  const estados = [a.status, b.status].sort();
  assert.deepEqual(estados, [201, 409], 'solo una debe entrar');

  const ganadora = a.status === 201 ? a : b;
  assert.match(ganadora.data.folio, /^[A-Z0-9]{8}$/);

  const tokenGanador = a.status === 201 ? tokenMaria : tokenNuevo;
  const cancel = await api('PATCH', `/citas/${ganadora.data.id}/cancelar`, { token: tokenGanador });
  assert.equal(cancel.status, 200);
  const { data: detalle } = await api('GET', `/eventos/${ev.id}`);
  assert.equal(detalle.cupo_restante, 1);
});

test('RF-10 no deja registrar donación si la cita no está atendida', async () => {
  const { data: citas } = await api('GET', '/citas/admin?estado=activa', { token: tokenAdmin });
  const r = await api('POST', '/donaciones', { token: tokenAdmin, body: { cita_id: citas[0].id, largo_cm: 30 } });
  assert.equal(r.status, 409);
});

test('RF-11 el historial solo trae donaciones propias', async () => {
  const { data } = await api('GET', '/donaciones/mias', { token: tokenMaria });
  const { rows: [m] } = await query(`SELECT id FROM usuarios WHERE correo = $1`, [CORREO_DONANTE]);
  assert.ok(data.donaciones.every((d) => d.usuario_id === m.id));
});

test('RF-13 el reporte rechaza rangos de más de 90 días', async () => {
  const r = await api('GET', '/reportes?desde=2026-01-01&hasta=2026-06-30', { token: tokenAdmin });
  assert.equal(r.status, 400);
  const ok = await api('GET', '/reportes?desde=2026-07-01&hasta=2026-09-28', { token: tokenAdmin });
  assert.equal(ok.status, 200);
});

test('RF-10 solo acepta cabello de 20 a 35 cm y la donación queda ligada a la cita atendida', async () => {
  const { data: activas } = await api('GET', '/citas/admin?estado=activa', { token: tokenAdmin });
  const cita = activas[activas.length - 1];
  await api('PATCH', `/citas/${cita.id}/estado`, { token: tokenAdmin, body: { estado: 'atendida' } });
  const corto = await api('POST', '/donaciones', { token: tokenAdmin, body: { cita_id: cita.id, largo_cm: 15 } });
  assert.equal(corto.status, 400);
  const largo = await api('POST', '/donaciones', { token: tokenAdmin, body: { cita_id: cita.id, largo_cm: 40 } });
  assert.equal(largo.status, 400);
  const ok = await api('POST', '/donaciones', { token: tokenAdmin, body: { cita_id: cita.id, largo_cm: 28 } });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.largo_cm, 28);
  assert.equal(ok.data.folio, cita.folio);
});

test('RF-08 agendar, reprogramar y cancelar dejan registro de correo', async () => {
  const { data: eventos } = await api('GET', '/eventos');
  const ev = eventos[eventos.length - 1];
  const { data: detalle } = await api('GET', `/eventos/${ev.id}`);
  const libres = detalle.horarios.filter((h) => h.disponibles > 0);
  const antes = (await query('SELECT COUNT(*) AS n FROM log_correos')).rows[0].n;
  const cita = await api('POST', '/citas', { token: tokenNuevo, body: { evento_id: ev.id, hora: libres[0].hora } });
  assert.equal(cita.status, 201);
  const rep = await api('PATCH', `/citas/${cita.data.id}/reprogramar`, { token: tokenNuevo, body: { hora: libres[1].hora } });
  assert.equal(rep.status, 200);
  const can = await api('PATCH', `/citas/${cita.data.id}/cancelar`, { token: tokenNuevo });
  assert.equal(can.status, 200);
  await new Promise((r) => setTimeout(r, 500));
  const { rows } = await query('SELECT tipo FROM log_correos ORDER BY id DESC LIMIT 3');
  assert.equal((await query('SELECT COUNT(*) AS n FROM log_correos')).rows[0].n - antes, 3);
  assert.deepEqual(rows.map((r) => r.tipo).sort(), ['cancelacion', 'confirmacion', 'reprogramacion']);
});

test('RF-13 el reporte se exporta en PDF y solo lo baja el admin', async () => {
  const ruta = '/reportes/pdf?desde=2026-09-12&hasta=2026-10-01';
  const ok = await fetch(`${base}${ruta}`, { headers: { Authorization: `Bearer ${tokenAdmin}` } });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('content-type'), /application\/pdf/);
  const bytes = Buffer.from(await ok.arrayBuffer());
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');

  const donante = await fetch(`${base}${ruta}`, { headers: { Authorization: `Bearer ${tokenMaria}` } });
  assert.equal(donante.status, 403);
});
