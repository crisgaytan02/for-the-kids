jest.mock('../../src/models', () => require('../helpers/modelosFalsos'));

const bcrypt = require('bcrypt');
const { Usuario } = require('../../src/models');
const { registrar } = require('../../src/controllers/auth.controller');
const { crearRespuesta } = require('../helpers/respuestaFalsa');

const datosValidos = {
  nombre: 'Ana López',
  correo: 'ana@correo.com',
  telefono: '3312345678',
  contrasena: 'Donar2026',
};

beforeEach(() => Usuario._reiniciar());

describe('registrar() - HU-01 / RF-01', () => {
  test('UT-08 la contraseña se guarda como hash bcrypt (costo 10), nunca en texto plano', async () => {
    const res = crearRespuesta();
    await registrar({ body: datosValidos }, res);

    const guardado = await Usuario.findOne({ where: { correo: datosValidos.correo } });
    expect(guardado.contrasena_hash).not.toBe(datosValidos.contrasena);
    expect(guardado.contrasena_hash.startsWith('$2b$10$')).toBe(true);
    expect(guardado.contrasena).toBeUndefined();
  });

  test('UT-09 el hash guardado valida la contraseña correcta', async () => {
    await registrar({ body: datosValidos }, crearRespuesta());
    const guardado = await Usuario.findOne({ where: { correo: datosValidos.correo } });
    expect(await bcrypt.compare('Donar2026', guardado.contrasena_hash)).toBe(true);
  });

  test('UT-10 el hash guardado rechaza una contraseña incorrecta', async () => {
    await registrar({ body: datosValidos }, crearRespuesta());
    const guardado = await Usuario.findOne({ where: { correo: datosValidos.correo } });
    expect(await bcrypt.compare('OtraClave99', guardado.contrasena_hash)).toBe(false);
  });

  test('UT-11 un correo ya registrado responde 409', async () => {
    await registrar({ body: datosValidos }, crearRespuesta());
    const res = crearRespuesta();
    await registrar({ body: datosValidos }, res);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Ese correo ya está registrado');
  });

  test('UT-12 registro exitoso responde 201, rol donante y sin la contraseña', async () => {
    const res = crearRespuesta();
    await registrar({ body: datosValidos }, res);
    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual({ id: 1, nombre: 'Ana López', correo: 'ana@correo.com', rol: 'donante' });
    expect(res.body.contrasena_hash).toBeUndefined();
  });

  test('UT-12b si falta un campo obligatorio responde 400 y no crea la cuenta', async () => {
    const res = crearRespuesta();
    await registrar({ body: { ...datosValidos, telefono: '' } }, res);
    expect(res.statusCode).toBe(400);
    expect(await Usuario.findOne({ where: { correo: datosValidos.correo } })).toBeNull();
  });

  test('UT-12c datos con formato inválido responden 400 y no crean la cuenta', async () => {
    const res = crearRespuesta();
    await registrar({ body: { ...datosValidos, contrasena: 'corta' } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('La contraseña debe tener mínimo 8 caracteres');
    expect(await Usuario.findOne({ where: { correo: datosValidos.correo } })).toBeNull();
  });
});
