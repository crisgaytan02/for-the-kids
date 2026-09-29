jest.mock('../../src/models', () => require('../helpers/modelosFalsos'));

const express = require('express');
const request = require('supertest');
const { Usuario } = require('../../src/models');

// App mínima con las rutas de autenticación (sin levantar la BD ni el servidor real).
const app = express();
app.use(express.json());
app.use('/api/auth', require('../../src/routes/auth.routes'));
app.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.message }));

const nuevo = {
  nombre: 'Ana López',
  correo: 'ana@correo.com',
  telefono: '3312345678',
  contrasena: 'Donar2026',
};

beforeEach(() => Usuario._reiniciar());

describe('Rutas /api/auth - pruebas de integración', () => {
  test('IT-01 POST /api/auth/registro con datos válidos responde 201', async () => {
    const res = await request(app).post('/api/auth/registro').send(nuevo);
    expect(res.status).toBe(201);
    expect(res.body.rol).toBe('donante');
  });

  test('IT-02 POST /api/auth/registro con correo repetido responde 409', async () => {
    await request(app).post('/api/auth/registro').send(nuevo);
    const res = await request(app).post('/api/auth/registro').send(nuevo);
    expect(res.status).toBe(409);
  });

  test('IT-03 POST /api/auth/login con credenciales válidas regresa token', async () => {
    await request(app).post('/api/auth/registro').send(nuevo);
    const res = await request(app).post('/api/auth/login').send({ correo: nuevo.correo, contrasena: nuevo.contrasena });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  test('IT-04 GET /api/auth/solo-admin con token de donante responde 403', async () => {
    await request(app).post('/api/auth/registro').send(nuevo);
    const login = await request(app).post('/api/auth/login').send({ correo: nuevo.correo, contrasena: nuevo.contrasena });
    const res = await request(app).get('/api/auth/solo-admin').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  test('IT-05 después de 5 logins fallidos, el siguiente responde 423', async () => {
    await request(app).post('/api/auth/registro').send(nuevo);
    for (let i = 0; i < 5; i++) {
      const fallo = await request(app).post('/api/auth/login').send({ correo: nuevo.correo, contrasena: 'Equivocada1' });
      expect(fallo.status).toBe(401);
    }
    const res = await request(app).post('/api/auth/login').send({ correo: nuevo.correo, contrasena: nuevo.contrasena });
    expect(res.status).toBe(423);
  });

  test('IT-06 GET /api/auth/perfil sin token responde 401', async () => {
    const res = await request(app).get('/api/auth/perfil');
    expect(res.status).toBe(401);
  });

  test('IT-07 GET /api/auth/solo-admin con token de administrador responde 200', async () => {
    await request(app).post('/api/auth/registro').send(nuevo);
    const usuario = await Usuario.findOne({ where: { correo: nuevo.correo } });
    await usuario.update({ rol: 'admin' });
    const login = await request(app).post('/api/auth/login').send({ correo: nuevo.correo, contrasena: nuevo.contrasena });
    const res = await request(app).get('/api/auth/solo-admin').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });

  test('IT-08 GET /api/auth/perfil con token válido regresa los datos del usuario', async () => {
    await request(app).post('/api/auth/registro').send(nuevo);
    const login = await request(app).post('/api/auth/login').send({ correo: nuevo.correo, contrasena: nuevo.contrasena });
    const res = await request(app).get('/api/auth/perfil').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.correo).toBe(nuevo.correo);
  });
});
