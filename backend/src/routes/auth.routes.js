const express = require('express');
const router = express.Router();
const { registrar, iniciarSesion, perfil } = require('../controllers/auth.controller');
const verificarToken = require('../middleware/auth.middleware');
const requiereRol = require('../middleware/role.middleware');
const asyncHandler = require('../middleware/asyncHandler');

router.post('/registro', asyncHandler(registrar));
router.post('/login', asyncHandler(iniciarSesion));
router.get('/perfil', verificarToken, asyncHandler(perfil));

// Ruta de ejemplo para que el equipo vea cómo se protege un endpoint solo para admin (RF-14)
router.get('/solo-admin', verificarToken, requiereRol('admin'), (req, res) => {
  res.json({ mensaje: `Hola ${req.usuario.nombre}, entraste como admin` });
});

module.exports = router;
