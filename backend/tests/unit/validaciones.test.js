const { validarRegistro } = require('../../src/utils/validaciones');

const datosValidos = {
  nombre: 'Ana López',
  correo: 'ana@correo.com',
  telefono: '3312345678',
  contrasena: 'Donar2026',
};

describe('validarRegistro() - HU-01 / RF-01', () => {
  test('UT-01 datos completos y válidos se aceptan', () => {
    const resultado = validarRegistro(datosValidos);
    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toEqual({});
  });

  test('UT-02 correo vacío se rechaza', () => {
    const resultado = validarRegistro({ ...datosValidos, correo: '' });
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.correo).toBe('El correo es obligatorio');
  });

  test('UT-03 correo con formato inválido (ana@correo) se rechaza', () => {
    const resultado = validarRegistro({ ...datosValidos, correo: 'ana@correo' });
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.correo).toBe('El correo no tiene un formato válido');
  });

  test('UT-04 contraseña de 7 caracteres se rechaza', () => {
    const resultado = validarRegistro({ ...datosValidos, contrasena: 'Donar20' });
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.contrasena).toBe('La contraseña debe tener mínimo 8 caracteres');
  });

  test('UT-05 contraseña sin números se rechaza', () => {
    const resultado = validarRegistro({ ...datosValidos, contrasena: 'DonarCabello' });
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.contrasena).toBe('La contraseña debe incluir al menos un número');
  });

  test('UT-06 teléfono con 9 dígitos se rechaza', () => {
    const resultado = validarRegistro({ ...datosValidos, telefono: '331234567' });
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.telefono).toBe('El teléfono debe tener 10 dígitos');
  });

  test('UT-07 teléfono de 10 dígitos con espacios o guiones sí se acepta', () => {
    const resultado = validarRegistro({ ...datosValidos, telefono: '33 1234-5678' });
    expect(resultado.valido).toBe(true);
  });
});
