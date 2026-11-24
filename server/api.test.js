// ===== Módulo: Pruebas de integración =====
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from './index.js';
import { generarFolio, hashToken, nuevoToken, pool, procesarColaCorreos, query } from './core.js';
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
  await query('DELETE FROM log_accesos WHERE correo LIKE $1', ['qa.%']);
  await query('DELETE FROM cola_correos WHERE para LIKE $1', ['qa.%']);
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

const citaDeEventoPasado = async () => {
  const {
    rows: [ev],
  } = await query(`SELECT id, to_char(hora_inicio, 'HH24:MI') AS hora FROM eventos WHERE fecha < CURRENT_DATE ORDER BY fecha DESC LIMIT 1`);
  const {
    rows: [u],
  } = await query(`SELECT id FROM usuarios WHERE correo = $1`, [correoNuevo]);
  await query(`DELETE FROM citas WHERE usuario_id = $1 AND evento_id = $2`, [u.id, ev.id]);
  const {
    rows: [cita],
  } = await query(`INSERT INTO citas (folio, usuario_id, evento_id, hora) VALUES ($1,$2,$3,$4) RETURNING id, folio`, [generarFolio(), u.id, ev.id, ev.hora]);
  return cita;
};

test('RF-10 la asistencia no se puede marcar antes del día del evento', async () => {
  const { data: activas } = await api('GET', '/citas/admin?estado=activa&proximas=1', { token: tokenAdmin });
  const futura = activas.find((c) => c.fecha > new Date().toISOString().slice(0, 10));
  const r = await api('PATCH', `/citas/${futura.id}/estado`, { token: tokenAdmin, body: { estado: 'atendida' } });
  assert.equal(r.status, 409);
});

