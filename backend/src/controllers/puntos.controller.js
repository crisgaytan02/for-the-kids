const { PuntoRecoleccion } = require('../models');

// RF-04: consulta pública de puntos de recolección activos, sin autenticación
async function listarPuntos(req, res) {
  const puntos = await PuntoRecoleccion.findAll({
    where: { activo: true },
    order: [['nombre', 'ASC']],
  });
  return res.json(puntos);
}

// RF-12: alta de punto de recolección (solo admin)
async function crearPunto(req, res) {
  const { nombre, direccion, telefono, horario, imagen_url } = req.body;

  if (!nombre || !direccion || !telefono || !horario) {
    return res.status(400).json({ error: 'Faltan campos obligatorios del punto de recolección' });
  }

  const punto = await PuntoRecoleccion.create({ nombre, direccion, telefono, horario, imagen_url: imagen_url || null });
  return res.status(201).json(punto);
}

// RF-12: edición de punto de recolección (solo admin)
async function actualizarPunto(req, res) {
  const { id } = req.params;
  const punto = await PuntoRecoleccion.findByPk(id);

  if (!punto) {
    return res.status(404).json({ error: 'Punto de recolección no encontrado' });
  }

  await punto.update(req.body);
  return res.json(punto);
}

// RF-12: baja de punto de recolección (solo admin). Baja lógica.
async function eliminarPunto(req, res) {
  const { id } = req.params;
  const punto = await PuntoRecoleccion.findByPk(id);

  if (!punto) {
    return res.status(404).json({ error: 'Punto de recolección no encontrado' });
  }

  await punto.update({ activo: false });
  return res.json({ mensaje: 'Punto de recolección dado de baja correctamente' });
}

module.exports = { listarPuntos, crearPunto, actualizarPunto, eliminarPunto };
