# For The Kids — Sistema de Gestión de Campaña de Donación de Cabello

Equipo Tlaxcala — Calidad de Software, ciclo 2026B
Gaytán Barrios Cristóbal Jair · Diego Flores Murillo · Fátima Isabel Pérez Torres · Ian Santiago Basilio Ramos

Vamos avanzando por módulos, siguiendo el orden del Gantt de la Entrega 1 (Versión 1), con fecha límite el **29 de septiembre de 2026**.

## Estado actual

- [x] **Módulo 1 — Base y entorno**: estructura del repo, modelo relacional en PostgreSQL (`database/schema.sql`) y esqueleto del backend en Express + Sequelize.
- [x] **Módulo 2 — Usuarios y autenticación** (RF-01, RF-02, RF-14): registro, login con JWT, bloqueo por intentos fallidos y protección de rutas por rol.
- [x] **Módulo 3 — Eventos y puntos de recolección** (RF-03, RF-04, RF-12): consulta pública y CRUD administrativo con baja lógica.
- [x] **Módulo 4 — Citas** (RF-05, RF-06, RF-07, RF-08, RF-09): agendar con validación de cupo a prueba de concurrencia, cancelación con ventana de 24h (con aprobación del admin si es más tarde — ver nota abajo), correos de confirmación/cancelación y recordatorio automático.
- [x] **Frontend provisional (React + Vite)**: login/registro, consulta y agenda de eventos, mis citas, puntos de recolección, y altas rápidas de admin. Es la base visual; se irá puliendo el diseño conforme avancen Módulos 5 y 6.
- [x] **Módulo 5 — Donaciones e historial** (RF-10, RF-11): registro admin vinculado a citas atendidas, historial por usuario.
- [x] **Módulo 6 — Reportes** (RF-13): estadísticas de citas, donaciones y eventos activos, filtrables por rango de fechas o evento.

## Cómo levantar el Módulo 1

1. Crear una base de datos PostgreSQL vacía, por ejemplo `for_the_kids`.
2. Ejecutar el esquema:
   ```bash
   psql -U postgres -d for_the_kids -f database/schema.sql
   ```
3. Dentro de `backend/`, copiar `.env.example` a `.env` y llenar los datos de conexión.
4. Instalar dependencias y levantar el servidor:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
5. Probar que todo esté conectado en `GET http://localhost:4000/api/health` — debe responder `{ "status": "ok", "db": "conectada" }`.

## Estructura del proyecto

```
for-the-kids/
├── database/
│   └── schema.sql        # Modelo relacional completo (usuarios, eventos, puntos, citas, donaciones)
└── backend/
    ├── src/
    │   ├── config/db.js  # Conexión a PostgreSQL vía Sequelize
    │   ├── models/        # Un modelo por entidad + asociaciones
    │   ├── routes/        # (se llenará en los siguientes módulos)
    │   ├── controllers/   # (se llenará en los siguientes módulos)
    │   └── middleware/    # (auth, validación de rol, etc.)
    └── index.js
```

## Endpoints del Módulo 2 (autenticación)

| Método | Ruta               | Descripción                                      | Protegida |
|--------|--------------------|---------------------------------------------------|-----------|
| POST   | /api/auth/registro | Crea un usuario nuevo (rol donante por default)    | No        |
| POST   | /api/auth/login    | Devuelve un JWT si las credenciales son correctas  | No        |
| GET    | /api/auth/perfil   | Devuelve los datos del usuario autenticado         | Sí        |
| GET    | /api/auth/solo-admin | Ejemplo de ruta restringida solo a rol admin     | Sí (admin)|

**Nota importante:** si ya habías cargado `database/schema.sql` antes de este módulo, corre también `database/migrations/002_auth_lockout.sql` (agrega la columna que controla la ventana de intentos fallidos).

Para probar el login como administrador, dale el rol manualmente en la base de datos:
```sql
UPDATE usuarios SET rol = 'admin' WHERE correo = 'tu_correo@ejemplo.com';
```

## Endpoints del Módulo 3 (eventos y puntos de recolección)

