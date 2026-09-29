const express = require('express');
const router = express.Router();
const { subirImagen } = require('../controllers/uploads.controller');
const { subirImagen: middlewareMulter } = require('../middleware/upload.middleware');
const verificarToken = require('../middleware/auth.middleware');
const requiereRol = require('../middleware/role.middleware');
const asyncHandler = require('../middleware/asyncHandler');

// Solo admin: sube una foto (para eventos o puntos de recoleccion) y devuelve su URL.
router.post('/', verificarToken, requiereRol('admin'), middlewareMulter.single('imagen'), asyncHandler(subirImagen));

module.exports = router;
