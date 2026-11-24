// ===== Módulo: Configuración =====
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import PDFDocument from 'pdfkit';

export const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SERVER_DIR, '..');
dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

export const APP_TZ = process.env.APP_TZ || 'America/Mexico_City';
export const APP_URL = (process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');
export const UPLOADS_DIR = path.join(SERVER_DIR, 'uploads');
const LOGO = path.join(SERVER_DIR, 'assets', 'logo.png');

// ===== Módulo: Base de datos =====
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  options: `-c TimeZone=${APP_TZ}`,
});

export const query = (text, params) => pool.query(text, params);

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export function adminDesdeEnv() {
  const correo = String(process.env.ADMIN_CORREO || '')
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!EMAIL_RE.test(correo) || !passwordValida(password)) {
    throw new Error('Configura ADMIN_CORREO y ADMIN_PASSWORD (mínimo 8 caracteres y al menos un número) en el .env.');
  }
  return {
    nombre: process.env.ADMIN_NOMBRE || 'Administrador',
    apellido: process.env.ADMIN_APELLIDO || '',
    correo,
    telefono: process.env.ADMIN_TELEFONO || '0000000000',
    password,
  };
}

export async function migrar() {
  await query(fs.readFileSync(path.join(SERVER_DIR, 'schema.sql'), 'utf8'));
  const { rowCount } = await query(`SELECT 1 FROM usuarios WHERE rol = 'administrador' LIMIT 1`);
  if (rowCount) return { adminCreado: false };
  let admin;
  try {
    admin = adminDesdeEnv();
  } catch (err) {
    console.warn(`No hay ningún administrador. ${err.message}`);
    return { adminCreado: false };
  }
  await query(
    `INSERT INTO usuarios (nombre, apellido, correo, telefono, password_hash, rol, consentimiento_en)
     VALUES ($1,$2,$3,$4,$5,'administrador',NOW())
     ON CONFLICT (correo) DO UPDATE SET rol = 'administrador', sesion_version = usuarios.sesion_version + 1`,
    [admin.nombre, admin.apellido, admin.correo, admin.telefono, await bcrypt.hash(admin.password, 10)]
  );
  console.log(`Administrador inicial listo: ${admin.correo}`);
  return { adminCreado: true };
}

export const SQL_EVENTO = `
  SELECT e.*,
         to_char(e.hora_inicio, 'HH24:MI') AS hora_inicio,
         to_char(e.hora_fin, 'HH24:MI') AS hora_fin,
         COALESCE(oc.ocupados, 0) AS inscritos,
         GREATEST(e.cupo_total - COALESCE(oc.ocupados, 0), 0) AS cupo_restante
  FROM eventos e
  LEFT JOIN (
    SELECT evento_id, COUNT(*) AS ocupados FROM citas
    WHERE estado IN ('activa', 'atendida') GROUP BY evento_id
  ) oc ON oc.evento_id = e.id
`;

export const SQL_CITA = `
  SELECT c.id, c.folio, c.estado, c.usuario_id, c.evento_id, c.creado_en, c.cancelado_en,
         to_char(c.hora, 'HH24:MI') AS hora,
         e.nombre AS evento_nombre, e.fecha, e.centro, e.direccion, e.ciudad, e.imagen_url,
         u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, u.correo AS usuario_correo,
         EXTRACT(EPOCH FROM ((e.fecha + c.hora) - LOCALTIMESTAMP)) / 3600 AS horas_faltantes,
         (SELECT d.id FROM donaciones d WHERE d.cita_id = c.id) AS donacion_id
  FROM citas c
  JOIN eventos e ON e.id = c.evento_id
  JOIN usuarios u ON u.id = c.usuario_id
`;

export const notificar = (tipo, mensaje) =>
  query('INSERT INTO notificaciones (tipo, mensaje) VALUES ($1, $2)', [tipo, mensaje.slice(0, 200)]);

// ===== Módulo: Errores y validaciones =====
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const LARGO_MIN = 20;
export const LARGO_MAX = 35;
export const REGLA_PASSWORD = 'La contraseña debe tener mínimo 8 caracteres y al menos un número.';

export function passwordValida(password) {
  return typeof password === 'string' && password.length >= 8 && Buffer.byteLength(password) <= 72 && /\d/.test(password);
}

