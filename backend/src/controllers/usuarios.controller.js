const { Usuario } = require('../models');

// Soporte para las pantallas de admin "Donantes" y "Usuarios": ambas usan
// este mismo listado; "Donantes" simplemente lo filtra por rol en el frontend.
async function listarUsuarios(req, res) {
  const usuarios = await Usuario.findAll({
    attributes: ['id', 'nombre', 'correo', 'telefono', 'rol', 'creado_en'],
    order: [['creado_en', 'DESC']],
  });
  return res.json(usuarios);
}

module.exports = { listarUsuarios };
