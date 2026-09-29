const express = require('express');
const router = express.Router();
const { registrarDonacion, misDonaciones, listarDonaciones } = require('../controllers/donaciones.controller');
const verificarToken = require('../middleware/auth.middleware');
const requiereRol = require('../middleware/role.middleware');
const asyncHandler = require('../middleware/asyncHandler');

router.use(verificarToken);

router.post('/', requiereRol('admin'), asyncHandler(registrarDonacion));   // RF-10
router.get('/mis-donaciones', asyncHandler(misDonaciones));                 // RF-11
router.get('/', requiereRol('admin'), asyncHandler(listarDonaciones));      // apoyo para el admin / Módulo 6

module.exports = router;
