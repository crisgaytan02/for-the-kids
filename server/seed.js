import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { SERVER_DIR, generarFolio, generarHorarios, pool } from './core.js';

// ===== Módulo: Cuentas =====
const ADMIN = {
  nombre: 'Cristóbal',
  apellido: 'Gaytán',
  correo: 'jairgaytan339@gmail.com',
  telefono: '33 1234 5678',
  password: '19082002',
};

const DONANTES = [
  ['María Fernanda', 'López Arellano', 'mafer.lopez@gmail.com', 'Girasol.2004'],
  ['Diego', 'Hernández Rubio', 'diego.hdz.rubio@hotmail.com', 'Chivas#Campeon11'],
  ['Ximena', 'Castañeda Ruiz', 'ximena.castaneda@alumnos.udg.mx', 'LunaLlena_93'],
  ['Luis Ángel', 'Torres Medina', 'luisangel.tm@gmail.com', 'MiPerroRocky22'],
  ['Valeria', 'Gutiérrez Pulido', 'vale.gtz.pulido@outlook.com', 'Tapatia.1999'],
  ['Andrea', 'Navarro Íñiguez', 'andrea.navarro@alumnos.udg.mx', 'Cafecito*2025'],
  ['José Emiliano', 'Flores Vega', 'emiliano.flores02@gmail.com', 'PanDeMuerto07'],
  ['Daniela', 'Partida Orozco', 'dani.partida@hotmail.com', 'Atlas4ever!'],
  ['Karla Sofía', 'Medina Lara', 'karlasofia.ml@gmail.com', 'Mariposa.Azul8'],
  ['Regina', 'Aceves Cárdenas', 'regina.aceves@alumnos.udg.mx', 'Tejuino_Frio21'],
  ['Fernanda', 'Moreno Zúñiga', 'fer.moreno.z@outlook.com', 'Jalisco2002mx'],
  ['Paola', 'Jiménez Barajas', 'pao.jimenez.b@gmail.com', 'OsoPolar#45'],
  ['Alejandra', 'Ríos Padilla', 'ale.riospadilla@hotmail.com', 'Margarita.17'],
  ['Natalia', 'Ibarra Gallardo', 'natalia.ibarra@alumnos.udg.mx', 'BirriaDomingo3'],
  ['Carlos Eduardo', 'Sánchez Mora', 'carlos.sanchez.mora@gmail.com', 'Cielo.Estrellado9'],
  ['Itzel', 'Domínguez Rosales', 'itzel.dominguez@outlook.com', 'Volcan_Colima6'],
  ['Mariana', 'Cervantes Haro', 'mariana.cervantes@alumnos.udg.mx', 'NaranjaDulce14'],
  ['Camila', 'Estrada Villaseñor', 'cami.estrada@gmail.com', 'Guitarra#Rock88'],
  ['Renata', 'Salcedo Núñez', 'renata.salcedo@hotmail.com', 'PalomitasCine5'],
  ['Ana Lucía', 'Mercado Ponce', 'analu.mercado@gmail.com', 'Tlaquepaque_99'],
  ['Sebastián', 'Rentería Gil', 'sebas.renteria@alumnos.udg.mx', 'SolDeMayo.2001'],
  ['Guadalupe', 'Robles Anaya', 'lupita.robles@hotmail.com', 'Cantarito44!'],
  ['Montserrat', 'Vázquez Plascencia', 'montse.vazquez@gmail.com', 'Lagunas#Chapala'],
  ['Andrés', 'Covarrubias Lomelí', 'andres.covarrubias@outlook.com', 'Torta.Ahogada12'],
  ['Brenda', 'Ortega Saldaña', 'brenda.ortega@alumnos.udg.mx', 'Frida_Kahlo1907'],
  ['Michelle', 'Zepeda Becerra', 'michelle.zepeda@gmail.com', 'Xoloitzcuintle3'],
  ['Abril', 'Magaña Topete', 'abril.magana@hotmail.com', 'AbuelitaLupe60'],
  ['Jimena', 'Aguirre Delgado', 'jimena.aguirre@alumnos.udg.mx', 'Mazapan.Rosa77'],
];

const telefonoDonante = (i) => {
  const a = 1000 + (((i + 1) * 7919) % 9000);
  const b = 1000 + (((i + 3) * 104729) % 9000);
  return `33 ${a} ${b}`;
};
export { ADMIN, DONANTES, telefonoDonante };

let semilla = 2026;
const rnd = () => ((semilla = (semilla * 9301 + 49297) % 233280) / 233280);
const elegir = (arr) => arr[Math.floor(rnd() * arr.length)];
const entre = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const barajar = (arr) => [...arr].sort(() => rnd() - 0.5);

