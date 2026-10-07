import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import {
  DATE_RE,
  EMAIL_RE,
  HttpError,
  LARGO_MAX,
  LARGO_MIN,
  SQL_CITA,
  SQL_EVENTO,
  TIME_RE,
  UPLOADS_DIR,
  asyncHandler,
  correoCancelacion,
  correoConfigurado,
  correoConfirmacion,
  correoPrueba,
  correoReprogramacion,
  generarFolio,
  generarHorarios,
  generarReportePdf,
  notificar,
  query,
  requireAdmin,
  requireAuth,
  requireFields,
  requireRole,
  toInt,
  verificarCorreo,
  withTransaction,
} from './core.js';

const api = Router();

const publico = (u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido, correo: u.correo, telefono: u.telefono, rol: u.rol });

const firmarToken = (u) =>
  jwt.sign({ sub: u.id, rol: u.rol, nombre: u.nombre }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });

const filtrar = (body, campos) => Object.fromEntries(campos.filter((c) => body[c] !== undefined).map((c) => [c, body[c]]));

// ===== Módulo: Registro =====
api.post(
  '/auth/registro',
  asyncHandler(async (req, res) => {
    const { nombre, apellido = '', correo, telefono, password, consentimientoDatos } = req.body;
    requireFields(req.body, ['nombre', 'correo', 'telefono', 'password']);
    if (!EMAIL_RE.test(correo)) throw new HttpError(400, 'El correo no tiene un formato válido.');
    if (String(password).length < 8 || !/\d/.test(password)) {
      throw new HttpError(400, 'La contraseña debe tener mínimo 8 caracteres y al menos un número.');
    }
    if (String(telefono).replace(/\D/g, '').length !== 10) throw new HttpError(400, 'El teléfono debe tener 10 dígitos, sin lada.');
    if (consentimientoDatos !== true) {
      throw new HttpError(400, 'Necesitamos tu consentimiento para el tratamiento de tus datos personales.');
    }

    const correoNorm = correo.trim().toLowerCase();
    const existe = await query('SELECT 1 FROM usuarios WHERE correo = $1', [correoNorm]);
    if (existe.rowCount) throw new HttpError(409, 'Ese correo ya está registrado. ¿Quieres iniciar sesión?');

    const { rows } = await query(
      'INSERT INTO usuarios (nombre, apellido, correo, telefono, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [nombre.trim(), apellido.trim(), correoNorm, telefono.trim(), await bcrypt.hash(password, 10)]
    );
    await notificar('donante', `Nuevo donante: ${rows[0].nombre} ${rows[0].apellido}`.trim());
    res.status(201).json({ token: firmarToken(rows[0]), usuario: publico(rows[0]) });
  })
);

// ===== Módulo: Login =====
const MAX_INTENTOS = 5;
const VENTANA_MIN = 10;
const BLOQUEO_MIN = 15;

api.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['correo', 'password']);
    const { rows } = await query('SELECT * FROM usuarios WHERE correo = $1', [req.body.correo.trim().toLowerCase()]);
    const u = rows[0];
    const credencialesMal = new HttpError(401, 'Correo o contraseña incorrectos.');
    if (!u) throw credencialesMal;

    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
      const min = Math.ceil((new Date(u.bloqueado_hasta) - new Date()) / 60000);
      throw new HttpError(423, `Demasiados intentos. Intenta de nuevo en ${min} min.`);
    }

    if (!(await bcrypt.compare(req.body.password, u.password_hash))) {
      const ventanaVencida = !u.primer_intento_en || Date.now() - new Date(u.primer_intento_en).getTime() > VENTANA_MIN * 60000;
      const intentos = ventanaVencida ? 1 : u.intentos_fallidos + 1;
      if (intentos >= MAX_INTENTOS) {
        await query(
          `UPDATE usuarios SET intentos_fallidos = 0, primer_intento_en = NULL,
             bloqueado_hasta = NOW() + ($2 || ' minutes')::interval WHERE id = $1`,
          [u.id, BLOQUEO_MIN]
        );
        throw new HttpError(423, `Bloqueamos tu acceso ${BLOQUEO_MIN} minutos por seguridad.`);
      }
      await query(
        `UPDATE usuarios SET intentos_fallidos = $2,
           primer_intento_en = CASE WHEN $3 THEN NOW() ELSE primer_intento_en END WHERE id = $1`,
        [u.id, intentos, ventanaVencida]
      );
      throw credencialesMal;
    }

    await query('UPDATE usuarios SET intentos_fallidos = 0, primer_intento_en = NULL, bloqueado_hasta = NULL WHERE id = $1', [u.id]);
    res.json({ token: firmarToken(u), usuario: publico(u) });
  })
);

api.get(
  '/auth/yo',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query('SELECT * FROM usuarios WHERE id = $1', [req.user.id]);
    if (!rows[0]) throw new HttpError(404, 'Usuario no encontrado.');
    res.json({ usuario: publico(rows[0]) });
  })
);