export const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
export const nuevoToken = () => crypto.randomBytes(32).toString('hex');

export function limitarPorIp({ max, ventanaMin, soloFallidos = false, mensaje }) {
  const registros = new Map();
  return (req, res, next) => {
    const ahora = Date.now();
    if (registros.size > 5000) {
      for (const [k, v] of registros) if (v.reinicio <= ahora) registros.delete(k);
    }
    const clave = req.ip || req.socket?.remoteAddress || 'desconocida';
    let r = registros.get(clave);
    if (!r || r.reinicio <= ahora) {
      r = { cuenta: 0, reinicio: ahora + ventanaMin * 60000 };
      registros.set(clave, r);
    }
    if (r.cuenta >= max) {
      const min = Math.max(1, Math.ceil((r.reinicio - ahora) / 60000));
      res.setHeader('Retry-After', String(min * 60));
      return next(new HttpError(429, mensaje || `Demasiados intentos desde tu conexión. Intenta de nuevo en ${min} min.`));
    }
    if (soloFallidos) {
      res.on('finish', () => {
        if (res.statusCode >= 400) r.cuenta++;
      });
    } else {
      r.cuenta++;
    }
    return next();
  };
}

export function requireFields(body, fields) {
  const faltantes = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (faltantes.length) throw new HttpError(400, `Faltan campos obligatorios: ${faltantes.join(', ')}`, { faltantes });
}

export function toInt(value, nombre) {
  const n = Number(value);
  if (!Number.isInteger(n)) throw new HttpError(400, `El campo ${nombre} debe ser un número entero.`);
  return n;
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generarFolio() {
  let folio = '';
  for (const b of crypto.randomBytes(8)) folio += ALFABETO[b % ALFABETO.length];
  return folio;
}

export function generarHorarios(horaInicio, horaFin, duracionMin) {
  const aMin = (h) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };
  const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const res = [];
  for (let m = aMin(horaInicio); m + duracionMin <= aMin(horaFin); m += duracionMin) res.push(aHora(m));
  return res;
}

// ===== Módulo: Autenticación =====
export function requireAuth(req, _res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return next(new HttpError(401, 'Necesitas iniciar sesión para continuar.'));
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new HttpError(401, 'Tu sesión expiró, vuelve a iniciar sesión.'));
  }
  return query('SELECT id, rol, nombre, sesion_version FROM usuarios WHERE id = $1', [payload.sub])
    .then(({ rows: [u] }) => {
      if (!u || (payload.ver ?? 0) !== u.sesion_version) {
        return next(new HttpError(401, 'Tu sesión ya no es válida, vuelve a iniciar sesión.'));
      }
      req.user = { id: u.id, rol: u.rol, nombre: u.nombre };
      return next();
    })
    .catch(next);
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.rol)) {
    return next(new HttpError(403, 'No tienes permisos para realizar esta acción.'));
  }
  return next();
};

export const requireAdmin = [requireAuth, requireRole('administrador')];