| Método | Ruta              | Descripción                                | Protegida |
|--------|-------------------|---------------------------------------------|-----------|
| GET    | /api/eventos      | Lista eventos activos                       | No        |
| POST   | /api/eventos      | Crea un evento (rechaza cupo <= 0)          | Sí (admin)|
| PUT    | /api/eventos/:id  | Edita un evento                             | Sí (admin)|
| DELETE | /api/eventos/:id  | Da de baja un evento (baja lógica)          | Sí (admin)|
| GET    | /api/puntos       | Lista puntos de recolección activos         | No        |
| POST   | /api/puntos       | Crea un punto de recolección                | Sí (admin)|
| PUT    | /api/puntos/:id   | Edita un punto de recolección               | Sí (admin)|
| DELETE | /api/puntos/:id   | Da de baja un punto de recolección          | Sí (admin)|

Para probar los endpoints de admin, usa el token de un usuario con `rol = 'admin'` (ver nota del Módulo 2 sobre cómo asignarlo).

**Nueva migración:** corre `database/migrations/005_imagenes.sql` — agrega la columna opcional `imagen_url` en `eventos` y `puntos_recoleccion`.

**Cómo poner fotos reales (subida directa desde el panel de admin):**
1. Al crear un evento o un punto de recolección desde el panel de admin, en "Foto del evento/punto (opcional)" da clic y elige la imagen desde tu computadora.
2. La imagen se sube sola en cuanto la eliges (verás "Subiendo imagen…" y luego una vista previa). No hace falta copiar archivos a ninguna carpeta ni escribir rutas a mano.
3. Al dar "Crear evento" / "Crear punto", esa foto ya queda guardada y se muestra en las tarjetas del sitio público y del dashboard, en vez del ícono/degradado. Si no subes nada, se sigue viendo el diseño decorativo.

Por dentro, esto lo hace un endpoint nuevo `POST /api/uploads` (solo admin, con `multer`): recibe el archivo, lo guarda en `backend/uploads/` (se crea solo, no necesitas hacerla a mano) y responde con la URL pública (`/uploads/xxxx.jpg`), que el backend sirve como archivo estático mientras esté corriendo (`http://localhost:4000/uploads/...`). Solo se aceptan imágenes (jpg, png, webp, gif) hasta 5MB.

⚠️ A diferencia de las imágenes en `frontend/public/` (que quedan incluidas en el build del frontend), las fotos subidas por este botón viven en `backend/uploads/` y solo se ven mientras el backend esté prendido y esa carpeta exista — si vas a entregar/mover el proyecto, no olvides copiar también `backend/uploads/` (o volver a subir las fotos).

Nota: el campo del formulario ahora es un selector de archivo (ya no hay campo de texto para pegar una ruta o link a mano), así que la forma de poner una foto es siempre eligiendo el archivo. Si en algún momento quieres apuntar a una imagen que ya vive en `frontend/public/eventos/` o `frontend/public/puntos/` (por ejemplo para no duplicar fotos), se puede seguir haciendo por API/base de datos directamente (`imagen_url = '/eventos/tu-foto.jpg'`), pero desde la interfaz del panel el flujo normal es subir el archivo.

## Endpoints del Módulo 4 (citas)

| Método | Ruta                 | Descripción                                            | Protegida |
|--------|----------------------|---------------------------------------------------------|-----------|
| POST   | /api/citas           | Agenda una cita (body: `{ evento_id }`)                 | Sí        |
| DELETE | /api/citas/:id       | Cancela una cita. Si faltan 24h o más para el evento, se cancela de inmediato; si faltan menos, queda pendiente de aprobación del admin (ver abajo) | Sí |
| GET    | /api/citas/mis-citas | Lista las citas del usuario autenticado                  | Sí        |