// ===== Módulo: Eventos =====
const ESTADOS_EVENTO = ['borrador', 'programado', 'activo', 'finalizado', 'cancelado'];
const CAMPOS_EVENTO = [
  'nombre',
  'descripcion',
  'fecha',
  'hora_inicio',
  'hora_fin',
  'duracion_cita_min',
  'capacidad_por_horario',
  'cupo_total',
  'centro',
  'direccion',
  'ciudad',
  'requisitos',
  'imagen_url',
  'estado',
  'punto_id',
];

const obtenerEvento = async (id) => (await query(`${SQL_EVENTO} WHERE e.id = $1`, [id])).rows[0];

function validarEvento(body, parcial = false) {
  if (!parcial) requireFields(body, ['nombre', 'fecha', 'hora_inicio', 'hora_fin', 'cupo_total', 'centro', 'direccion', 'ciudad']);
  const datos = filtrar(body, CAMPOS_EVENTO);
  if (datos.fecha && !DATE_RE.test(datos.fecha)) throw new HttpError(400, 'La fecha debe tener formato AAAA-MM-DD.');
  if (datos.hora_inicio && !TIME_RE.test(datos.hora_inicio)) throw new HttpError(400, 'Hora de inicio inválida.');
  if (datos.hora_fin && !TIME_RE.test(datos.hora_fin)) throw new HttpError(400, 'Hora de fin inválida.');
  if (datos.hora_inicio && datos.hora_fin && datos.hora_fin <= datos.hora_inicio) {
    throw new HttpError(400, 'La hora de fin debe ser después de la de inicio.');
  }
  for (const c of ['cupo_total', 'duracion_cita_min', 'capacidad_por_horario']) {
    if (datos[c] === undefined) continue;
    const n = Number(datos[c]);
    if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `El campo ${c} debe ser un entero mayor a 0.`);
    datos[c] = n;
  }
  if (datos.estado && !ESTADOS_EVENTO.includes(datos.estado)) throw new HttpError(400, 'Estado inválido.');
  if (datos.requisitos && !Array.isArray(datos.requisitos)) {
    datos.requisitos = String(datos.requisitos)
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (datos.punto_id === '') datos.punto_id = null;
  return datos;
}

api.get(
  '/eventos',
  asyncHandler(async (req, res) => {
    const { q, ciudad, filtro } = req.query;
    const where = [`e.estado = 'activo'`, 'e.fecha >= CURRENT_DATE'];
    const params = [];
    if (q) {
      params.push(`%${q}%`);
      const p = `$${params.length}`;
      where.push(`(e.nombre ILIKE ${p} OR e.centro ILIKE ${p} OR e.ciudad ILIKE ${p})`);
    }
    if (ciudad) {
      params.push(ciudad);
      where.push(`e.ciudad = $${params.length}`);
    }
    if (filtro === 'proximos') where.push('e.fecha <= CURRENT_DATE + 14');
    if (filtro === 'mes') where.push(`date_trunc('month', e.fecha) = date_trunc('month', CURRENT_DATE)`);
    const { rows } = await query(`${SQL_EVENTO} WHERE ${where.join(' AND ')} ORDER BY e.fecha, e.hora_inicio`, params);
    res.json(rows);
  })
);

api.get(
  '/eventos/ciudades',
  asyncHandler(async (_req, res) => {
    const { rows } = await query(`SELECT DISTINCT ciudad FROM eventos WHERE estado = 'activo' AND fecha >= CURRENT_DATE ORDER BY ciudad`);
    res.json(rows.map((r) => r.ciudad));
  })
);