// ===== Módulo: Correos =====
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const correoConfigurado = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter;
function transporte() {
  if (transporter) return transporter;
  if (correoConfigurado()) {
    const puerto = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

const remitente = () =>
  process.env.MAIL_FROM || `For The Kids <${EMAIL_RE.test(process.env.SMTP_USER || '') ? process.env.SMTP_USER : 'no-reply@forthekids.org'}>`;

export async function verificarCorreo() {
  if (!correoConfigurado()) {
    console.log('Correo sin configurar: los correos se simulan en esta consola (llena SMTP_* en el .env).');
    return { ok: false, simulado: true };
  }
  try {
    await transporte().verify();
    console.log(`Correo listo: ${process.env.SMTP_HOST} como ${process.env.SMTP_USER}`);
    return { ok: true };
  } catch (err) {
    console.error(`No se pudo conectar al servidor de correo (${process.env.SMTP_HOST}): ${err.message}`);
    return { ok: false, error: err.message };
  }
}

const fechaLegible = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const f = new Date(y, m - 1, d);
  return `${DIAS[f.getDay()]} ${d} de ${MESES_LARGOS[m - 1]} de ${y}`;
};

const hora12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'p. m.' : 'a. m.'}`;
};

const escapar = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function plantilla({ titulo, intro, cita, cierre, boton }) {
  const detalle = cita
    ? `<table role="presentation" width="100%" style="background:#FFF3C4;border-radius:14px;margin:18px 0"><tr><td style="padding:16px 18px;color:#172033;font-size:15px;line-height:1.6">
        <strong style="font-size:16px">${escapar(cita.evento_nombre)}</strong><br>
        Fecha: ${fechaLegible(cita.fecha)}<br>
        Hora: ${hora12(cita.hora)}<br>
        Lugar: ${escapar(cita.centro)}, ${escapar(cita.direccion)}<br>
        Folio: <strong style="letter-spacing:1px">${cita.folio}</strong>
      </td></tr></table>`
    : '';
  const btn = boton
    ? `<p style="margin:22px 0"><a href="${boton.url}" style="background:#F9C62D;color:#172033;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;display:inline-block">${boton.texto}</a></p>`
    : '';
  const logo = fs.existsSync(LOGO) ? '<img src="cid:logo-ftk" alt="For The Kids" height="56" style="display:block;margin-bottom:18px">' : '<strong>FOR THE KIDS 💛</strong>';
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#FFFDF7;padding:28px 12px">
    <div style="max-width:540px;margin:auto;background:#ffffff;border-radius:20px;padding:28px;border:1px solid #F3E7BF">
      ${logo}
      <h2 style="color:#172033;margin:0 0 10px;font-size:22px">${titulo}</h2>
      <p style="color:#4B5263;font-size:15px;line-height:1.5;margin:0">${intro}</p>
      ${detalle}
      ${cierre ? `<p style="color:#4B5263;font-size:15px;line-height:1.5">${cierre}</p>` : ''}
      ${btn}
      <p style="color:#8A8F9C;font-size:12px;margin-top:26px">For The Kids · Esperanza en cada mechón. Este correo se envió automáticamente.</p>
    </div>
  </div>`;
}

const texto = ({ titulo, intro, cita, cierre }) =>
  [
    titulo,
    '',
    intro.replace(/<[^>]+>/g, ''),
    cita ? `\n${cita.evento_nombre}\nFecha: ${fechaLegible(cita.fecha)}\nHora: ${hora12(cita.hora)}\nLugar: ${cita.centro}, ${cita.direccion}\nFolio: ${cita.folio}\n` : '',
    cierre ? cierre.replace(/<[^>]+>/g, '') : '',
    '',
    'For The Kids · Esperanza en cada mechón',
  ].join('\n');

const MAX_INTENTOS_CORREO = 5;

