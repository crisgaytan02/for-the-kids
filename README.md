# For The Kids · Sistema de Gestión de Campaña de Donación de Cabello

**Equipo Tlaxcala** · Calidad de Software, ciclo 2026B
Gaytán Barrios Cristóbal Jair · Flores Murillo Diego · Pérez Torres Fátima Isabel · Basilio Ramos Ian Santiago

Este es el repositorio de nuestro proyecto. Lo fuimos armando por módulos, en el mismo orden que pusimos en el Gantt de la Entrega 1 (Versión 1), que se entrega el **29 de septiembre de 2026**.

## ¿Cómo vamos?

- [x] **Módulo 1. Base y entorno:** estructura del repo, modelo relacional en PostgreSQL (`database/schema.sql`) y el esqueleto del backend con Express + Sequelize.
- [x] **Módulo 2. Usuarios y autenticación** (RF-01, RF-02, RF-14): registro, login con JWT, bloqueo por intentos fallidos y rutas protegidas por rol.
- [x] **Módulo 3. Eventos y puntos de recolección** (RF-03, RF-04, RF-12): consulta pública y CRUD para el admin (las bajas son lógicas, no se borra nada).
- [x] **Módulo 4. Citas** (RF-05 a RF-09): agendar validando el cupo aunque lleguen varias solicitudes al mismo tiempo, cancelar (con una regla extra que explicamos más abajo), correos de confirmación y cancelación, y recordatorio automático.
- [x] **Módulo 5. Donaciones e historial** (RF-10, RF-11): el admin registra la donación sobre una cita atendida y el donante la ve en su historial.
- [x] **Módulo 6. Reportes** (RF-13): número de citas, donaciones y eventos activos, con filtro por fechas o por evento.
- [x] **Frontend (React + Vite):** sitio público para donantes y panel de administración.

## Cómo correr el proyecto

### Base de datos

1. Crean una base de datos vacía en PostgreSQL, por ejemplo `for_the_kids`.
2. Cargan el esquema:
   ```bash
   psql -U postgres -d for_the_kids -f database/schema.sql
   ```
3. Si ya tenían la base de una versión anterior, corran también las migraciones que les falten, en este orden:

   | Migración | Qué agrega |
   |-----------|------------|
   | `002_auth_lockout.sql` | Columna para la ventana de intentos fallidos del login |
   | `003_citas_recordatorio.sql` | Control de recordatorios de citas |
   | `004_longitud_y_cancelacion.sql` | `longitud_cm` en donaciones y columnas para cancelaciones tardías |
   | `005_imagenes.sql` | `imagen_url` (opcional) en eventos y puntos de recolección |

   Todas están en `database/migrations/`.

### Backend

1. Dentro de `backend/`, copien `.env.example` como `.env` y llenen los datos de conexión. **El `.env` nunca se sube al repo** (ya está en el `.gitignore`).
2. Instalen y levanten el servidor:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. Para confirmar que todo está conectado, abran `http://localhost:4000/api/health`. Debe regresar `{ "status": "ok", "db": "conectada" }`.

### Frontend

1. En otra terminal (con el backend corriendo), entren a `frontend/` y corran `npm install`.
2. Luego `npm run dev`.
3. Abran la URL que les aparezca, normalmente `http://localhost:5173`.

El frontend se conecta a `http://localhost:4000/api`, por eso el backend tiene que estar prendido al mismo tiempo.

### Correos (RF-08 y RF-09)

Para que los correos salgan de verdad hay que poner `EMAIL_USER` y `EMAIL_PASSWORD` en el `.env` (con Gmail se usa una "contraseña de aplicación"). Si no se llenan, el sistema funciona igual, solo que el correo no se manda y el error queda en la consola del backend. Eso lo dejamos así a propósito, porque RF-08 pide registrar todos los fallos de envío.

Los recordatorios salen solos: al arrancar el servidor se programa una tarea que cada hora revisa qué citas caen entre 20 y 24 horas después. En consola aparece `[Recordatorios] job programado cada hora`.

## Estructura del proyecto