api.get(
  '/eventos/admin/todos',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const params = [];
    const where = ['TRUE'];
    if (ESTADOS_EVENTO.includes(req.query.estado)) {
      params.push(req.query.estado);
      where.push(`e.estado = $${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      where.push(`(e.nombre ILIKE $${params.length} OR e.centro ILIKE $${params.length})`);
    }
    const { rows } = await query(`${SQL_EVENTO} WHERE ${where.join(' AND ')} ORDER BY (e.fecha < CURRENT_DATE), e.fecha ASC`, params);
    const {
      rows: [stats],
    } = await query(`
      SELECT
        COUNT(*) FILTER (WHERE estado = 'activo' AND fecha >= CURRENT_DATE) AS activos,
        COUNT(*) FILTER (WHERE estado = 'activo' AND creado_en >= date_trunc('month', NOW())) AS activos_nuevos_mes,
        COUNT(*) FILTER (WHERE fecha >= CURRENT_DATE AND estado IN ('activo','programado','borrador')) AS proximos,
        (SELECT COUNT(*) FROM citas WHERE estado IN ('activa','atendida')) AS inscripciones
      FROM eventos`);
    res.json({ eventos: rows, stats });
  })
);

api.get(
  '/eventos/:id',
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id, 'id');
    const evento = await obtenerEvento(id);
    if (!evento) throw new HttpError(404, 'No encontramos ese evento.');
    const ocupados = await query(
      `SELECT to_char(hora, 'HH24:MI') AS hora, COUNT(*) AS n FROM citas
       WHERE evento_id = $1 AND estado IN ('activa','atendida') GROUP BY hora`,
      [id]
    );
    const mapa = Object.fromEntries(ocupados.rows.map((r) => [r.hora, r.n]));
    evento.horarios = generarHorarios(evento.hora_inicio, evento.hora_fin, evento.duracion_cita_min).map((hora) => ({
      hora,
      disponibles: evento.cupo_restante === 0 ? 0 : Math.max(evento.capacidad_por_horario - (mapa[hora] || 0), 0),
    }));
    res.json(evento);
  })
);

api.post(
  '/eventos',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const datos = { ...validarEvento(req.body), creado_por: req.user.id };
    const cols = Object.keys(datos);
    const { rows } = await query(
      `INSERT INTO eventos (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING id`,
      Object.values(datos)
    );
    res.status(201).json(await obtenerEvento(rows[0].id));
  })
);

api.put(
  '/eventos/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id, 'id');
    const datos = validarEvento(req.body, true);
    if (!Object.keys(datos).length) throw new HttpError(400, 'No mandaste nada para actualizar.');
    if (datos.cupo_total) {
      const ev = await obtenerEvento(id);
      if (!ev) throw new HttpError(404, 'No encontramos ese evento.');
      if (datos.cupo_total < ev.inscritos) throw new HttpError(409, `Ya hay ${ev.inscritos} personas inscritas, el cupo no puede ser menor.`);
    }
    const sets = Object.keys(datos).map((c, i) => `${c} = $${i + 2}`);
    const r = await query(`UPDATE eventos SET ${sets.join(', ')} WHERE id = $1`, [id, ...Object.values(datos)]);
    if (!r.rowCount) throw new HttpError(404, 'No encontramos ese evento.');
    res.json(await obtenerEvento(id));
  })
);

api.delete(
  '/eventos/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id, 'id');
    const {
      rows: [c],
    } = await query('SELECT COUNT(*) AS n FROM citas WHERE evento_id = $1', [id]);
    if (c.n > 0) {
      const { rows: afectadas } = await query(`${SQL_CITA} WHERE c.evento_id = $1 AND c.estado = 'activa'`, [id]);
      await query(`UPDATE eventos SET estado = 'cancelado' WHERE id = $1`, [id]);
      await query(`UPDATE citas SET estado = 'cancelada', cancelado_en = NOW() WHERE evento_id = $1 AND estado = 'activa'`, [id]);
      afectadas.forEach((cita) => correoCancelacion(cita, 'evento'));
      return res.json({ ok: true, accion: 'cancelado', avisados: afectadas.length });
    }
    const r = await query('DELETE FROM eventos WHERE id = $1', [id]);
    if (!r.rowCount) throw new HttpError(404, 'No encontramos ese evento.');
    res.json({ ok: true, accion: 'eliminado' });
  })
);

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, `evento-${Date.now()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ['image/png', 'image/jpeg'].includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, 'Solo aceptamos imágenes PNG o JPG.')),
});

api.post(
  '/eventos/imagen',
  requireAdmin,
  upload.single('imagen'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No llegó ninguna imagen.');
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  })
);

// ===== Módulo: Puntos de recolección =====
const CAMPOS_PUNTO = ['nombre', 'zona', 'ciudad', 'direccion', 'telefono', 'horario', 'activo'];

api.get(
  '/puntos',
  asyncHandler(async (_req, res) => {
    res.json((await query('SELECT * FROM puntos_recoleccion WHERE activo ORDER BY nombre')).rows);
  })
);

api.get(
  '/puntos/admin/todos',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json((await query('SELECT * FROM puntos_recoleccion ORDER BY activo DESC, nombre')).rows);
  })
);

api.post(
  '/puntos',
  requireAdmin,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['nombre', 'ciudad', 'direccion', 'telefono', 'horario']);
    const datos = filtrar(req.body, CAMPOS_PUNTO);
    const cols = Object.keys(datos);
    const { rows } = await query(
      `INSERT INTO puntos_recoleccion (${cols.join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`,
      Object.values(datos)
    );
    res.status(201).json(rows[0]);
  })
);

