const bcrypt = require('bcrypt');
const { Usuario } = require('../models');
const { generarToken } = require('../utils/jwt');
const { validarRegistro } = require('../utils/validaciones');

const MAX_INTENTOS = 5;
const VENTANA_MINUTOS = 10;
const BLOQUEO_MINUTOS = 15;

// RF-01: registro de usuarios
async function registrar(req, res) {
  const { nombre, correo, telefono, contrasena } = req.body;

  // Los 4 campos son obligatorios; si falta uno, se rechaza con mensaje específico.
  if (!nombre || !correo || !telefono || !contrasena) {
    return res.status(400).json({
      error: 'Todos los campos son obligatorios: nombre, correo, telefono y contrasena',
    });
  }

  // Formato de correo, teléfono de 10 dígitos y contraseña mínima de 8 con un número.
  const { valido, errores } = validarRegistro({ nombre, correo, telefono, contrasena });
  if (!valido) {
    return res.status(400).json({ error: Object.values(errores)[0], errores });
  }

  const existente = await Usuario.findOne({ where: { correo } });
  if (existente) {
    return res.status(409).json({ error: 'Ese correo ya está registrado' });
  }

  const contrasena_hash = await bcrypt.hash(contrasena, 10);

  const nuevoUsuario = await Usuario.create({
    nombre,
    correo,
    telefono,
    contrasena_hash,
    rol: 'donante', // el rol admin se asigna manualmente en BD, nunca desde el registro público
  });

  return res.status(201).json({
    id: nuevoUsuario.id,
    nombre: nuevoUsuario.nombre,
    correo: nuevoUsuario.correo,
    rol: nuevoUsuario.rol,
  });
}

// RF-02: inicio de sesión con bloqueo temporal por intentos fallidos
async function iniciarSesion(req, res) {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  }

  const usuario = await Usuario.findOne({ where: { correo } });
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // ¿Sigue bloqueada la cuenta?
  if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
    const minutosRestantes = Math.ceil((new Date(usuario.bloqueado_hasta) - new Date()) / 60000);
    return res.status(423).json({
      error: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutosRestantes} minuto(s)`,
    });
  }

  const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena_hash);

  if (!contrasenaValida) {
    const ahora = new Date();
    const dentroDeVentana =
      usuario.ultimo_intento_fallido &&
      (ahora - new Date(usuario.ultimo_intento_fallido)) / 60000 <= VENTANA_MINUTOS;

    const nuevosIntentos = dentroDeVentana ? usuario.intentos_fallidos + 1 : 1;

    const actualizacion = {
      intentos_fallidos: nuevosIntentos,
      ultimo_intento_fallido: ahora,
    };

    // 5 intentos fallidos seguidos en la ventana de 10 min -> bloqueo de 15 min
    if (nuevosIntentos >= MAX_INTENTOS) {
      actualizacion.bloqueado_hasta = new Date(ahora.getTime() + BLOQUEO_MINUTOS * 60000);
      actualizacion.intentos_fallidos = 0;
    }

    await usuario.update(actualizacion);
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // Login correcto: se resetean los contadores de intentos fallidos
  await usuario.update({ intentos_fallidos: 0, ultimo_intento_fallido: null, bloqueado_hasta: null });

  const token = generarToken(usuario);

  return res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol },
  });
}

// Ruta protegida simple para probar que el token viaja bien (útil para el resto del equipo)
async function perfil(req, res) {
  const usuario = await Usuario.findByPk(req.usuario.id, {
    attributes: ['id', 'nombre', 'correo', 'telefono', 'rol'],
  });
  return res.json(usuario);
}

module.exports = { registrar, iniciarSesion, perfil };