```
for-the-kids/
├── database/
│   ├── schema.sql          # Modelo relacional (usuarios, eventos, puntos, citas, donaciones)
│   └── migrations/         # Cambios que se fueron agregando al esquema
├── backend/
│   ├── src/
│   │   ├── config/db.js    # Conexión a PostgreSQL con Sequelize
│   │   ├── models/         # Un modelo por entidad y sus asociaciones
│   │   ├── routes/         # Rutas de cada módulo
│   │   ├── controllers/    # Lógica de cada endpoint
│   │   └── middleware/     # Autenticación, validación de rol, etc.
│   ├── uploads/            # Fotos subidas desde el panel (se crea sola)
│   └── index.js
└── frontend/               # React + Vite
```

## Endpoints

### Módulo 2 · Autenticación

| Método | Ruta | Qué hace | Protegida |
|--------|------|----------|-----------|
| POST | /api/auth/registro | Crea un usuario nuevo (por default con rol donante) | No |
| POST | /api/auth/login | Regresa un JWT si el correo y la contraseña son correctos | No |
| GET | /api/auth/perfil | Datos del usuario que inició sesión | Sí |
| GET | /api/auth/solo-admin | Ruta de ejemplo que solo deja pasar al admin | Sí (admin) |

Para probar como administrador hay que darle el rol a mano en la base:
```sql
UPDATE usuarios SET rol = 'admin' WHERE correo = 'tu_correo@ejemplo.com';
```

### Módulo 3 · Eventos y puntos de recolección

| Método | Ruta | Qué hace | Protegida |
|--------|------|----------|-----------|
| GET | /api/eventos | Lista los eventos activos | No |
| POST | /api/eventos | Crea un evento (no acepta cupo de 0 o menos) | Sí (admin) |
| PUT | /api/eventos/:id | Edita un evento | Sí (admin) |
| DELETE | /api/eventos/:id | Da de baja un evento (baja lógica) | Sí (admin) |
| GET | /api/puntos | Lista los puntos de recolección activos | No |
| POST | /api/puntos | Crea un punto de recolección | Sí (admin) |
| PUT | /api/puntos/:id | Edita un punto | Sí (admin) |
| DELETE | /api/puntos/:id | Da de baja un punto | Sí (admin) |
| POST | /api/uploads | Sube una foto para un evento o punto | Sí (admin) |

**Fotos de eventos y puntos:** al crear un evento o punto desde el panel, en "Foto (opcional)" eligen la imagen de su compu y se sube en ese momento (sale "Subiendo imagen…" y luego la vista previa). Si no suben nada, se muestra el diseño de colores que trae por default.

Solo se aceptan jpg, png, webp y gif de hasta 5 MB. Las fotos se guardan en `backend/uploads/` y el backend las sirve en `http://localhost:4000/uploads/...`.

> **Ojo:** esas fotos solo existen en la compu donde se subieron. Si mueven o entregan el proyecto, copien también `backend/uploads/` o vuelvan a subirlas.

### Módulo 4 · Citas

| Método | Ruta | Qué hace | Protegida |
|--------|------|----------|-----------|
| POST | /api/citas | Agenda una cita (body: `{ evento_id }`) | Sí |
| DELETE | /api/citas/:id | Cancela una cita (ver la regla de abajo) | Sí |
| GET | /api/citas/mis-citas | Citas del usuario que inició sesión | Sí |
| GET | /api/citas/solicitudes-cancelacion | Cancelaciones tardías pendientes | Sí (admin) |
| PATCH | /api/citas/:folio/aprobar-cancelacion | Aprueba la cancelación y libera el cupo | Sí (admin) |
| PATCH | /api/citas/:folio/rechazar-cancelacion | Rechaza la cancelación; la cita sigue en pie | Sí (admin) |

**Regla que agregamos para las cancelaciones:** si el donante cancela con 24 horas o más de anticipación, se cancela directo. Si faltan menos de 24 horas, la cancelación queda como "solicitud pendiente" y un admin la tiene que aprobar (se libera el cupo) o rechazar (la cita sigue agendada) desde la pestaña "Solicitudes de cancelación".