api.put(
  '/puntos/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id, 'id');
    const datos = filtrar(req.body, CAMPOS_PUNTO);
    if (!Object.keys(datos).length) throw new HttpError(400, 'No mandaste nada para actualizar.');
    const sets = Object.keys(datos).map((c, i) => `${c} = $${i + 2}`);
    const { rows } = await query(`UPDATE puntos_recoleccion SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, [id, ...Object.values(datos)]);
    if (!rows[0]) throw new HttpError(404, 'No encontramos ese punto.');
    res.json(rows[0]);
  })
);

api.delete(
  '/puntos/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const r = await query('UPDATE puntos_recoleccion SET activo = FALSE WHERE id = $1', [toInt(req.params.id, 'id')]);
    if (!r.rowCount) throw new HttpError(404, 'No encontramos ese punto.');
    res.json({ ok: true });
  })
);

// ===== Módulo: Citas =====
const HORAS_MIN_CANCELACION = 12;

const obtenerCita = async (id, db = { query }) => (await db.query(`${SQL_CITA} WHERE c.id = $1`, [id])).rows[0];

async function validarCupo(client, eventoId, hora, ignorarCitaId = null) {
  const { rows } = await client.query(
    `SELECT id, estado, to_char(hora_inicio,'HH24:MI') AS hora_inicio, to_char(hora_fin,'HH24:MI') AS hora_fin,
            duracion_cita_min, capacidad_por_horario, cupo_total, (fecha + $2::time) > LOCALTIMESTAMP AS es_futuro
     FROM eventos WHERE id = $1 FOR UPDATE`,
    [eventoId, hora]
  );
  const ev = rows[0];
  if (!ev) throw new HttpError(404, 'El evento no existe.');
  if (ev.estado !== 'activo') throw new HttpError(409, 'Este evento ya no está recibiendo citas.');
  if (!ev.es_futuro) throw new HttpError(409, 'Ese horario ya pasó, elige otro.');
  if (!generarHorarios(ev.hora_inicio, ev.hora_fin, ev.duracion_cita_min).includes(hora.slice(0, 5))) {
    throw new HttpError(400, 'Ese horario no existe para este evento.');
  }
  const {
    rows: [conteo],
  } = await client.query(
    `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE hora = $2::time) AS en_horario FROM citas
     WHERE evento_id = $1 AND estado IN ('activa','atendida') AND ($3::int IS NULL OR id <> $3)`,
    [eventoId, hora, ignorarCitaId]
  );
  if (conteo.total >= ev.cupo_total) throw new HttpError(409, 'Lo sentimos, el evento ya no tiene cupo.');
  if (conteo.en_horario >= ev.capacidad_por_horario) throw new HttpError(409, 'Ese horario se acaba de llenar, elige otro por favor.');
}

function validarHora(body) {
  requireFields(body, ['hora']);
  const hora = String(body.hora);
  if (!TIME_RE.test(hora)) throw new HttpError(400, 'Formato de hora inválido (HH:MM).');
  return hora;
}

async function citaEditable(req, accion) {
  const cita = await obtenerCita(toInt(req.params.id, 'id'));
  if (!cita) throw new HttpError(404, 'No encontramos esa cita.');
  const esAdmin = req.user.rol === 'administrador';
  if (!esAdmin && cita.usuario_id !== req.user.id) throw new HttpError(403, 'Esa cita no es tuya.');
  if (cita.estado !== 'activa') throw new HttpError(409, `Solo se pueden ${accion} citas activas.`);
  if (!esAdmin && cita.horas_faltantes < HORAS_MIN_CANCELACION) {
    throw new HttpError(409, `Solo puedes ${accion} con al menos ${HORAS_MIN_CANCELACION} horas de anticipación.`);
  }
  return { cita, esAdmin };
}

api.post(
  '/citas',
  requireAuth,
  requireRole('donante'),
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['evento_id']);
    const eventoId = toInt(req.body.evento_id, 'evento_id');
    const hora = validarHora(req.body);

    const citaId = await withTransaction(async (client) => {
      await validarCupo(client, eventoId, hora);
      const dup = await client.query(`SELECT 1 FROM citas WHERE usuario_id = $1 AND evento_id = $2 AND estado = 'activa'`, [req.user.id, eventoId]);
      if (dup.rowCount) throw new HttpError(409, 'Ya tienes una cita activa en este evento.');
      for (let intento = 0; intento < 5; intento++) {
        try {
          await client.query('SAVEPOINT folio');
          const { rows } = await client.query('INSERT INTO citas (folio, usuario_id, evento_id, hora) VALUES ($1,$2,$3,$4) RETURNING id', [
            generarFolio(),
            req.user.id,
            eventoId,
            hora,
          ]);
          return rows[0].id;
        } catch (err) {
          await client.query('ROLLBACK TO SAVEPOINT folio');
          if (err.code === '23505' && err.constraint === 'citas_folio_key') continue;
          if (err.code === '23505') throw new HttpError(409, 'Ya tienes una cita activa en este evento.');
          throw err;
        }
      }
      throw new HttpError(500, 'No pudimos generar el folio, intenta de nuevo.');
    });

    const cita = await obtenerCita(citaId);
    await notificar('cita', `Nueva cita de ${cita.usuario_nombre} · ${cita.evento_nombre}`);
    correoConfirmacion(cita);
    res.status(201).json(cita);
  })
);

api.get(
  '/citas/mias',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${SQL_CITA} WHERE c.usuario_id = $1 ORDER BY (c.estado = 'activa') DESC, e.fecha DESC, c.hora DESC`, [req.user.id]);
    res.json(rows);
  })
);

