const { Op } = require('sequelize');
const { Evento, Cita, Donacion, Usuario } = require('../models');

const LIMITE_DIAS = 90;

// RF-13: reporte de citas, donaciones y eventos activos, filtrable por rango de
// fechas (sobre la fecha del evento) o por un evento específico.
async function generarReporte(req, res) {
  const { desde, hasta, evento_id } = req.query;

  if (desde && hasta) {
    const dias = (new Date(hasta) - new Date(desde)) / 86400000;
    if (dias > LIMITE_DIAS) {
      return res.status(400).json({ error: `El rango no debe exceder ${LIMITE_DIAS} días` });
    }
    if (dias < 0) {
      return res.status(400).json({ error: 'La fecha "desde" no puede ser posterior a "hasta"' });
    }
  }

  const whereEvento = {};
  if (evento_id) whereEvento.id = evento_id;
  if (desde || hasta) {
    whereEvento.fecha = {};
    if (desde) whereEvento.fecha[Op.gte] = desde;
    if (hasta) whereEvento.fecha[Op.lte] = hasta;
  }

  const eventosFiltrados = await Evento.findAll({ where: whereEvento, attributes: ['id'] });
  const idsEventos = eventosFiltrados.map((e) => e.id);

  const numeroCitas = await Cita.count({ where: { evento_id: idsEventos } });

  const numeroDonaciones = await Donacion.count({
    include: [{ model: Cita, where: { evento_id: idsEventos }, attributes: [] }],
  });

  const eventosActivos = await Evento.count({ where: { ...whereEvento, activo: true } });

  // No depende del rango de fechas del filtro: es un total general, útil para
  // las tarjetas resumen del dashboard.
  const numeroDonantes = await Usuario.count({ where: { rol: 'donante' } });

  return res.json({
    filtros_aplicados: { desde: desde || null, hasta: hasta || null, evento_id: evento_id || null },
    numero_citas: numeroCitas,
    numero_donaciones: numeroDonaciones,
    eventos_activos: eventosActivos,
    numero_donantes: numeroDonantes,
    generado_en: new Date().toISOString(),
  });
}

// Alimenta la gráfica "Donaciones por mes" del dashboard: cuenta las
// donaciones registradas en cada uno de los últimos `meses` meses (incluye el actual).
async function donacionesPorMes(req, res) {
  const meses = Math.min(Number(req.query.meses) || 9, 24);

  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth() - (meses - 1), 1);

  const donaciones = await Donacion.findAll({
    where: { registrada_en: { [Op.gte]: desde } },
    attributes: ['registrada_en'],
  });

  // Se arma el arreglo de meses en JS (en vez de con funciones de fecha de
  // Postgres) para no depender del dialecto y para garantizar que salgan
  // TODOS los meses del rango, incluso los que no tuvieron donaciones.
  const conteos = [];
  for (let i = meses - 1; i >= 0; i -= 1) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    conteos.push({
      clave: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
      etiqueta: fecha.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
      total: 0,
    });
  }

  const indicePorClave = new Map(conteos.map((c) => [c.clave, c]));
  donaciones.forEach((d) => {
    const fecha = new Date(d.registrada_en);
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const bucket = indicePorClave.get(clave);
    if (bucket) bucket.total += 1;
  });

  return res.json(conteos);
}

// Estadísticas públicas para la página de inicio (sin datos sensibles, sin login):
// donaciones realizadas, eventos activos y personas que han participado.
async function reportePublico(req, res) {
  const numeroDonaciones = await Donacion.count();
  const eventosActivos = await Evento.count({ where: { activo: true } });

  const personasParticipando = await Cita.count({
    distinct: true,
    col: 'usuario_id',
  });

  return res.json({
    numero_donaciones: numeroDonaciones,
    eventos_activos: eventosActivos,
    personas_participando: personasParticipando,
  });
}

module.exports = { generarReporte, donacionesPorMes, reportePublico };
