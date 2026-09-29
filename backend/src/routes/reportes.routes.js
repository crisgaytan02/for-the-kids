const express = require('express');
const router = express.Router();
const { generarReporte, donacionesPorMes, reportePublico } = require('../controllers/reportes.controller');
const verificarToken = require('../middleware/auth.middleware');
const requiereRol = require('../middleware/role.middleware');
const asyncHandler = require('../middleware/asyncHandler');

// Estadísticas públicas para la página de inicio del sitio (sin login).
router.get('/publico', asyncHandler(reportePublico));

// RF-13: solo administradores. Filtros opcionales: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&evento_id=1
router.get('/', verificarToken, requiereRol('admin'), asyncHandler(generarReporte));

// Serie de tiempo para la gráfica del dashboard. Opcional: ?meses=9
router.get('/donaciones-por-mes', verificarToken, requiereRol('admin'), asyncHandler(donacionesPorMes));

module.exports = router;