api.patch(
  '/citas/:id/cancelar',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { cita, esAdmin } = await citaEditable(req, 'cancelar');
    await query(`UPDATE citas SET estado = 'cancelada', cancelado_en = NOW() WHERE id = $1`, [cita.id]);
    await notificar('cita', `Cita cancelada · ${cita.usuario_nombre} (${cita.folio})`);
    const actualizada = await obtenerCita(cita.id);
    correoCancelacion(actualizada, esAdmin ? 'administrador' : 'donante');
    res.json(actualizada);
  })
);

api.patch(
  '/citas/:id/reprogramar',
  requireAuth,
  asyncHandler(async (req, res) => {
    const hora = validarHora(req.body);
    const { cita } = await citaEditable(req, 'reprogramar');
    await withTransaction(async (client) => {
      await validarCupo(client, cita.evento_id, hora, cita.id);
      await client.query('UPDATE citas SET hora = $2, recordatorio_enviado = FALSE WHERE id = $1', [cita.id, hora]);
    });
    await notificar('cita', `Cita reprogramada · ${cita.usuario_nombre} a las ${hora.slice(0, 5)}`);
    const actualizada = await obtenerCita(cita.id);
    correoReprogramacion(actualizada);
    res.json(actualizada);
  })
);

api.get(
  '/citas/admin',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const where = ['TRUE'];
    const params = [];
    if (req.query.estado) {
      params.push(req.query.estado);
      where.push(`c.estado = $${params.length}`);
    }
    if (req.query.evento_id) {
      params.push(toInt(req.query.evento_id, 'evento_id'));
      where.push(`c.evento_id = $${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      const p = `$${params.length}`;
      where.push(`(u.nombre || ' ' || u.apellido ILIKE ${p} OR c.folio ILIKE ${p} OR e.nombre ILIKE ${p})`);
    }
    const proximas = req.query.proximas === '1';
    if (proximas) where.push('e.fecha >= CURRENT_DATE');
    const orden = proximas ? 'e.fecha ASC, c.hora ASC' : 'e.fecha DESC, c.hora DESC';
    res.json((await query(`${SQL_CITA} WHERE ${where.join(' AND ')} ORDER BY ${orden} LIMIT 300`, params)).rows);
  })
);

api.patch(
  '/citas/:id/estado',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id, 'id');
    if (!['atendida', 'no_asistio'].includes(req.body.estado)) throw new HttpError(400, 'El estado debe ser "atendida" o "no_asistio".');
    const cita = await obtenerCita(id);
    if (!cita) throw new HttpError(404, 'No encontramos esa cita.');
    if (cita.estado !== 'activa') throw new HttpError(409, `La cita ya está ${cita.estado}.`);
    await query('UPDATE citas SET estado = $2 WHERE id = $1', [id, req.body.estado]);
    res.json(await obtenerCita(id));
  })
);

// ===== Módulo: Donaciones =====
const SQL_DONACION = `
  SELECT d.*, to_char(d.creado_en, 'YYYY-MM-DD') AS fecha, e.nombre AS evento_nombre, e.centro,
         u.nombre AS donante_nombre, u.apellido AS donante_apellido, u.correo AS donante_correo, c.folio
  FROM donaciones d
  JOIN eventos e ON e.id = d.evento_id
  JOIN usuarios u ON u.id = d.usuario_id
  JOIN citas c ON c.id = d.cita_id
`;

api.get(
  '/donaciones/mias',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`${SQL_DONACION} WHERE d.usuario_id = $1 ORDER BY d.creado_en DESC`, [req.user.id]);
    const {
      rows: [resumen],
    } = await query(
      `SELECT COUNT(*) AS donaciones,
              COUNT(*) FILTER (WHERE creado_en >= date_trunc('year', NOW())) AS donaciones_anio,
              COALESCE(SUM(largo_cm), 0) AS cabello_cm,
              COALESCE((SELECT largo_cm FROM donaciones WHERE usuario_id = $1 ORDER BY creado_en DESC LIMIT 1), 0) AS ultimo_cabello_cm,
              COUNT(DISTINCT evento_id) AS campanas,
              COUNT(*) FILTER (WHERE estado = 'completada') AS familias
       FROM donaciones WHERE usuario_id = $1`,
      [req.user.id]
    );
    res.json({ donaciones: rows, resumen });
  })
);

api.get(
  '/donaciones',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const where = ['TRUE'];
    const params = [];
    if (req.query.estado) {
      params.push(req.query.estado);
      where.push(`d.estado = $${params.length}`);
    }
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      where.push(`(u.nombre || ' ' || u.apellido ILIKE $${params.length} OR e.nombre ILIKE $${params.length})`);
    }
    res.json((await query(`${SQL_DONACION} WHERE ${where.join(' AND ')} ORDER BY d.creado_en DESC LIMIT 500`, params)).rows);
  })
);

api.post(
  '/donaciones',
  requireAdmin,
  asyncHandler(async (req, res) => {
    requireFields(req.body, ['cita_id', 'largo_cm']);
    const citaId = toInt(req.body.cita_id, 'cita_id');
    const largo = Number(req.body.largo_cm);
    if (!(largo >= LARGO_MIN && largo <= LARGO_MAX)) throw new HttpError(400, `El cabello debe medir entre ${LARGO_MIN} y ${LARGO_MAX} cm.`);

    const {
      rows: [cita],
    } = await query('SELECT * FROM citas WHERE id = $1', [citaId]);
    if (!cita) throw new HttpError(404, 'La cita no existe.');
    if (cita.estado !== 'atendida') throw new HttpError(409, 'Primero marca la cita como "atendida" para poder registrar la donación.');

    try {
      const { rows } = await query(
        `INSERT INTO donaciones (cita_id, usuario_id, evento_id, largo_cm, estado, notas, registrado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [citaId, cita.usuario_id, cita.evento_id, largo, req.body.estado === 'pendiente' ? 'pendiente' : 'completada', req.body.notas || null, req.user.id]
      );
      await notificar('donacion', `Nueva donación registrada (${largo} cm de cabello)`);
      res.status(201).json((await query(`${SQL_DONACION} WHERE d.id = $1`, [rows[0].id])).rows[0]);
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'Esa cita ya tiene una donación registrada.');
      throw err;
    }
  })
);