**Regla ampliada (no estaba en el SRS original, se agregó a petición del equipo):** si un donante intenta cancelar su cita con **menos de 24 horas** de anticipación al evento, la cancelación ya no se procesa sola — queda como "solicitud pendiente" y un administrador debe **aprobarla** (libera el cupo) o **rechazarla** (la cita sigue agendada) desde la pestaña "Solicitudes de cancelación" del panel. Esto es una decisión de negocio adicional a la ventana de 12h que describe RF-07 en el SRS/REQUERIMIENTOS-MEDIBLES — si el equipo quiere mantener trazabilidad documento-código 1 a 1 para la evaluación de Calidad de Software, valdría la pena actualizar esos dos documentos para reflejar esta regla nueva.

| Método | Ruta                                  | Descripción                                          | Protegida  |
|--------|---------------------------------------|-------------------------------------------------------|------------|
| GET    | /api/citas/solicitudes-cancelacion    | Lista las solicitudes de cancelación pendientes       | Sí (admin) |
| PATCH  | /api/citas/:folio/aprobar-cancelacion | Aprueba la cancelación tardía y libera el cupo         | Sí (admin) |
| PATCH  | /api/citas/:folio/rechazar-cancelacion| Rechaza la cancelación; la cita sigue agendada          | Sí (admin) |

**Importante — correo (RF-08, RF-09):** para que salgan los correos de verdad necesitas llenar `EMAIL_USER` y `EMAIL_PASSWORD` en el `.env` con una cuenta real (por ejemplo Gmail con una "contraseña de aplicación"). Si no los llenas, el sistema sigue funcionando igual (la cita se agenda/cancela bien), solo que el envío de correo fallará y quedará registrado en la consola del backend — así lo pide RF-08 (loguear el 100% de los fallos).

**Nueva migración:** corre también `database/migrations/003_citas_recordatorio.sql` sobre tu base de datos.

**Migración más reciente:** corre `database/migrations/004_longitud_y_cancelacion.sql` — agrega la columna `longitud_cm` (obligatoria) en `donaciones` y las columnas de solicitud de cancelación tardía en `citas`.

**Recordatorios automáticos (RF-09):** hay un job que corre cada hora revisando qué citas caen entre 20 y 24 horas a partir de ese momento. No hace falta hacer nada manual, arranca solo junto con el servidor (verás en consola "[Recordatorios] job programado cada hora").

## Siguientes pasos

Queda el Módulo 5 (donaciones e historial, RF-10 y RF-11) y el Módulo 6 (reportes, RF-13). El flujo completo del donante ya se puede probar de principio a fin desde el navegador: registro → login → ver eventos → agendar cita → cancelar si hace falta.

## Cómo levantar el frontend

1. En otra terminal (deja el backend corriendo aparte), entra a `frontend/` y corre `npm install`.
2. Corre `npm run dev`.
3. Abre en el navegador la URL que te muestre (normalmente http://localhost:5173).

El frontend habla directo con `http://localhost:4000/api`, así que el backend debe estar corriendo al mismo tiempo. Es una interfaz provisional (sin router, sin librería de estilos externa) hecha en React porque así lo especifica la Propuesta del proyecto — se irá refinando visualmente conforme avance el resto de los módulos.

**Sistema de diseño:** verde bosque + ámbar miel, tipografía Fraunces (títulos) + Work Sans (todo lo demás), tarjetas con borde fino en vez de sombras, distintivos de color por estado de cita, y barra de cupo visual en cada evento.

## Endpoints del Módulo 5 (donaciones)

| Método | Ruta                     | Descripción                                         | Protegida |
|--------|--------------------------|------------------------------------------------------|-----------|
| PATCH  | /api/citas/:folio/atender | Marca una cita "agendada" como "atendida" (usa el folio, no el id numérico) | Sí (admin)|
| POST   | /api/donaciones          | Registra una donación. Body: `{ folio, longitud_cm, notas }` (solo sobre cita "atendida") | Sí (admin)|
| GET    | /api/donaciones/mis-donaciones | Historial del usuario autenticado             | Sí        |
| GET    | /api/donaciones          | Lista todas las donaciones                           | Sí (admin)|

**Flujo completo de una donación:** 1) el donante agenda su cita (Módulo 4) → 2) el día del evento, el admin la marca como atendida usando el **folio** de la cita (`PATCH /api/citas/:folio/atender`) → 3) el admin registra la donación con ese mismo folio (`POST /api/donaciones`) → 4) el donante ya la ve en su historial.