Esto no venía en el SRS: ahí RF-07 habla de una ventana de 12 horas. Lo decidimos en equipo porque las cancelaciones de último momento dejan lugares vacíos que nadie alcanza a ocupar. Nos falta actualizar el SRS y el documento de Requerimientos Medibles para que coincidan con el código.

### Módulo 5 · Donaciones

| Método | Ruta | Qué hace | Protegida |
|--------|------|----------|-----------|
| PATCH | /api/citas/:folio/atender | Marca una cita "agendada" como "atendida" | Sí (admin) |
| POST | /api/donaciones | Registra una donación. Body: `{ folio, longitud_cm, notas }` | Sí (admin) |
| GET | /api/donaciones/mis-donaciones | Historial del usuario que inició sesión | Sí |
| GET | /api/donaciones | Todas las donaciones | Sí (admin) |

**Cómo fluye una donación:**
1. El donante agenda su cita.
2. El día del evento, el admin la marca como atendida con el **folio**.
3. El admin registra la donación con ese mismo folio.
4. El donante ya la ve en su historial.

Usamos el folio de 8 caracteres (el que aparece en "Mis citas" y en los correos) en lugar del id de la base de datos. Al principio pedíamos el id y salía el error `la sintaxis de entrada no es válida para tipo integer`, porque el admin nunca ve ese número en pantalla.

`longitud_cm` es obligatoria (número mayor a 0) porque el SRS la pide como dato de entrada en RF-10. Las `notas` son opcionales.

### Módulo 6 · Reportes

| Método | Ruta | Qué hace | Protegida |
|--------|------|----------|-----------|
| GET | /api/reportes | Citas, donaciones, donantes y eventos activos. Filtros: `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&evento_id=1` (máximo 90 días) | Sí (admin) |
| GET | /api/reportes/donaciones-por-mes | Donaciones por mes para la gráfica del dashboard (`?meses=9`) | Sí (admin) |
| GET | /api/reportes/publico | Totales sin datos personales para la página de inicio | No |

### Panel de administración

| Método | Ruta | Qué hace | Protegida |
|--------|------|----------|-----------|
| GET | /api/usuarios | Lista de usuarios (secciones "Donantes" y "Usuarios") | Sí (admin) |
| GET | /api/citas/todas | Todas las citas (sección "Citas" y dashboard) | Sí (admin) |

## Sobre la interfaz

El panel de admin tiene barra lateral, tarjetas de resumen, gráficas y calendario. El sitio público tiene una portada para los donantes. Usamos verde bosque con ámbar, y las tipografías Fraunces para títulos y Work Sans para el resto.

Casi todo el panel ya muestra datos reales de la base: tarjetas, gráfica de donaciones por mes, estado de citas, calendario, próximas citas, eventos recientes y notificaciones. Lo que todavía es solo de adorno:

- El buscador de arriba (todavía no filtra).
- Las imágenes de los eventos que no tienen foto subida.

## Reiniciar la base de datos

Si quieren borrar los datos de prueba y empezar de cero, hay un script que vacía las 5 tablas y crea un solo usuario admin:

```bash
cd backend
npm run resetear-bd
```

Al terminar, el script muestra en consola el correo y la contraseña del admin. Si quieren otros datos, los pueden pasar así:

```bash
ADMIN_CORREO=otro@correo.com ADMIN_CONTRASENA=OtraClave123 npm run resetear-bd
```

> **Cuidado:** esto borra TODO (usuarios, eventos, puntos, citas y donaciones). Úsenlo solo si de verdad quieren arrancar de cero, y cambien la contraseña del admin la primera vez que entren.

## Lo que nos falta

Ya están cubiertos los 14 RF del SRS en el backend y hay una interfaz funcional. Nos queda:

- Pulir el diseño con lo que Ian tiene en Figma.
- Agregar las pruebas automatizadas para el reporte de QA.
- Actualizar el SRS y los Requerimientos Medibles con la regla de cancelaciones tardías.
- Preparar la documentación final de la Entrega 1.