api.patch(
  '/donaciones/:id',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id, 'id');
    if (!['pendiente', 'completada'].includes(req.body.estado)) throw new HttpError(400, 'Estado inválido.');
    const r = await query('UPDATE donaciones SET estado = $2 WHERE id = $1', [id, req.body.estado]);
    if (!r.rowCount) throw new HttpError(404, 'No encontramos esa donación.');
    res.json((await query(`${SQL_DONACION} WHERE d.id = $1`, [id])).rows[0]);
  })
);

// ===== Módulo: Reportes =====
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const RANGOS_LARGO = [
  ['20–24 cm', 20, 25],
  ['25–29 cm', 25, 30],
  ['30–35 cm', 30, 35.01],
];
const variacion = (actual, anterior) => (anterior > 0 ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : actual > 0 ? 100 : 0);

api.get(
  '/reportes/dashboard',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const anio = Number(req.query.anio) || new Date().getFullYear();
    const {
      rows: [m],
    } = await query(`
      WITH mes AS (SELECT NOW() - interval '30 days' AS ini)
      SELECT
        (SELECT COUNT(*) FROM donaciones WHERE estado = 'completada') AS beneficiadas,
        (SELECT COUNT(*) FROM donaciones WHERE estado = 'completada' AND creado_en >= (SELECT ini FROM mes)) AS beneficiadas_mes,
        (SELECT COUNT(*) FROM donaciones WHERE estado = 'completada' AND creado_en >= (SELECT ini FROM mes) - interval '30 days' AND creado_en < (SELECT ini FROM mes)) AS beneficiadas_mes_ant,
        (SELECT COUNT(*) FROM citas WHERE estado <> 'cancelada') AS citas,
        (SELECT COUNT(*) FROM citas WHERE estado <> 'cancelada' AND creado_en >= (SELECT ini FROM mes)) AS citas_mes,
        (SELECT COUNT(*) FROM citas WHERE estado <> 'cancelada' AND creado_en >= (SELECT ini FROM mes) - interval '30 days' AND creado_en < (SELECT ini FROM mes)) AS citas_mes_ant,
        (SELECT COUNT(*) FROM donaciones) AS donaciones,
        (SELECT COUNT(*) FROM donaciones WHERE creado_en >= (SELECT ini FROM mes)) AS donaciones_mes,
        (SELECT COUNT(*) FROM donaciones WHERE creado_en >= (SELECT ini FROM mes) - interval '30 days' AND creado_en < (SELECT ini FROM mes)) AS donaciones_mes_ant,
        (SELECT COUNT(*) FROM eventos WHERE estado = 'activo' AND fecha >= CURRENT_DATE) AS eventos_activos,
        (SELECT COUNT(*) FROM eventos WHERE estado = 'activo' AND fecha >= CURRENT_DATE AND creado_en >= (SELECT ini FROM mes)) AS eventos_nuevos
    `);

    const { rows: porMes } = await query(
      `SELECT EXTRACT(MONTH FROM creado_en)::int AS mes, COUNT(*) AS total FROM donaciones
       WHERE EXTRACT(YEAR FROM creado_en) = $1 GROUP BY 1 ORDER BY 1`,
      [anio]
    );
    const ultimoMes = anio === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    const primerMes = porMes.length ? Math.min(...porMes.map((r) => r.mes)) : ultimoMes;
    const donacionesPorMes = Array.from({ length: ultimoMes - primerMes + 1 }, (_, i) => ({
      mes: MESES[primerMes - 1 + i],
      total: porMes.find((r) => r.mes === primerMes + i)?.total || 0,
    }));

    const {
      rows: [l],
    } = await query(
      `SELECT ${RANGOS_LARGO.map((_, i) => `COUNT(*) FILTER (WHERE largo_cm >= $${i * 2 + 1} AND largo_cm < $${i * 2 + 2}) AS r${i}`).join(', ')},
              COALESCE(SUM(largo_cm), 0) AS total_cm, COALESCE(AVG(largo_cm), 0) AS promedio_cm
       FROM donaciones`,
      RANGOS_LARGO.flatMap(([, a, b]) => [a, b])
    );

    res.json({
      metricas: {
        beneficiadas: { valor: m.beneficiadas, variacion: variacion(m.beneficiadas_mes, m.beneficiadas_mes_ant) },
        citas: { valor: m.citas, variacion: variacion(m.citas_mes, m.citas_mes_ant) },
        donaciones: { valor: m.donaciones, variacion: variacion(m.donaciones_mes, m.donaciones_mes_ant) },
        eventos: { valor: m.eventos_activos, nuevos: m.eventos_nuevos },
      },
      donacionesPorMes,
      largos: RANGOS_LARGO.map(([rango], i) => ({ rango, total: l[`r${i}`] })),
      cabello: { total_cm: l.total_cm, promedio_cm: Math.round(l.promedio_cm * 10) / 10 },
    });
  })
);