test('RF-10 solo acepta cabello de 20 a 35 cm y la donación queda ligada a la cita atendida', async () => {
  const cita = await citaDeEventoPasado();
  const marcada = await api('PATCH', `/citas/${cita.id}/estado`, { token: tokenAdmin, body: { estado: 'atendida' } });
  assert.equal(marcada.status, 200);
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
  // Los correos se mandan en segundo plano: esperamos hasta 5 s a que queden los 3 registros
  const contar = async () => (await query('SELECT COUNT(*) AS n FROM log_correos')).rows[0].n - antes;
  for (let i = 0; i < 50 && (await contar()) < 3; i++) await new Promise((r) => setTimeout(r, 100));
  const { rows } = await query('SELECT tipo FROM log_correos ORDER BY id DESC LIMIT 3');
  assert.equal(await contar(), 3);
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

const registrarQa = async (prefijo, password = 'Prueba123') => {
  const correo = `qa.${prefijo}.${Date.now()}@correo.com`;
  const r = await api('POST', '/auth/registro', {
    body: { nombre: 'QA', apellido: prefijo, correo, telefono: '3312345678', password, consentimientoDatos: true },
  });
  assert.equal(r.status, 201);
  return { correo, password, token: r.data.token, id: r.data.usuario.id };
};

test('Seguridad: el registro guarda la fecha del consentimiento', async () => {
  const qa = await registrarQa('consentimiento');
  const {
    rows: [u],
  } = await query('SELECT consentimiento_en FROM usuarios WHERE id = $1', [qa.id]);
  assert.ok(u.consentimiento_en);
});

test('Seguridad: los inicios de sesión fallidos quedan en la bitácora con IP', async () => {
  const qa = await registrarQa('bitacora');
  const r = await api('POST', '/auth/login', { body: { correo: qa.correo, password: 'incorrecta1' } });
  assert.equal(r.status, 401);
  const {
    rows: [a],
  } = await query('SELECT exito, motivo, ip FROM log_accesos WHERE correo = $1 ORDER BY id DESC LIMIT 1', [qa.correo]);
  assert.equal(a.exito, false);
  assert.equal(a.motivo, 'password_incorrecta');
  assert.ok(a.ip);
  const accesos = await api('GET', '/admin/accesos', { token: tokenAdmin });
  assert.equal(accesos.status, 200);
  assert.ok(accesos.data.accesos.some((x) => x.correo === qa.correo));
  assert.equal((await api('GET', '/admin/accesos', { token: tokenMaria })).status, 403);
});

test('Recuperación: responde igual exista o no el correo y solo crea enlace para cuentas reales', async () => {
  const qa = await registrarQa('recupera');
  const existe = await api('POST', '/auth/recuperar', { body: { correo: qa.correo } });
  const noExiste = await api('POST', '/auth/recuperar', { body: { correo: `qa.nadie.${Date.now()}@correo.com` } });
  assert.equal(existe.status, 200);
  assert.equal(noExiste.status, 200);
  assert.equal(existe.data.mensaje, noExiste.data.mensaje);
  const {
    rows: [t],
  } = await query(`SELECT tipo, expira_en FROM tokens_recuperacion WHERE usuario_id = $1 AND usado_en IS NULL`, [qa.id]);
  assert.equal(t.tipo, 'recuperacion');
  assert.ok(new Date(t.expira_en) > new Date());
});

test('Recuperación: el enlace cambia la contraseña, cierra sesiones abiertas y solo sirve una vez', async () => {
  const qa = await registrarQa('restablece');
  const token = nuevoToken();
  await query(`INSERT INTO tokens_recuperacion (usuario_id, token_hash, expira_en) VALUES ($1,$2, NOW() + interval '1 hour')`, [qa.id, hashToken(token)]);

  const valido = await api('POST', '/auth/restablecer/validar', { body: { token } });
  assert.equal(valido.status, 200);
  assert.equal(valido.data.tipo, 'recuperacion');

  const debil = await api('POST', '/auth/restablecer', { body: { token, password: 'corta' } });
  assert.equal(debil.status, 400);

  const ok = await api('POST', '/auth/restablecer', { body: { token, password: 'NuevaClave2026' } });
  assert.equal(ok.status, 200);

  assert.equal((await api('GET', '/auth/yo', { token: qa.token })).status, 401);
  assert.equal((await api('POST', '/auth/login', { body: { correo: qa.correo, password: qa.password } })).status, 401);
  assert.equal((await api('POST', '/auth/login', { body: { correo: qa.correo, password: 'NuevaClave2026' } })).status, 200);

  const otraVez = await api('POST', '/auth/restablecer', { body: { token, password: 'OtraClave2026' } });
  assert.equal(otraVez.status, 400);
});

test('Recuperación: un enlace vencido no sirve', async () => {
  const qa = await registrarQa('vencido');
  const token = nuevoToken();
  await query(`INSERT INTO tokens_recuperacion (usuario_id, token_hash, expira_en) VALUES ($1,$2, NOW() - interval '1 minute')`, [qa.id, hashToken(token)]);
  assert.equal((await api('POST', '/auth/restablecer/validar', { body: { token } })).status, 400);
  assert.equal((await api('POST', '/auth/restablecer', { body: { token, password: 'NuevaClave2026' } })).status, 400);
});

test('Perfil: cambiar la contraseña pide la actual y entrega una sesión nueva', async () => {
  const qa = await registrarQa('cambio');
  const mala = await api('PATCH', '/auth/password', { token: qa.token, body: { actual: 'Equivocada1', nueva: 'Distinta2026' } });
  assert.equal(mala.status, 400);
  const ok = await api('PATCH', '/auth/password', { token: qa.token, body: { actual: qa.password, nueva: 'Distinta2026' } });
  assert.equal(ok.status, 200);
  assert.equal((await api('GET', '/auth/yo', { token: qa.token })).status, 401);
  assert.equal((await api('GET', '/auth/yo', { token: ok.data.token })).status, 200);
});

test('Administradores: solo un admin puede dar acceso y el cambio de rol se aplica al instante', async () => {
  const qa = await registrarQa('promovido');
  const datos = { nombre: 'QA', apellido: 'Admin', correo: qa.correo, telefono: '3312345678' };
  assert.equal((await api('POST', '/admin/administradores', { token: tokenMaria, body: datos })).status, 403);

  const promovido = await api('POST', '/admin/administradores', { token: tokenAdmin, body: datos });
  assert.equal(promovido.status, 201);
  assert.equal(promovido.data.accion, 'promovido');
  assert.equal((await api('GET', '/reportes/dashboard', { token: qa.token })).status, 401);

  const login = await api('POST', '/auth/login', { body: { correo: qa.correo, password: qa.password } });
  assert.equal(login.data.usuario.rol, 'administrador');
  assert.equal((await api('GET', '/reportes/dashboard', { token: login.data.token })).status, 200);

  const lista = await api('GET', '/admin/administradores', { token: tokenAdmin });
  assert.ok(lista.data.some((a) => a.correo === qa.correo));

  assert.equal((await api('PATCH', `/admin/administradores/${qa.id}/quitar`, { token: login.data.token })).status, 409);
  assert.equal((await api('PATCH', `/admin/administradores/${qa.id}/quitar`, { token: tokenAdmin })).status, 200);
  assert.equal((await api('GET', '/reportes/dashboard', { token: login.data.token })).status, 401);
});

test('Administradores: invitar un correo nuevo crea la cuenta con enlace de activación', async () => {
  const correo = `qa.invitado.${Date.now()}@correo.com`;
  const r = await api('POST', '/admin/administradores', {
    token: tokenAdmin,
    body: { nombre: 'QA', apellido: 'Invitado', correo, telefono: '3312345678' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.accion, 'invitado');
  const {
    rows: [t],
  } = await query(
    `SELECT t.tipo FROM tokens_recuperacion t JOIN usuarios u ON u.id = t.usuario_id WHERE u.correo = $1 AND t.usado_en IS NULL`,
    [correo]
  );
  assert.equal(t.tipo, 'activacion');
  const repetido = await api('POST', '/admin/administradores', { token: tokenAdmin, body: { nombre: 'QA', correo, telefono: '3312345678' } });
  assert.equal(repetido.status, 409);
});

test('RF-07 cancelar dos veces la misma cita responde 409', async () => {
  const qa = await registrarQa('doblecancel');
  const { data: ev } = await api('POST', '/eventos', {
    token: tokenAdmin,
    body: {
      nombre: 'QA doble cancelación', fecha: '2030-02-10', hora_inicio: '08:00', hora_fin: '09:00', cupo_total: 5,
      capacidad_por_horario: 5, centro: 'QA', direccion: 'QA', ciudad: 'QA', estado: 'activo',
    },
  });
  const cita = await api('POST', '/citas', { token: qa.token, body: { evento_id: ev.id, hora: '08:00' } });
  assert.equal(cita.status, 201);
  const [a, b] = await Promise.all([
    api('PATCH', `/citas/${cita.data.id}/cancelar`, { token: qa.token }),
    api('PATCH', `/citas/${cita.data.id}/cancelar`, { token: qa.token }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
});

test('Evento: la lista de asistentes se descarga en PDF y solo la baja el admin', async () => {
  const { data: eventos } = await api('GET', '/eventos');
  const ruta = `${base}/eventos/${eventos[0].id}/asistentes/pdf`;
  const ok = await fetch(ruta, { headers: { Authorization: `Bearer ${tokenAdmin}` } });
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('content-type'), /application\/pdf/);
  assert.equal(Buffer.from(await ok.arrayBuffer()).subarray(0, 4).toString(), '%PDF');
  const donante = await fetch(ruta, { headers: { Authorization: `Bearer ${tokenMaria}` } });
  assert.equal(donante.status, 403);
});

test('RF-08 un correo que falló se reintenta desde la cola', async () => {
  const para = `qa.cola.${Date.now()}@correo.com`;
  await query(
    `INSERT INTO cola_correos (para, tipo, asunto, contenido, proximo_intento) VALUES ($1,'prueba','QA cola',$2, NOW() - interval '1 minute')`,
    [para, JSON.stringify({ titulo: 'QA', intro: 'Reintento' })]
  );
  const r = await procesarColaCorreos();
  assert.ok(r.enviados >= 1);
  assert.equal((await query('SELECT 1 FROM cola_correos WHERE para = $1', [para])).rowCount, 0);
  assert.equal((await query('SELECT 1 FROM log_correos WHERE destinatario = $1 AND exito', [para])).rowCount, 1);
  await query('DELETE FROM log_correos WHERE destinatario = $1', [para]);
});

test('Seguridad: pedir muchos enlaces de recuperación desde la misma IP se limita', async () => {
  const estados = [];
  for (let i = 0; i < 8; i++) {
    estados.push((await api('POST', '/auth/recuperar', { body: { correo: `qa.limite.${i}@correo.com` } })).status);
  }
  assert.ok(estados.includes(429));
});
