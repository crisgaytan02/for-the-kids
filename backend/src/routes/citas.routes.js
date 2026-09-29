const express = require('express');
const router = express.Router();
const {
  agendarCita,
  cancelarCita,
  misCitas,
  listarTodasCitas,
  marcarAtendida,
  listarSolicitudesCancelacion,
  aprobarCancelacion,
  rechazarCancelacion,
} = require('../controllers/citas.controller');
const verificarToken = require('../middleware/auth.middleware');
const requiereRol = require('../middleware/role.middleware');
const asyncHandler = require('../middleware/asyncHandler');

// Todas las rutas de citas requieren estar autenticado
router.use(verificarToken);

router.post('/', asyncHandler(agendarCita));                                                      // RF-05, RF-06
router.delete('/:id', asyncHandler(cancelarCita));                                                 // RF-07 (auto-aprueba si faltan 24h+, si no queda pendiente)
router.get('/mis-citas', asyncHandler(misCitas));                                                  // conveniencia para el donante
router.get('/todas', requiereRol('admin'), asyncHandler(listarTodasCitas));                        // panel admin: todas las citas
router.patch('/:folio/atender', requiereRol('admin'), asyncHandler(marcarAtendida));                // paso previo a RF-10 (recibe el folio, no el id)

// Solicitudes de cancelación tardía (menos de 24h antes del evento)
router.get('/solicitudes-cancelacion', requiereRol('admin'), asyncHandler(listarSolicitudesCancelacion));
router.patch('/:folio/aprobar-cancelacion', requiereRol('admin'), asyncHandler(aprobarCancelacion));
router.patch('/:folio/rechazar-cancelacion', requiereRol('admin'), asyncHandler(rechazarCancelacion));

module.exports = router;