api.get(
  '/reportes/donaciones-resumen',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const {
      rows: [r],
    } = await query(`
      WITH mes AS (SELECT NOW() - interval '30 days' AS ini)
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE creado_en >= (SELECT ini FROM mes)) AS este_mes,
             COUNT(*) FILTER (WHERE creado_en >= (SELECT ini FROM mes) - interval '30 days' AND creado_en < (SELECT ini FROM mes)) AS mes_anterior,
             COALESCE(SUM(largo_cm), 0) AS cabello_cm,
             COALESCE(SUM(largo_cm) FILTER (WHERE creado_en >= (SELECT ini FROM mes)), 0) AS cabello_mes_cm,
             COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes
      FROM donaciones`);
    res.json({ ...r, variacion_mes: variacion(r.este_mes, r.mes_anterior) });
  })
);

function validarRango(desde, hasta) {
  if (!DATE_RE.test(desde || '') || !DATE_RE.test(hasta || '')) throw new HttpError(400, 'Manda desde y hasta con formato AAAA-MM-DD.');
  const dias = (new Date(hasta) - new Date(desde)) / 86400000;
  if (dias < 0) throw new HttpError(400, '"desde" no puede ser después de "hasta".');
  if (dias > 90) throw new HttpError(400, 'El rango máximo del reporte es de 90 días.');
}

async function obtenerReporte(desde, hasta, detalle = false) {
  const {
    rows: [r],
  } = await query(
    `SELECT NOW() AS generado_en,
       (SELECT COUNT(*) FROM citas c JOIN eventos e ON e.id = c.evento_id WHERE e.fecha BETWEEN $1 AND $2) AS citas_total,
       (SELECT json_object_agg(estado, n) FROM (
          SELECT c.estado, COUNT(*) AS n FROM citas c JOIN eventos e ON e.id = c.evento_id
          WHERE e.fecha BETWEEN $1 AND $2 GROUP BY c.estado) s) AS citas_por_estado,
       (SELECT COUNT(*) FROM donaciones WHERE creado_en::date BETWEEN $1 AND $2) AS donaciones_total,
       (SELECT COUNT(*) FROM donaciones WHERE creado_en::date BETWEEN $1 AND $2 AND estado = 'completada') AS donaciones_completadas,
       (SELECT COALESCE(SUM(largo_cm), 0) FROM donaciones WHERE creado_en::date BETWEEN $1 AND $2) AS cabello_cm,
       (SELECT COALESCE(ROUND(AVG(largo_cm), 1), 0) FROM donaciones WHERE creado_en::date BETWEEN $1 AND $2) AS largo_promedio,
       (SELECT COUNT(*) FROM eventos WHERE estado = 'activo' AND fecha BETWEEN $1 AND $2) AS eventos_activos`,
    [desde, hasta]
  );
  const reporte = { desde, hasta, ...r };
  if (!detalle) return reporte;
  const { rows: eventos } = await query(
    `SELECT e.nombre, e.fecha, e.centro, e.ciudad, e.estado, e.cupo_total,
            COUNT(c.id) FILTER (WHERE c.estado IN ('activa','atendida')) AS inscritos,
            COUNT(c.id) FILTER (WHERE c.estado = 'atendida') AS atendidas,
            (SELECT COUNT(*) FROM donaciones d WHERE d.evento_id = e.id) AS donaciones
     FROM eventos e LEFT JOIN citas c ON c.evento_id = e.id
     WHERE e.fecha BETWEEN $1 AND $2 AND e.estado NOT IN ('borrador','cancelado')
     GROUP BY e.id ORDER BY e.fecha`,
    [desde, hasta]
  );
  const { rows: donaciones } = await query(
    `SELECT d.creado_en::date AS fecha, u.nombre || ' ' || u.apellido AS donante, d.largo_cm, e.nombre AS evento, d.estado
     FROM donaciones d JOIN usuarios u ON u.id = d.usuario_id JOIN eventos e ON e.id = d.evento_id
     WHERE d.creado_en::date BETWEEN $1 AND $2 ORDER BY d.creado_en, donante`,
    [desde, hasta]
  );
  return { ...reporte, eventos, donaciones };
}

