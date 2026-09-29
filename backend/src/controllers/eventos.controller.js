const { Evento, PuntoRecoleccion } = require('../models');
const { Op } = require('sequelize');

// RF-03: consulta pública de eventos vigentes (solo activos, con cupo real)
async function listarEventos(req, res) {
  const eventos = await Evento.findAll({
    where: { activo: true },
    include: [{ model: PuntoRecoleccion, attributes: ['nombre', 'direccion'] }],
    order: [['fecha', 'ASC'], ['hora_inicio', 'ASC']],
  });
  return res.json(eventos);
}

// RF-12: alta de evento (solo admin). Rechaza cupos <= 0.
async function crearEvento(req, res) {
  const { nombre, fecha, hora_inicio, hora_fin, ubicacion, punto_recoleccion_id, cupo_total, imagen_url } = req.body;

  if (!nombre || !fecha || !hora_inicio || !hora_fin || !ubicacion || !cupo_total) {
    return res.status(400).json({ error: 'Faltan campos obligatorios del evento' });
  }

  if (cupo_total <= 0) {
    return res.status(400).json({ error: 'El cupo debe ser mayor a 0' });
  }

  const evento = await Evento.create({
    nombre,
    fecha,
    hora_inicio,
    hora_fin,
    ubicacion,
    punto_recoleccion_id: punto_recoleccion_id || null,
    cupo_total,
    cupo_disponible: cupo_total, // al crear, el cupo disponible arranca igual al total
    imagen_url: imagen_url || null,
  });

  return res.status(201).json(evento);
}

// RF-12: edición de evento (solo admin)
async function actualizarEvento(req, res) {
  const { id } = req.params;
  const evento = await Evento.findByPk(id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }

  const { cupo_total } = req.body;
  if (cupo_total !== undefined && cupo_total <= 0) {
    return res.status(400).json({ error: 'El cupo debe ser mayor a 0' });
  }

  await evento.update(req.body);
  return res.json(evento);
}

// RF-12: baja de evento (solo admin). Baja lógica, no se borra el registro.
async function eliminarEvento(req, res) {
  const { id } = req.params;
  const evento = await Evento.findByPk(id);

  if (!evento) {
    return res.status(404).json({ error: 'Evento no encontrado' });
  }

  await evento.update({ activo: false });
  return res.json({ mensaje: 'Evento dado de baja correctamente' });
}

module.exports = { listarEventos, crearEvento, actualizarEvento, eliminarEvento };
