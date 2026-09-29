const jwt = require('jsonwebtoken');
const verificarToken = require('../../src/middleware/auth.middleware');
const requiereRol = require('../../src/middleware/role.middleware');
const { crearRespuesta } = require('../helpers/respuestaFalsa');

const firmar = (datos, opciones = { expiresIn: '24h' }) => jwt.sign(datos, process.env.JWT_SECRET, opciones);

function pasarPorToken(encabezado) {
  const req = { headers: encabezado ? { authorization: encabezado } : {} };
  const res = crearRespuesta();
  const next = jest.fn();
  verificarToken(req, res, next);
  return { req, res, next };
}

describe('verificarToken() - HU-04 / RF-14', () => {
  test('UT-23 petición sin encabezado Authorization responde 401', () => {
    const { res, next } = pasarPorToken();
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('UT-24 token expirado responde 401', () => {
    const vencido = firmar({ id: 1, rol: 'admin', exp: Math.floor(Date.now() / 1000) - 60 }, {});
    const { res, next } = pasarPorToken(`Bearer ${vencido}`);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('UT-25 token con la firma alterada responde 401', () => {
    const falso = jwt.sign({ id: 1, rol: 'admin' }, 'otro-secreto');
    const { res, next } = pasarPorToken(`Bearer ${falso}`);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('UT-25b token válido deja pasar y guarda los datos en req.usuario', () => {
    const { req, next } = pasarPorToken(`Bearer ${firmar({ id: 3, rol: 'donante', nombre: 'Ana' })}`);
    expect(next).toHaveBeenCalled();
    expect(req.usuario).toMatchObject({ id: 3, rol: 'donante' });
  });
});

describe('requiereRol() - HU-04 / RF-14', () => {
  const soloAdmin = requiereRol('admin');

  test('UT-26 un donante en una ruta de admin recibe 403', () => {
    const res = crearRespuesta();
    const next = jest.fn();
    soloAdmin({ usuario: { id: 3, rol: 'donante' } }, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('UT-27 un administrador sí pasa (se llama a next)', () => {
    const res = crearRespuesta();
    const next = jest.fn();
    soloAdmin({ usuario: { id: 1, rol: 'admin' } }, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('UT-27b sin usuario autenticado responde 403', () => {
    const res = crearRespuesta();
    soloAdmin({}, res, jest.fn());
    expect(res.statusCode).toBe(403);
  });

  test('UT-27c la verificación de rol tarda menos de 500 ms', () => {
    const inicio = performance.now();
    soloAdmin({ usuario: { rol: 'admin' } }, crearRespuesta(), jest.fn());
    expect(performance.now() - inicio).toBeLessThan(500);
  });
});