api.get(
  '/reportes',
  requireAdmin,
  asyncHandler(async (req, res) => {
    validarRango(req.query.desde, req.query.hasta);
    res.json(await obtenerReporte(req.query.desde, req.query.hasta));
  })
);

api.get(
  '/reportes/pdf',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { desde, hasta } = req.query;
    validarRango(desde, hasta);
    const reporte = await obtenerReporte(desde, hasta, true);
    const {
      rows: [admin],
    } = await query('SELECT nombre, apellido FROM usuarios WHERE id = $1', [req.user.id]);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-forthekids-${desde}_a_${hasta}.pdf"`);
    generarReportePdf(reporte, `${admin.nombre} ${admin.apellido}`, res);
  })
);

// ===== Módulo: Panel administrativo =====
api.get(
  '/reportes/donantes',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const params = [];
    let filtro = '';
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      filtro = `AND (u.nombre || ' ' || u.apellido ILIKE $1 OR u.correo ILIKE $1)`;
    }
    const { rows } = await query(
      `SELECT u.id, u.nombre, u.apellido, u.correo, u.telefono, u.creado_en,
              COUNT(DISTINCT c.id) FILTER (WHERE c.estado <> 'cancelada') AS citas,
              COUNT(DISTINCT d.id) AS donaciones
       FROM usuarios u
       LEFT JOIN citas c ON c.usuario_id = u.id
       LEFT JOIN donaciones d ON d.usuario_id = u.id
       WHERE u.rol = 'donante' ${filtro}
       GROUP BY u.id ORDER BY u.creado_en DESC`,
      params
    );
    res.json(rows);
  })
);

api.get(
  '/reportes/notificaciones',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 20, 100);
    const { rows } = await query('SELECT * FROM notificaciones ORDER BY creado_en DESC LIMIT $1', [limite]);
    const {
      rows: [nl],
    } = await query('SELECT COUNT(*) AS n FROM notificaciones WHERE NOT leida');
    res.json({ notificaciones: rows, noLeidas: nl.n });
  })
);

api.patch(
  '/reportes/notificaciones/leer',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    await query('UPDATE notificaciones SET leida = TRUE WHERE NOT leida');
    res.json({ ok: true });
  })
);

// ===== Módulo: Correo =====
api.get(
  '/correo/estado',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const conexion = await verificarCorreo();
    const { rows } = await query(
      `SELECT tipo, COUNT(*) FILTER (WHERE exito) AS enviados, COUNT(*) FILTER (WHERE NOT exito) AS fallidos
       FROM log_correos GROUP BY tipo ORDER BY tipo`
    );
    const { rows: ultimos } = await query('SELECT destinatario, asunto, tipo, exito, simulado, error, enviado_en FROM log_correos ORDER BY enviado_en DESC LIMIT 8');
    res.json({
      configurado: correoConfigurado(),
      conectado: conexion.ok,
      error: conexion.error || null,
      servidor: process.env.SMTP_HOST || null,
      remitente: process.env.MAIL_FROM || process.env.SMTP_USER || null,
      resumen: rows,
      ultimos,
    });
  })
);

api.post(
  '/correo/prueba',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const {
      rows: [u],
    } = await query('SELECT nombre, correo FROM usuarios WHERE id = $1', [req.user.id]);
    const para = req.body?.para && EMAIL_RE.test(req.body.para) ? req.body.para : u.correo;
    const r = await correoPrueba(para, u.nombre);
    if (!r.ok) throw new HttpError(502, `No se pudo enviar el correo: ${r.error}`);
    res.json({ ...r, para });
  })
);

export default api;
