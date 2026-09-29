const express = require('express');
const router = express.Router();
const {
  listarPuntos,
  crearPunto,
  actualizarPunto,
  eliminarPunto,
} = require('../controllers/puntos.controller');
const verificarToken = require('../middleware/auth.middleware');
const requiereRol = require('../middleware/role.middleware');
const asyncHandler = require('../middleware/asyncHandler');

// RF-04: pública, no requiere autenticación
router.get('/', asyncHandler(listarPuntos));

// RF-12: solo administradores
router.post('/', verificarToken, requiereRol('admin'), asyncHandler(crearPunto));
router.put('/:id', verificarToken, requiereRol('admin'), asyncHandler(actualizarPunto));
router.delete('/:id', verificarToken, requiereRol('admin'), asyncHandler(eliminarPunto));

module.exports = router;
