const express = require('express');
const router = express.Router();
const { listarUsuarios } = require('../controllers/usuarios.controller');
const verificarToken = require('../middleware/auth.middleware');
const requiereRol = require('../middleware/role.middleware');
const asyncHandler = require('../middleware/asyncHandler');

// Solo admin: alimenta las pantallas "Donantes" y "Usuarios" del panel.
router.get('/', verificarToken, requiereRol('admin'), asyncHandler(listarUsuarios));

module.exports = router;