const TZ = '-06:00';
const fecha = (iso, hora = '09:00') => new Date(`${iso}T${hora}:00${TZ}`);
const INICIO = fecha('2026-09-12', '08:00');
const FIN = new Date(Math.min(fecha('2026-10-01', '23:00').getTime(), Date.now()));
const entreFechas = (a, b) => new Date(a.getTime() + rnd() * Math.max(0, b.getTime() - a.getTime()));

const hoy = new Date();
const fechaRel = (dias) => {
  const d = new Date(hoy);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

async function asegurarBaseDeDatos() {
  try {
    const c = await pool.connect();
    c.release();
  } catch (err) {
    if (err.code !== '3D000') throw err;
    const url = new URL(process.env.DATABASE_URL);
    const nombre = decodeURIComponent(url.pathname.slice(1));
    url.pathname = '/postgres';
    const admin = new pg.Client({ connectionString: url.toString() });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${nombre.replace(/"/g, '')}"`);
    await admin.end();
    console.log(`Creamos la base de datos "${nombre}"`);
  }
}

async function main() {
  await asegurarBaseDeDatos();
  const db = await pool.connect();
  try {
    console.log('Creando esquema...');
    await db.query(fs.readFileSync(path.join(SERVER_DIR, 'schema.sql'), 'utf8'));

    // ===== Módulo: Usuarios =====
    console.log('Usuarios...');
    const { rows: [admin] } = await db.query(
      `INSERT INTO usuarios (nombre, apellido, correo, telefono, password_hash, rol, creado_en)
       VALUES ($1,$2,$3,$4,$5,'administrador',$6) RETURNING id`,
      [ADMIN.nombre, ADMIN.apellido, ADMIN.correo, ADMIN.telefono, await bcrypt.hash(ADMIN.password, 10), INICIO]
    );

    const donantes = [];
    for (const [i, [nombre, apellido, correo, password]] of DONANTES.entries()) {
      const alta = i < 12
        ? entreFechas(INICIO, fecha('2026-09-14', '20:00'))
        : entreFechas(fecha('2026-09-15', '08:00'), fecha('2026-09-28', '20:00'));
      const { rows } = await db.query(
        `INSERT INTO usuarios (nombre, apellido, correo, telefono, password_hash, creado_en, es_demo)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING id`,
        [nombre, apellido, correo, telefonoDonante(i), await bcrypt.hash(password, 10), alta]
      );
      donantes.push({ id: rows[0].id, alta });
    }
    const principal = donantes[0];

    // ===== Módulo: Puntos de recolección =====
    console.log('Puntos de recolección (centros universitarios UdeG)...');
    const puntos = [
      ['CUCEI', 'Olímpica', 'Guadalajara', 'Blvd. Marcelino García Barragán 1421', '33 1378 5900', 'Lun a Vie · 9:00 a 18:00'],
      ['CUCEA', 'Los Belenes', 'Zapopan', 'Periférico Norte 799, Núcleo Universitario Los Belenes', '33 3770 3300', 'Lun a Vie · 9:00 a 17:00'],
      ['CUCS', 'Independencia', 'Guadalajara', 'Sierra Mojada 950, Independencia Oriente', '33 1058 5200', 'Lun a Vie · 8:00 a 16:00'],
      ['CUCSH', 'Los Belenes', 'Zapopan', 'Av. José Parres Arias 150, San José del Bajío', '33 3819 3300', 'Lun a Vie · 9:00 a 16:00'],
      ['CUAAD', 'Huentitán', 'Guadalajara', 'Calz. Independencia Norte 5075, Huentitán El Bajo', '33 1202 3000', 'Lun a Vie · 9:00 a 15:00'],
      ['CUTonalá', 'Tateposco', 'Tonalá', 'Av. Nuevo Periférico Oriente 555, Ejido San José Tateposco', '33 3540 3020', 'Lun a Vie · 9:00 a 15:00'],
    ];
    const puntoIds = [];
    for (const p of puntos) {
      const { rows } = await db.query(
        `INSERT INTO puntos_recoleccion (nombre, zona, ciudad, direccion, telefono, horario, creado_en)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [...p, INICIO]
      );
      puntoIds.push(rows[0].id);
    }
    const [P_CUCEI, P_CUCEA, P_CUCS, P_CUCSH, P_CUAAD] = puntoIds;

    // ===== Módulo: Eventos =====
    console.log('Eventos...');
    const desc = (lugar) =>
      `Únete a nuestra campaña de donación de cabello en ${lugar}. Tu aporte puede convertirse en una peluca y devolverle la esperanza a niñas y niños que enfrentan el cáncer.`;

    const crearEvento = async (e) => {
      const { rows } = await db.query(
        `INSERT INTO eventos (nombre, descripcion, fecha, hora_inicio, hora_fin, duracion_cita_min,
           capacidad_por_horario, cupo_total, centro, direccion, ciudad, imagen_url, estado, punto_id, creado_por, creado_en)
         VALUES ($1,$2,$3,$4,$5,30,6,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id, to_char(hora_inicio,'HH24:MI') hi, to_char(hora_fin,'HH24:MI') hf, duracion_cita_min d`,
        [e.nombre, e.descripcion || desc(e.centro), e.fecha, e.hi, e.hf, e.cupo, e.centro,
          e.direccion, e.ciudad, `/eventos/${e.img}.jpg`, e.estado, e.punto ?? null, admin.id, e.creado]
      );
      return { ...rows[0], ...e };
    };

    const pasadosDef = [
      { nombre: 'Arranque de campaña · CUCEI', fecha: '2026-09-15', centro: 'CUCEI',
        direccion: 'Blvd. Marcelino García Barragán 1421, Olímpica', ciudad: 'Guadalajara', punto: P_CUCEI, img: 'gracias-donaciones' },
      { nombre: 'Mechones solidarios · CUCSH', fecha: '2026-09-18', centro: 'CUCSH Los Belenes',
        direccion: 'Av. José Parres Arias 150, San José del Bajío', ciudad: 'Zapopan', punto: P_CUCSH, img: 'comunidad' },
      { nombre: 'Jornada solidaria · CUCEA', fecha: '2026-09-22', centro: 'CUCEA',
        direccion: 'Periférico Norte 799, Núcleo Universitario Los Belenes', ciudad: 'Zapopan', punto: P_CUCEA, img: 'cucea' },
      { nombre: 'Corte con causa · CUAAD', fecha: '2026-09-25', centro: 'CUAAD',
        direccion: 'Calz. Independencia Norte 5075, Huentitán El Bajo', ciudad: 'Guadalajara', punto: P_CUAAD, img: 'sems' },
      { nombre: 'Jornada de donación · CUCS', fecha: '2026-09-29', centro: 'CUCS',
        direccion: 'Sierra Mojada 950, Independencia Oriente', ciudad: 'Guadalajara', punto: P_CUCS, img: 'cucs' },
    ];
    const pasados = [];
    for (const e of pasadosDef) {
      pasados.push(await crearEvento({
        ...e, hi: '09:00', hf: '14:00', cupo: 60, estado: 'finalizado',
        creado: entreFechas(INICIO, fecha('2026-09-13', '20:00')),
      }));
    }

    const proximosDef = [
      { nombre: 'Campaña Universitaria For The Kids · CUCEI', fecha: fechaRel(4), hi: '08:00', hf: '14:00', cupo: 100,
        centro: 'CUCEI', direccion: 'Blvd. Marcelino García Barragán 1421, Olímpica', ciudad: 'Guadalajara',
        punto: P_CUCEI, img: 'cucei-campana', creado: fecha('2026-09-20', '11:30') },
      { nombre: 'Jornada del corazón · CUCEA', fecha: fechaRel(10), hi: '10:00', hf: '15:00', cupo: 60,
        centro: 'CUCEA', direccion: 'Periférico Norte 799, Núcleo Universitario Los Belenes', ciudad: 'Zapopan',
        punto: P_CUCEA, img: 'cucea', creado: fecha('2026-09-23', '10:15') },
      { nombre: 'Jornada de Donación · CUCEI', fecha: fechaRel(16), hi: '09:00', hf: '13:00', cupo: 40,
        centro: 'CUCEI', direccion: 'Blvd. Marcelino García Barragán 1421, Olímpica', ciudad: 'Guadalajara',
        punto: P_CUCEI, img: 'cucei', creado: fecha('2026-09-26', '09:40') },
      { nombre: 'Cada mechón cuenta · CUCS', fecha: fechaRel(22), hi: '09:00', hf: '14:00', cupo: 70,
        centro: 'CUCS', direccion: 'Sierra Mojada 950, Independencia Oriente', ciudad: 'Guadalajara',
        punto: P_CUCS, img: 'cucs', creado: fecha('2026-09-28', '12:00') },
      { nombre: 'Evento Comunitario For The Kids', fecha: fechaRel(29), hi: '10:00', hf: '16:00', cupo: 80,
        centro: 'Plaza de las Américas Juan Pablo II', direccion: 'Frente a la Basílica de Zapopan, Zapopan Centro',
        ciudad: 'Zapopan', img: 'comunidad', creado: fecha('2026-09-30', '17:20') },
    ];
    const proximos = [];
    for (const e of proximosDef) proximos.push(await crearEvento({ ...e, estado: 'activo' }));

    // ===== Módulo: Citas y donaciones =====
    const insertarCita = async (usuario, evento, hora, estado, creadoEn) => {
      const { rows } = await db.query(
        `INSERT INTO citas (folio, usuario_id, evento_id, hora, estado, creado_en, recordatorio_enviado)
         VALUES ($1,$2,$3,$4,$5,$6, TRUE) RETURNING id`,
        [generarFolio(), usuario, evento, hora, estado, creadoEn]
      );
      return rows[0].id;
    };

    console.log('Citas y donaciones de los eventos pasados...');
    for (const [idx, ev] of pasados.entries()) {
      const diaEvento = fecha(ev.fecha, '08:00');
      const horarios = generarHorarios(ev.hi, ev.hf, ev.d);
      const posibles = donantes.filter((d) => d.alta < diaEvento && d !== principal);
      const asistentes = barajar(posibles).slice(0, entre(9, 14));
      if (idx !== 3) asistentes.push(principal);

      for (const u of asistentes) {
        const r = rnd();
        const estado = r < 0.85 ? 'atendida' : r < 0.93 ? 'no_asistio' : 'cancelada';
        const desde = new Date(Math.max(u.alta.getTime(), ev.creado.getTime()));
        const creadoEn = entreFechas(desde, new Date(diaEvento.getTime() - 3600000));
        const hora = elegir(horarios);
        const citaId = await insertarCita(u.id, ev.id, hora, estado, creadoEn);
        if (estado !== 'atendida') continue;

        const largo = entre(20, 35);
        const estadoDon = idx === pasados.length - 1 && rnd() < 0.35 ? 'pendiente' : 'completada';
        await db.query(
          `INSERT INTO donaciones (cita_id, usuario_id, evento_id, largo_cm, estado, registrado_por, creado_en)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [citaId, u.id, ev.id, largo, estadoDon, admin.id, fecha(ev.fecha, `${hora.slice(0, 2)}:${hora.slice(3)}`)]
        );
      }
    }

    console.log('Citas para los eventos próximos...');
    for (const ev of proximos) {
      const horarios = generarHorarios(ev.hi, ev.hf, ev.d);
      const inscritos = barajar(donantes.filter((d) => d !== principal)).slice(0, entre(8, 18));
      const porHorario = {};
      for (const u of inscritos) {
        let h = elegir(horarios);
        if ((porHorario[h] || 0) >= 6) h = horarios.find((x) => (porHorario[x] || 0) < 6);
        porHorario[h] = (porHorario[h] || 0) + 1;
        const desde = new Date(Math.max(u.alta.getTime(), ev.creado.getTime()));
        await insertarCita(u.id, ev.id, h, 'activa', entreFechas(desde, FIN));
      }
    }
    await insertarCita(principal.id, proximos[0].id, '10:00', 'activa', fecha('2026-09-30', '19:45'));

    // ===== Módulo: Notificaciones =====
    console.log('Notificaciones...');
    const notis = [
      ['cita', 'Nueva cita · Evento Comunitario For The Kids', fecha('2026-10-01', '09:12')],
      ['donante', 'Nuevo donante registrado', fecha('2026-09-28', '18:40')],
      ['donacion', 'Donaciones de la jornada en CUCS por revisar', fecha('2026-09-29', '15:05')],
      ['cita', 'Cita reprogramada · Jornada del corazón · CUCEA', fecha('2026-09-30', '13:22')],
    ];
    for (const [tipo, msg, cuando] of notis) {
      await db.query(`INSERT INTO notificaciones (tipo, mensaje, creado_en) VALUES ($1,$2,$3)`, [tipo, msg, cuando]);
    }

    const { rows: [t] } = await db.query(`
      SELECT (SELECT COUNT(*) FROM usuarios WHERE rol = 'donante') AS donantes,
             (SELECT COUNT(*) FROM eventos) AS eventos,
             (SELECT COUNT(*) FROM citas) AS citas,
             (SELECT COUNT(*) FROM donaciones) AS donaciones`);
    console.log(`\nListo: ${t.donantes} donantes, ${t.eventos} eventos, ${t.citas} citas, ${t.donaciones} donaciones.`);
    console.log(`   Admin -> ${ADMIN.correo}`);
    console.log('   Las cuentas de los donantes están al inicio de server/seed.js');
  } finally {
    db.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Error inicializando la BD:', err);
    process.exit(1);
  });
}
