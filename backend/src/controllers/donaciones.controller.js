const { Donacion, Cita, Evento, Usuario } = require('../models');

// RF-10: solo el admin registra la donación, y solo sobre una cita marcada "atendida".
// Se identifica la cita por su FOLIO, no por su id numérico interno: es el único
// dato que el admin trae a la mano (lo ve en la lista de citas y en los correos).
async function registrarDonacion(req, res) {
  const { folio, longitud_cm, notas } = req.body;

  if (!folio) {
    return res.status(400).json({ error: 'Debes indicar el folio de la cita' });
  }

  if (longitud_cm === undefined || longitud_cm === null || longitud_cm === '') {
    return res.status(400).json({ error: 'Debes indicar la longitud del cabello donado (en cm)' });
  }

  const longitud = Number(longitud_cm);
  if (Number.isNaN(longitud) || longitud <= 0) {
    return res.status(400).json({ error: 'La longitud del cabello debe ser un número mayor a 0' });
  }

  const cita = await Cita.findOne({ where: { folio: folio.toUpperCase() } });

  if (!cita) {
    return res.status(404).json({ error: `No existe ninguna cita con el folio ${folio}` });
  }

  if (cita.estado !== 'atendida') {
    return res.status(400).json({
      error: 'Solo se puede registrar una donación sobre una cita marcada como atendida',
    });
  }

  const yaExiste = await Donacion.findOne({ where: { cita_id: cita.id } });
  if (yaExiste) {
    return res.status(409).json({ error: 'Esta cita ya tiene una donación registrada' });
  }

  const donacion = await Donacion.create({
    cita_id: cita.id,
    usuario_id: cita.usuario_id,
    longitud_cm: longitud,
    notas: notas || null,
  });

  return res.status(201).json(donacion);
}

// RF-11: el donante solo puede ver sus propias donaciones
async function misDonaciones(req, res) {
  const donaciones = await Donacion.findAll({
    where: { usuario_id: req.usuario.id },
    include: [
      {
        model: Cita,
        attributes: ['folio'],
        include: [{ model: Evento, attributes: ['nombre', 'fecha'] }],
      },
    ],
    order: [['registrada_en', 'DESC']],
  });
  return res.json(donaciones);
}

// Conveniencia para el admin: ver todas las donaciones (útil para el Módulo 6 y para verificar)
async function listarDonaciones(req, res) {
  const donaciones = await Donacion.findAll({
    include: [
      { model: Usuario, attributes: ['nombre', 'correo'] },
      {
        model: Cita,
        attributes: ['folio'],
        include: [{ model: Evento, attributes: ['nombre', 'fecha'] }],
      },
    ],
    order: [['registrada_en', 'DESC']],
  });
  return res.json(donaciones);
}

module.exports = { registrarDonacion, misDonaciones, listarDonaciones };