export async function enviarCorreo({ para, asunto, contenido, tipo }, { encolar = true } = {}) {
  let destino = para;
  let asuntoFinal = asunto;
  let simulado = false;
  try {
    const { rows } = await query('SELECT es_demo FROM usuarios WHERE correo = $1', [para]);
    const esDemo = Boolean(rows[0]?.es_demo);
    const redireccion = process.env.MAIL_REDIRECT_TO;
    destino = esDemo && redireccion ? redireccion : para;
    asuntoFinal = destino === para ? asunto : `[Para ${para}] ${asunto}`;
    simulado = process.env.NODE_ENV === 'test' || !correoConfigurado() || (esDemo && !redireccion);
    const mensaje = {
      from: remitente(),
      to: destino,
      subject: asuntoFinal,
      html: plantilla(contenido),
      text: texto(contenido),
      attachments: fs.existsSync(LOGO) ? [{ filename: 'logo.png', path: LOGO, cid: 'logo-ftk' }] : [],
    };
    await (simulado ? nodemailer.createTransport({ jsonTransport: true }) : transporte()).sendMail(mensaje);
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${simulado ? '[simulado] ' : ''}${tipo} → ${destino} | ${asuntoFinal}`);
      if (simulado && contenido.boton?.url) console.log(`   enlace: ${contenido.boton.url}`);
    }
    await query('INSERT INTO log_correos (destinatario, asunto, tipo, exito, simulado) VALUES ($1,$2,$3,TRUE,$4)', [destino, asuntoFinal, tipo, simulado]);
    return { ok: true, simulado, destino };
  } catch (err) {
    console.error(`Falló el correo (${tipo}) a ${destino}: ${err.message}`);
    await query('INSERT INTO log_correos (destinatario, asunto, tipo, exito, error) VALUES ($1,$2,$3,FALSE,$4)', [
      destino,
      asuntoFinal.slice(0, 200),
      tipo,
      err.message,
    ]).catch(() => {});
    if (encolar) {
      await query(
        `INSERT INTO cola_correos (para, tipo, asunto, contenido, ultimo_error, proximo_intento)
         VALUES ($1,$2,$3,$4,$5, NOW() + interval '5 minutes')`,
        [para, tipo, asunto.slice(0, 200), JSON.stringify(contenido), err.message]
      ).catch((e) => console.error(`No se pudo encolar el correo: ${e.message}`));
    }
    return { ok: false, error: err.message, encolado: encolar };
  }
}

export async function procesarColaCorreos() {
  const { rows } = await query(
    `SELECT * FROM cola_correos WHERE proximo_intento <= NOW() AND intentos < $1 ORDER BY proximo_intento LIMIT 20`,
    [MAX_INTENTOS_CORREO]
  );
  let enviados = 0;
  for (const c of rows) {
    const r = await enviarCorreo({ para: c.para, tipo: c.tipo, asunto: c.asunto, contenido: c.contenido }, { encolar: false });
    if (r.ok) {
      await query('DELETE FROM cola_correos WHERE id = $1', [c.id]);
      enviados++;
    } else {
      await query(
        `UPDATE cola_correos SET intentos = intentos + 1, ultimo_error = $2,
           proximo_intento = NOW() + (intentos * 10 || ' minutes')::interval WHERE id = $1`,
        [c.id, r.error]
      );
    }
  }
  if (rows.length) console.log(`Cola de correos: ${enviados} de ${rows.length} reenviados`);
  return { revisados: rows.length, enviados };
}

export const VIGENCIA_RECUPERACION_MIN = 60;
export const VIGENCIA_ACTIVACION_HORAS = 48;

export const correoRecuperacion = (usuario, url) =>
  enviarCorreo({
    para: usuario.correo,
    tipo: 'recuperacion',
    asunto: 'Restablece tu contraseña · For The Kids',
    contenido: {
      titulo: 'Restablece tu contraseña',
      intro: `Hola, ${escapar(usuario.nombre)}. Recibimos una solicitud para cambiar la contraseña de tu cuenta. El enlace vence en ${VIGENCIA_RECUPERACION_MIN} minutos y solo funciona una vez.`,
      cierre: 'Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.',
      boton: { texto: 'Crear nueva contraseña', url },
    },
  });

export const correoActivacion = (usuario, url, invitadoPor) =>
  enviarCorreo({
    para: usuario.correo,
    tipo: 'activacion',
    asunto: 'Tienes acceso al panel de For The Kids',
    contenido: {
      titulo: 'Bienvenido al equipo organizador',
      intro: `Hola, ${escapar(usuario.nombre)}. ${escapar(invitadoPor)} te dio acceso como administrador de For The Kids. Crea tu contraseña para entrar al panel; el enlace vence en ${VIGENCIA_ACTIVACION_HORAS} horas.`,
      cierre: 'Si no esperabas este correo, puedes ignorarlo.',
      boton: { texto: 'Crear mi contraseña', url },
    },
  });

export const correoPasswordCambiada = (usuario) =>
  enviarCorreo({
    para: usuario.correo,
    tipo: 'password',
    asunto: 'Tu contraseña se cambió · For The Kids',
    contenido: {
      titulo: 'Tu contraseña se cambió',
      intro: `Hola, ${escapar(usuario.nombre)}. La contraseña de tu cuenta se actualizó y cerramos las sesiones que tenías abiertas.`,
      cierre: 'Si no fuiste tú, usa "¿Olvidaste tu contraseña?" en la página de inicio de sesión para recuperar tu cuenta de inmediato.',
      boton: { texto: 'Iniciar sesión', url: `${APP_URL}/login` },
    },
  });

const botonCitas = { texto: 'Ver mis citas', url: `${APP_URL}/mis-citas` };

export const correoConfirmacion = (cita) =>
  enviarCorreo({
    para: cita.usuario_correo,
    tipo: 'confirmacion',
    asunto: `Cita agendada · Folio ${cita.folio}`,
    contenido: {
      titulo: `¡Gracias, ${escapar(cita.usuario_nombre)}!`,
      intro: 'Tu cita para donar cabello quedó registrada. Te esperamos:',
      cita,
      cierre: 'Lleva tu cabello limpio, seco y sin productos. Debe medir entre 20 y 35 cm. Si ya no puedes asistir, cancela con al menos 12 horas de anticipación.',
      boton: botonCitas,
    },
  });

export const correoReprogramacion = (cita) =>
  enviarCorreo({
    para: cita.usuario_correo,
    tipo: 'reprogramacion',
    asunto: `Cita reprogramada · Folio ${cita.folio}`,
    contenido: {
      titulo: 'Cambiamos el horario de tu cita',
      intro: `Hola, ${escapar(cita.usuario_nombre)}. Este es tu nuevo horario:`,
      cita,
      cierre: 'Tu folio sigue siendo el mismo.',
      boton: botonCitas,
    },
  });

const MOTIVOS_CANCELACION = {
  donante: 'Cancelaste la siguiente cita y liberamos tu lugar para alguien más:',
  administrador: 'El equipo de For The Kids canceló la siguiente cita:',
  evento: 'El evento se canceló, por lo que tu cita también quedó cancelada:',
};

export const correoCancelacion = (cita, motivo = 'donante') =>
  enviarCorreo({
    para: cita.usuario_correo,
    tipo: 'cancelacion',
    asunto: `Cita cancelada · Folio ${cita.folio}`,
    contenido: {
      titulo: 'Tu cita fue cancelada',
      intro: `Hola, ${escapar(cita.usuario_nombre)}. ${MOTIVOS_CANCELACION[motivo] || MOTIVOS_CANCELACION.donante}`,
      cita,
      cierre: 'Cuando quieras puedes agendar otra fecha. Gracias por querer ayudar 💛',
      boton: { texto: 'Ver eventos', url: `${APP_URL}/eventos` },
    },
  });

export const correoRecordatorio = (cita, opciones) =>
  enviarCorreo(
    {
      para: cita.usuario_correo,
      tipo: 'recordatorio',
      asunto: `Mañana es tu cita · ${cita.evento_nombre}`,
      contenido: {
        titulo: '¡Ya casi es el día!',
        intro: `Hola, ${escapar(cita.usuario_nombre)}. Te recordamos tu cita de mañana:`,
        cita,
        cierre: 'Llega 10 minutos antes con tu cabello limpio y seco. Si ya no puedes ir, cancélala desde "Mis citas" para que alguien más aproveche el lugar.',
        boton: botonCitas,
      },
    },
    opciones
  );

export const correoPrueba = (para, nombre) =>
  enviarCorreo(
    {
      para,
      tipo: 'prueba',
      asunto: 'Correo de prueba · For The Kids',
      contenido: {
        titulo: `Hola, ${escapar(nombre)}`,
        intro: 'Si estás leyendo esto, el envío de correos del sistema funciona. Así se verán las confirmaciones, cancelaciones y recordatorios de las citas.',
        boton: { texto: 'Abrir For The Kids', url: APP_URL },
      },
    },
    { encolar: false }
  );

// ===== Módulo: Recordatorios =====
export async function enviarRecordatoriosPendientes() {
  const { rows } = await query(
    `${SQL_CITA}
     WHERE c.estado = 'activa' AND c.recordatorio_enviado = FALSE
       AND (e.fecha + c.hora) BETWEEN LOCALTIMESTAMP + interval '20 hours' AND LOCALTIMESTAMP + interval '24 hours'`
  );
  let enviados = 0;
  for (const cita of rows) {
    const r = await correoRecordatorio(cita, { encolar: false });
    if (r.ok) {
      await query('UPDATE citas SET recordatorio_enviado = TRUE WHERE id = $1', [cita.id]);
      enviados++;
    }
  }
  if (rows.length) console.log(`Recordatorios: ${enviados} de ${rows.length} enviados`);
  return { revisadas: rows.length, enviados };
}

export function iniciarRecordatorios() {
  if (process.env.REMINDERS_ENABLED === 'false') return;
  const correr = () => enviarRecordatoriosPendientes().catch((err) => console.error('Recordatorios:', err.message));
  const reintentar = () => procesarColaCorreos().catch((err) => console.error('Cola de correos:', err.message));
  const limpiar = () =>
    query(`DELETE FROM tokens_recuperacion WHERE expira_en < NOW() - interval '7 days'`).catch((err) => console.error('Limpieza de enlaces:', err.message));
  cron.schedule('*/15 * * * *', correr);
  cron.schedule('*/5 * * * *', reintentar);
  cron.schedule('30 3 * * *', limpiar);
  setTimeout(() => {
    correr();
    reintentar();
  }, 5000);
  console.log('Recordatorios activos (revisa cada 15 minutos) y reintentos de correo cada 5 minutos');
}

// ===== Módulo: Reporte PDF =====
const C = {
  noche: '#172033',
  texto: '#4B5263',
  tenue: '#8A8F9C',
  amarillo: '#F9C62D',
  amarilloSuave: '#FFF3C4',
  crema: '#FFFDF7',
  linea: '#E7E9EE',
  verde: '#1F8A57',
  naranja: '#C47A00',
  rojo: '#C4363B',
};
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fechaCorta = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
};
const numero = (n) => Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 1 });
const ESTADOS_CITA = { activa: 'Activas', atendida: 'Atendidas', cancelada: 'Canceladas', no_asistio: 'No asistió' };
const ESTADOS = { activo: 'Activo', finalizado: 'Finalizado', programado: 'Programado', completada: 'Completada', pendiente: 'Pendiente' };

const fechaHoraLarga = (valor) =>
  new Date(valor).toLocaleString('es-MX', {
    timeZone: APP_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function crearPdf({ titulo, subtitulo, nota, stream, horizontal = false }) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: horizontal ? 'landscape' : 'portrait',
    margins: { top: 50, bottom: 60, left: 50, right: 50 },
    bufferPages: true,
    info: { Title: `${titulo} · ${subtitulo}`, Author: 'For The Kids · Equipo Tlaxcala' },
  });
  doc.pipe(stream);

  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const x0 = doc.page.margins.left;
  const limiteY = () => doc.page.height - doc.page.margins.bottom;
  const pdf = { doc, ancho, x0, y: 0 };

  if (fs.existsSync(LOGO)) doc.image(LOGO, x0, 42, { height: 38 });
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C.noche).text(titulo, x0, 46, { width: ancho, align: 'right' });
  doc.font('Helvetica').fontSize(10).fillColor(C.texto).text(subtitulo, x0, 66, { width: ancho, align: 'right' });
  doc.rect(x0, 92, ancho, 3).fill(C.amarillo);
  doc.font('Helvetica').fontSize(9).fillColor(C.tenue).text(nota, x0, 104, { width: ancho });
  pdf.y = doc.y + 14;

  pdf.titulo = (t) => {
    if (pdf.y + 60 > limiteY()) {
      doc.addPage();
      pdf.y = doc.page.margins.top;
    }
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C.noche).text(t, x0, pdf.y);
    pdf.y += 20;
  };

  pdf.tarjetas = (items) => {
    const gap = 10;
    const w = (ancho - gap * (items.length - 1)) / items.length;
    items.forEach(([label, valor], i) => {
      const x = x0 + i * (w + gap);
      doc.roundedRect(x, pdf.y, w, 62, 8).fill(i === 0 ? C.amarilloSuave : C.crema);
      doc.roundedRect(x, pdf.y, w, 62, 8).lineWidth(0.6).stroke('#EFE6C9');
      doc.font('Helvetica').fontSize(8.5).fillColor(C.texto).text(label, x + 10, pdf.y + 10, { width: w - 20 });
      doc.font('Helvetica-Bold').fontSize(19).fillColor(C.noche).text(valor, x + 10, pdf.y + 30, { width: w - 20 });
    });
    pdf.y += 82;
  };

  pdf.tabla = (columnas, filas, vacio = 'Sin registros en este periodo.', altoMin = 18) => {
    const total = columnas.reduce((a, c) => a + c.w, 0);
    const cols = columnas.map((c) => ({ ...c, w: (c.w / total) * ancho }));
    const encabezado = () => {
      doc.rect(x0, pdf.y, ancho, 20).fill(C.noche);
      let x = x0;
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF');
      cols.forEach((c) => {
        doc.text(c.label, x + 6, pdf.y + 6, { width: c.w - 12, align: c.align || 'left', lineBreak: false });
        x += c.w;
      });
      pdf.y += 20;
    };
    encabezado();
    if (!filas.length) {
      doc.font('Helvetica-Oblique').fontSize(9).fillColor(C.tenue).text(vacio, x0 + 6, pdf.y + 7);
      pdf.y += 26;
      return;
    }
    filas.forEach((fila, i) => {
      doc.font('Helvetica').fontSize(8.5);
      const alto = Math.max(altoMin, ...cols.map((c, j) => doc.heightOfString(String(fila[j] ?? ''), { width: c.w - 12 }) + 9));
      if (pdf.y + alto > limiteY()) {
        doc.addPage();
        pdf.y = doc.page.margins.top;
        encabezado();
      }
      if (i % 2 === 1) doc.rect(x0, pdf.y, ancho, alto).fill('#FAFBFC');
      let x = x0;
      cols.forEach((c, j) => {
        const valor = String(fila[j] ?? '');
        if (c.casilla) {
          doc.rect(x + (c.w - 12) / 2, pdf.y + (alto - 12) / 2, 12, 12).lineWidth(0.8).stroke(C.noche);
        } else if (c.linea) {
          doc.moveTo(x + 8, pdf.y + alto - 6).lineTo(x + c.w - 8, pdf.y + alto - 6).lineWidth(0.6).stroke(C.tenue);
        } else {
          doc
            .font(c.bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(8.5)
            .fillColor(c.color ? c.color(valor) : C.noche)
            .text(valor, x + 6, pdf.y + 5, { width: c.w - 12, align: c.align || 'left' });
        }
        x += c.w;
      });
      doc.moveTo(x0, pdf.y + alto).lineTo(x0 + ancho, pdf.y + alto).lineWidth(0.5).stroke(C.linea);
      pdf.y += alto;
    });
    pdf.y += 18;
  };

  pdf.terminar = () => {
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      const margen = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      const yPie = doc.page.height - 40;
      doc.moveTo(x0, yPie - 6).lineTo(x0 + ancho, yPie - 6).lineWidth(0.5).stroke(C.linea);
      doc.font('Helvetica').fontSize(8).fillColor(C.tenue);
      doc.text('For The Kids · Esperanza en cada mechón', x0, yPie, { width: ancho / 2, lineBreak: false });
      doc.text(`Página ${i - start + 1} de ${count}`, x0 + ancho / 2, yPie, { width: ancho / 2, align: 'right', lineBreak: false });
      doc.page.margins.bottom = margen;
    }
    doc.end();
  };

  return pdf;
}

const colorEstado = (v) =>
  ['Completada', 'Finalizado', 'Activo', 'Atendidas', 'Atendida'].includes(v)
    ? C.verde
    : ['Pendiente', 'Programado', 'Activas', 'Activa'].includes(v)
      ? C.naranja
      : ['Canceladas', 'No asistió'].includes(v)
        ? C.rojo
        : C.noche;

export function generarReportePdf(reporte, generadoPor, stream) {
  const pdf = crearPdf({
    titulo: 'Reporte de campaña',
    subtitulo: `${fechaCorta(reporte.desde)} – ${fechaCorta(reporte.hasta)}`,
    nota: `Generado el ${fechaHoraLarga(reporte.generado_en)} por ${generadoPor}. Los datos corresponden a lo registrado en el sistema en ese momento.`,
    stream,
  });

  const est = reporte.citas_por_estado || {};
  pdf.tarjetas([
    ['Citas en el periodo', numero(reporte.citas_total)],
    ['Citas atendidas', numero(est.atendida || 0)],
    ['Donaciones de cabello', numero(reporte.donaciones_total)],
    ['Cabello recolectado', `${numero(reporte.cabello_cm)} cm`],
  ]);

  pdf.titulo('Citas por estado');
  const totalCitas = Number(reporte.citas_total) || 0;
  pdf.tabla(
    [{ label: 'Estado', w: 3, color: colorEstado }, { label: 'Citas', w: 1, align: 'right' }, { label: '% del total', w: 1, align: 'right' }],
    Object.entries(ESTADOS_CITA)
      .filter(([k]) => est[k])
      .map(([k, label]) => [label, numero(est[k]), totalCitas ? `${Math.round((est[k] / totalCitas) * 100)}%` : '0%'])
  );

  pdf.titulo('Cabello recolectado');
  pdf.tabla(
    [{ label: 'Indicador', w: 3 }, { label: 'Valor', w: 1.4, align: 'right' }],
    reporte.donaciones_total
      ? [
          ['Donaciones registradas', numero(reporte.donaciones_total)],
          ['Centímetros recolectados', `${numero(reporte.cabello_cm)} cm`],
          ['Largo promedio por donación', `${numero(reporte.largo_promedio)} cm`],
          ['Donaciones completadas', numero(reporte.donaciones_completadas)],
          ['Donaciones pendientes de revisión', numero(reporte.donaciones_total - reporte.donaciones_completadas)],
        ]
      : []
  );

  pdf.titulo('Eventos del periodo');
  pdf.tabla(
    [
      { label: 'Evento', w: 2.5, bold: true },
      { label: 'Fecha', w: 1.3 },
      { label: 'Sede', w: 1.6 },
      { label: 'Inscritos', w: 1.25, align: 'right' },
      { label: 'Atendidas', w: 1.3, align: 'right' },
      { label: 'Donaciones', w: 1.45, align: 'right' },
      { label: 'Estado', w: 1.45, color: colorEstado },
    ],
    reporte.eventos.map((e) => [e.nombre, fechaCorta(e.fecha), `${e.centro}, ${e.ciudad}`, `${e.inscritos}/${e.cupo_total}`, e.atendidas, e.donaciones, ESTADOS[e.estado] || e.estado])
  );

  pdf.titulo(`Detalle de donaciones (${reporte.donaciones.length})`);
  pdf.tabla(
    [
      { label: 'Fecha', w: 1.2 },
      { label: 'Donante', w: 2.8 },
      { label: 'Largo', w: 1, align: 'right' },
      { label: 'Evento', w: 3 },
      { label: 'Estado', w: 1.2, color: colorEstado },
    ],
    reporte.donaciones.map((d) => [fechaCorta(d.fecha), d.donante, `${numero(d.largo_cm)} cm`, d.evento, ESTADOS[d.estado] || d.estado])
  );

  pdf.terminar();
}

const ESTADO_ASISTENTE = { activa: 'Activa', atendida: 'Atendida' };

export function generarListaAsistentesPdf(evento, asistentes, generadoPor, stream) {
  const pdf = crearPdf({
    titulo: 'Lista de asistentes',
    subtitulo: `${evento.nombre} · ${fechaCorta(evento.fecha)} · ${evento.hora_inicio}–${evento.hora_fin}`,
    nota: `${evento.centro}, ${evento.direccion}, ${evento.ciudad}. Generada el ${fechaHoraLarga(new Date())} por ${generadoPor}. Respaldo impreso para registrar asistencia y largo del cabello si falla la conexión.`,
    stream,
    horizontal: true,
  });

  pdf.tarjetas([
    ['Citas agendadas', numero(asistentes.length)],
    ['Ya atendidas', numero(asistentes.filter((a) => a.estado === 'atendida').length)],
    ['Cupo total', numero(evento.cupo_total)],
    ['Lugares libres', numero(Math.max(evento.cupo_total - asistentes.length, 0))],
  ]);

  pdf.titulo('Donantes por horario');
  pdf.tabla(
    [
      { label: '#', w: 0.5, align: 'right' },
      { label: 'Hora', w: 0.9, bold: true },
      { label: 'Folio', w: 1.1 },
      { label: 'Donante', w: 3 },
      { label: 'Teléfono', w: 1.6 },
      { label: 'Estado', w: 1.1, color: colorEstado },
      { label: 'Asistió', w: 0.9, casilla: true },
      { label: 'Largo (cm)', w: 1.2, linea: true },
      { label: 'Observaciones', w: 2.6, linea: true },
    ],
    asistentes.map((a, i) => [i + 1, a.hora, a.folio, `${a.nombre} ${a.apellido}`.trim(), a.telefono, ESTADO_ASISTENTE[a.estado] || a.estado, '', '', '']),
    'Este evento todavía no tiene citas agendadas.',
    24
  );

  pdf.terminar();
}
