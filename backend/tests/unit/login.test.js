jest.mock('../../src/models', () => require('../helpers/modelosFalsos'));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../../src/models');
const { iniciarSesion } = require('../../src/controllers/auth.controller');
const { crearRespuesta } = require('../helpers/respuestaFalsa');

const CORREO = 'ana@correo.com';
const CONTRASENA = 'Donar2026';
let hash;

beforeAll(async () => {
  hash = await bcrypt.hash(CONTRASENA, 10);
});

beforeEach(async () => {
  Usuario._reiniciar();
  await Usuario.create({ nombre: 'Ana', correo: CORREO, telefono: '3312345678', contrasena_hash: hash, rol: 'donante' });
});

async function intentar(contrasena, correo = CORREO) {
  const res = crearRespuesta();
  await iniciarSesion({ body: { correo, contrasena } }, res);
  return res;
}

const minutosAtras = (min) => new Date(Date.now() - min * 60000);

describe('iniciarSesion() - HU-02 / RF-02', () => {
  test('UT-15 credenciales válidas regresan token y datos del usuario', async () => {
    const res = await intentar(CONTRASENA);
    expect(res.statusCode).toBe(200);
    expect(jwt.verify(res.body.token, process.env.JWT_SECRET).rol).toBe('donante');
    expect(res.body.usuario).toEqual({ id: 1, nombre: 'Ana', correo: CORREO, rol: 'donante' });
  });

  test('UT-16 contraseña incorrecta responde 401 con mensaje genérico', async () => {
    const res = await intentar('Equivocada1');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });

  test('UT-17 correo inexistente responde el mismo 401 genérico (no revela qué correos existen)', async () => {
    const res = await intentar(CONTRASENA, 'nadie@correo.com');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });
});

describe('Bloqueo por intentos fallidos - HU-03', () => {
  test('UT-18 con 4 intentos fallidos en 10 min la cuenta NO se bloquea', async () => {
    for (let i = 0; i < 4; i++) await intentar('Equivocada1');
    const usuario = await Usuario.findOne({ where: { correo: CORREO } });
    expect(usuario.intentos_fallidos).toBe(4);
    expect(usuario.bloqueado_hasta).toBeNull();
    expect((await intentar(CONTRASENA)).statusCode).toBe(200);
  });

  test('UT-19 al 5.º intento fallido la cuenta se bloquea 15 minutos', async () => {
    for (let i = 0; i < 5; i++) await intentar('Equivocada1');
    const usuario = await Usuario.findOne({ where: { correo: CORREO } });
    const minutos = (new Date(usuario.bloqueado_hasta) - Date.now()) / 60000;
    expect(minutos).toBeGreaterThan(14.9);
    expect(minutos).toBeLessThanOrEqual(15);
  });

  test('UT-20 un intento fallido fuera de la ventana de 10 min reinicia el contador', async () => {
    const usuario = await Usuario.findOne({ where: { correo: CORREO } });
    await usuario.update({ intentos_fallidos: 4, ultimo_intento_fallido: minutosAtras(11) });
    await intentar('Equivocada1');
    expect(usuario.intentos_fallidos).toBe(1);
    expect(usuario.bloqueado_hasta).toBeNull();
  });

  test('UT-21 con la cuenta bloqueada, aun con la contraseña correcta, responde 423 y los minutos restantes', async () => {
    const usuario = await Usuario.findOne({ where: { correo: CORREO } });
    await usuario.update({ bloqueado_hasta: new Date(Date.now() + 10 * 60000) });
    const res = await intentar(CONTRASENA);
    expect(res.statusCode).toBe(423);
    expect(res.body.error).toContain('10 minuto(s)');
  });

  test('UT-22 cuando vence el bloqueo puede entrar y los contadores vuelven a 0', async () => {
    const usuario = await Usuario.findOne({ where: { correo: CORREO } });
    await usuario.update({ intentos_fallidos: 3, ultimo_intento_fallido: minutosAtras(20), bloqueado_hasta: minutosAtras(1) });
    const res = await intentar(CONTRASENA);
    expect(res.statusCode).toBe(200);
    expect(usuario.intentos_fallidos).toBe(0);
    expect(usuario.bloqueado_hasta).toBeNull();
  });

  test('UT-22b sin correo o contraseña responde 400', async () => {
    const res = await intentar('', CORREO);
    expect(res.statusCode).toBe(400);
  });
});
