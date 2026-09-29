require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

// Red de seguridad a nivel de proceso: si algo se escapa de todos los
// try/catch y del manejador de errores de Express, esto evita que Node
// tumbe el servidor completo (comportamiento por default desde Node 15+).
process.on('unhandledRejection', (razon) => {
  console.error('[ERROR NO MANEJADO - promesa]', razon);
});
process.on('uncaughtException', (error) => {
  console.error('[ERROR NO MANEJADO - excepción]', error);
});

const app = express();
app.use(cors());
app.use(express.json());

// Fotos subidas de eventos/puntos de recoleccion (ver middleware/upload.middleware.js)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Endpoint de salud, útil para confirmar que la API y la BD están arriba
app.get('/api/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', db: 'conectada' });
  } catch (error) {
    res.status(500).json({ status: 'error', detalle: error.message });
  }
});

// Módulo 2: usuarios y autenticación (RF-01, RF-02, RF-14)
app.use('/api/auth', require('./routes/auth.routes'));

// Módulo 3: eventos y puntos de recolección (RF-03, RF-04, RF-12)
app.use('/api/eventos', require('./routes/eventos.routes'));
app.use('/api/puntos', require('./routes/puntos.routes'));

// Módulo 4: citas (RF-05 a RF-09)
app.use('/api/citas', require('./routes/citas.routes'));

// Módulo 5: donaciones e historial (RF-10, RF-11)
app.use('/api/donaciones', require('./routes/donaciones.routes'));

// Módulo 6: reportes y estadísticas (RF-13)
app.use('/api/reportes', require('./routes/reportes.routes'));

// Soporte de panel admin: listado de usuarios/donantes
app.use('/api/usuarios', require('./routes/usuarios.routes'));

// Subida de fotos para eventos y puntos de recoleccion
app.use('/api/uploads', require('./routes/uploads.routes'));

// Manejador de errores global de Express: cualquier error que llegue aquí
// (vía next(error), gracias a asyncHandler) se responde como JSON en vez
// de crashear el proceso o dejar la petición colgada.
app.use((error, req, res, next) => {
  console.error('[ERROR EN RUTA]', error);
  const status = error.status || 500;
  res.status(status).json({ error: error.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`For The Kids API corriendo en el puerto ${PORT}`);
  });

  // RF-09: arranca el job de recordatorios automáticos una vez que el servidor está arriba
  const { iniciarJobDeRecordatorios } = require('./jobs/recordatorios.job');
  iniciarJobDeRecordatorios();
});