**Nota (corrección):** estos dos endpoints se identifican por el folio de 8 caracteres (el que se ve en "Mis citas" y en los correos), no por el id interno de la base de datos — el admin nunca ve ese id en pantalla, así que pedírselo causaba el error `la sintaxis de entrada no es válida para tipo integer`.

**Nota (RF-10):** el SRS pide explícitamente la longitud del cabello donado como dato de entrada del registro de donación, así que `longitud_cm` es obligatorio (número mayor a 0, en centímetros); solo `notas` es opcional.

## Endpoints del Módulo 6 (reportes)

| Método | Ruta          | Descripción                                                              | Protegida |
|--------|---------------|----------------------------------------------------------------------------|-----------|
| GET    | /api/reportes | Número de citas, donaciones, donantes y eventos activos. Filtros opcionales: `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&evento_id=1` (rango máximo: 90 días) | Sí (admin)|
| GET    | /api/reportes/donaciones-por-mes | Serie de tiempo de donaciones por mes (opcional `?meses=9`), para la gráfica del dashboard | Sí (admin)|
| GET    | /api/reportes/publico | Totales sin datos sensibles (donaciones, eventos activos, personas participando) para la página de inicio pública | No |

## Interfaz nueva: dashboard de admin + sitio público

Se rediseñó la interfaz completa siguiendo el mockup que nos compartieron: un panel de administración con barra lateral oscura, tarjetas de resumen, gráficas y calendario; y un sitio público con portada tipo landing page para el donante.

Endpoints de apoyo para esta interfaz:

| Método | Ruta          | Descripción                                          | Protegida  |
|--------|---------------|---------------------------------------------------------|------------|
| GET    | /api/usuarios | Lista todos los usuarios (alimenta "Donantes" y "Usuarios" del panel) | Sí (admin) |
| GET    | /api/citas/todas | Lista todas las citas de todos los donantes (alimenta "Citas" y el dashboard) | Sí (admin) |

**Qué es dato real y qué es solo visual por ahora:**
- Las tarjetas de resumen, la gráfica de "Donaciones por mes", el estado de citas (donut), el calendario, "Próximas citas", "Eventos recientes" y "Notificaciones" (que reutiliza las solicitudes de cancelación pendientes y las donaciones más recientes) **usan datos reales** de la base de datos.
- El buscador de la barra superior es **solo visual por ahora** (no filtra nada todavía).
- Las fotos de eventos son bloques de color decorativos porque no tenemos fotografías reales de la campaña — se pueden reemplazar por imágenes cuando el equipo las tenga.

## Reiniciar la base de datos (dejar solo un admin)

Para borrar todos los datos de prueba y empezar a capturar información real desde cero, hay un script que trunca las 5 tablas y crea un único usuario admin, usando el mismo `bcrypt` de la app (así el login queda garantizado):

```bash
cd backend
npm run resetear-bd
```

Al terminar imprime en consola el correo y la contraseña del admin creado. Por default son:

- **Correo:** `admin@forthekids.org`
- **Contraseña:** `Admin123!`

Se pueden usar otros valores sin tocar el código:

```bash
ADMIN_CORREO=otro@correo.com ADMIN_CONTRASENA=OtraClave123 npm run resetear-bd
```

⚠️ Esto borra TODO (usuarios, eventos, puntos de recolección, citas y donaciones) — úsalo solo cuando de verdad se quiera arrancar de cero, y cambia la contraseña del admin después de iniciar sesión por primera vez.

## Siguientes pasos

Con los 14 RF del SRS cubiertos a nivel de backend + una interfaz funcional en React, lo que queda es: pulir el diseño visual (idealmente retomando lo que Ian defina en Figma), agregar pruebas automatizadas para el reporte de QA, decidir si se actualiza el SRS/REQUERIMIENTOS-MEDIBLES para reflejar la regla de aprobación de cancelaciones tardías (ver nota en el Módulo 4), y preparar la documentación final de la Entrega 1.
