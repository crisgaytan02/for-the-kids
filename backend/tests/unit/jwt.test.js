const jwt = require('jsonwebtoken');
const { generarToken } = require('../../src/utils/jwt');

describe('generarToken() - HU-02 / RF-02', () => {
  const usuario = { id: 7, nombre: 'Ana López', rol: 'donante', contrasena_hash: '$2b$10$xxxx' };

  test('UT-13 el token dura exactamente 24 horas (exp - iat = 86400 s)', () => {
    const datos = jwt.decode(generarToken(usuario));
    expect(datos.exp - datos.iat).toBe(86400);
  });

  test('UT-14 el token lleva id y rol, y nunca la contraseña', () => {
    const datos = jwt.decode(generarToken(usuario));
    expect(datos.id).toBe(7);
    expect(datos.rol).toBe('donante');
    expect(datos.contrasena_hash).toBeUndefined();
    expect(JSON.stringify(datos)).not.toContain('$2b$');
  });
});
