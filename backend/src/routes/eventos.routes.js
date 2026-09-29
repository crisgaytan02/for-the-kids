const express = require('express');
const router = express.Router();
const {
  listarEventos,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
} = require('../controllers/eventos.controller');
const verificarToken = require('../middleware/auth.middleware');
const requiereRol = require('../middleware/role.middleware');
const asyncHandler = require('../middleware/asyncHandler');

// RF-03: pública, cualquiera puede consultar los eventos vigentes
router.get('/', asyncHandler(listarEventos));

// RF-12: solo administradores pueden dar de alta, editar o dar de baja
router.post('/', verificarToken, requiereRol('admin'), asyncHandler(crearEvento));
router.put('/:id', verificarToken, requiereRol('admin'), asyncHandler(actualizarEvento));
router.delete('/:id', verificarToken, requiereRol('admin'), asyncHandler(eliminarEvento));

module.exports = router;
