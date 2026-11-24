# For The Kids 💛

Sistema de gestión para la campaña de donación de cabello **For The Kids**. Lo hicimos para la materia de **Calidad de Software** (CUCEI, ciclo 2026B) con la profesora Zoila Liliana Herrera Luján.

La idea es simple: que la gente encuentre un evento, agende su cita sin pelearse por el lugar y reciba sus correos de confirmación y recordatorio. Del otro lado, el equipo organizador tiene todo (citas, donaciones de cabello, reportes) en un solo panel, en vez de hojas de cálculo y mensajes de WhatsApp.

**Equipo Tlaxcala**

| Integrante | Rol | Módulos que trabajó |
|---|---|---|
| Cristóbal Jair Gaytán Barrios | Backend y BD | Modelo relacional, API REST, citas con validación de cupo, recordatorios por correo |
| Fátima Isabel Pérez Torres | QA y Frontend | Registro/login, correos de confirmación, pruebas |
| Ian Santiago Basilio Ramos | Frontend y requisitos | Eventos, puntos de recolección, historial, panel de reportes |
| Diego Flores Murillo | Fullstack y DevOps | Base del panel admin, registro de donaciones, CI/CD |

---

## Stack

- **Frontend:** React 18 + Vite + React Router. CSS propio, sin librerías de UI, para que quedara igual al Figma.
- **Backend:** Node.js + Express (API REST), JWT para sesiones y bcrypt para contraseñas.
- **Base de datos:** PostgreSQL (la administramos con pgAdmin).
- **Correos:** Nodemailer con SMTP (Gmail o el correo del hosting).
- **Recordatorios:** node-cron.
- **PDF:** pdfkit para exportar el reporte por periodo.

Todo es **un solo proyecto con un solo `package.json`**. Express sirve la API y también la página, así que basta un comando y un puerto.

```
for-the-kids/
├── package.json          # dependencias y comandos de todo el proyecto
├── vite.config.js
├── .env.example          # copia como .env y llénalo
├── client/
│   ├── index.html
│   ├── public/           # logo, íconos, hero, fondo de login y fotos de eventos
│   └── src/
│       ├── main.jsx          # rutas, layouts (público y admin) y rutas protegidas
│       ├── core.jsx          # cliente de la API, sesión, useFetch y formatos
│       ├── ui.jsx            # componentes, gráficas, calendario, aviso de privacidad, marco de login
│       ├── paginas-sitio.jsx # inicio, eventos, puntos, login, registro, mis citas, mis donaciones, perfil
│       ├── paginas-admin.jsx # dashboard, eventos, citas, donaciones, donantes, puntos, notificaciones, configuración
│       └── estilos.css
└── server/
    ├── index.js          # arranque: siempre levanta el servidor (lo usan npm start y Hostinger)
    ├── app.js            # la aplicación Express (API + página); las pruebas la importan sin arrancar
    ├── core.js           # configuración, BD, validaciones, sesión, correos, recordatorios y PDF
    ├── api.js            # todas las rutas de la API
    ├── schema.sql        # tablas de la base de datos (se puede correr varias veces sin borrar nada)
    ├── reset.sql         # borra las tablas; solo lo usa el seed
    ├── migrar.js         # actualiza la base sin borrar datos (npm run db:migrate)
    ├── seed.js           # borra, crea las tablas y carga los datos de la campaña
    ├── api.test.js       # pruebas de integración
    └── assets/logo.png   # logo que va dentro de los correos
```

Cada archivo está dividido en módulos marcados así: `// ===== Módulo: Login =====`.

---

## Cómo correrlo en local (Windows + VS Code)

Necesitas **Node 22 LTS** y **PostgreSQL 16 con pgAdmin**.

1. Abre la carpeta del proyecto en VS Code y abre una terminal (`Ctrl + ñ`).
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Copia `.env.example` como `.env` (en la raíz del proyecto). Pon tu contraseña de Postgres en `DATABASE_URL`, cambia `JWT_SECRET` por cualquier texto largo y llena `ADMIN_CORREO` y `ADMIN_PASSWORD` (mínimo 8 caracteres y un número): con esos datos se crea la cuenta de administrador.
4. En pgAdmin crea la base `forthekids` (clic derecho en *Databases → Create → Database*). Si no la creas, el siguiente paso intenta crearla solo.
5. Crea las tablas y carga los datos:
   ```bash
   npm run db:init
   ```
6. Levanta todo:
   ```bash
   npm run dev
   ```
7. Abre **http://localhost:4000**.

Con `npm run dev` los cambios del front se ven al guardar, y el servidor se reinicia solo cuando cambias algo en `server/`.

### Cuentas

- **Administrador:** el que configures en `ADMIN_CORREO` / `ADMIN_PASSWORD` del `.env` (las credenciales ya no viven en el código). Más administradores se agregan desde **Configuración → Administradores**.
- **Donantes:** las 28 cuentas demo con sus contraseñas están al inicio de `server/seed.js`.

### Comandos de base de datos

| Comando | Qué hace |
|---|---|
| `npm run db:init` | **Borra todo** y carga los datos demo. Solo para desarrollo o para la presentación. |
| `npm run db:migrate` | Crea o actualiza tablas **sin borrar datos** y crea el admin del `.env` si no hay ninguno. El servidor también lo corre solo al arrancar. |

Toda la actividad del seed (registros, eventos, citas y donaciones) cae entre el **12 de septiembre y el 1 de octubre de 2026**. Los eventos próximos se registraron en esas fechas, pero se calculan a partir del día en que corres el seed para que siempre haya fechas para agendar.

---

## Correos (confirmación, reprogramación, cancelación y recordatorio)

El sistema manda correo cuando:

| Momento | Quién lo recibe |
|---|---|
| Se agenda una cita | El donante, con folio, fecha, hora y lugar |
| Se reprograma una cita | El donante, con el nuevo horario |
| El donante cancela su cita | El donante |
| El admin cancela una cita | El donante, avisando que la canceló el equipo |
| El admin da de baja un evento con citas | Todos los donantes con cita activa en ese evento |
| Faltan 20–24 h para la cita | El donante (recordatorio; el servidor revisa cada 15 min) |
| Pide recuperar su contraseña | El usuario, con un enlace de un solo uso que vence en 60 min |
| Cambia o restablece su contraseña | El usuario, avisando del cambio |
| Un admin lo da de alta como administrador | La persona invitada, con enlace para crear su contraseña (vence en 48 h) |

Si un correo falla (SMTP caído, límite de Gmail, etc.) queda en la bitácora y entra a una **cola de reintentos**: el servidor lo vuelve a intentar cada 5 minutos, hasta 5 veces. En **Configuración → Correo** se ve cuántos están en espera.

### Configurarlo con Gmail

1. Entra a tu cuenta de Google → **Seguridad** → activa la **Verificación en dos pasos**.
2. Busca **Contraseñas de aplicaciones** (myaccount.google.com/apppasswords), crea una llamada "For The Kids" y copia las 16 letras.
3. En el `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=tu-correo@gmail.com
   SMTP_PASS=las16letrassinespacios
   MAIL_FROM="For The Kids <tu-correo@gmail.com>"
   ```
4. Reinicia `npm run dev`. En la terminal debe salir `📬 Correo listo`.
5. En el panel, **Configuración → Correo**, manda un correo de prueba. Ahí mismo ves los últimos envíos y si alguno falló.

Si usan el correo de Hostinger, cambien `SMTP_HOST=smtp.hostinger.com`, con el mismo puerto 465 y su cuenta de correo del dominio.

### Las cuentas del seed no reciben correos reales

Los 28 donantes del seed tienen correos inventados que podrían existir. Para no mandarle nada a un desconocido, los correos a esas cuentas **se simulan** (salen en la terminal y en la bitácora como "Simulado"). Si quieren verlos de verdad, pongan su correo en `MAIL_REDIRECT_TO`: todos los correos de cuentas demo les llegarán a ustedes con el asunto `[Para correo-original] …`.

Las cuentas que se registren desde la página sí reciben el correo normal.

---

## Pruebas

```bash
npm test
```

Las pruebas crean su propio administrador, donante y eventos (todos con prefijo `qa.` / `QA`) y los borran al terminar, así que se pueden correr sobre cualquier base sin depender del seed ni de la contraseña del `.env`. Los correos de las pruebas siempre se simulan.

Son 26 pruebas de integración que llaman directo a la API y validan los criterios medibles del SRS (concurrencia de cupo, rango de 20 a 35 cm, registro de correos) y las mejoras de la versión 2: recuperación y cambio de contraseña, alta de administradores, bitácora de accesos, límite por IP, cola de reintentos de correo y lista de asistentes en PDF. `npm run test:cobertura` muestra además la cobertura.

---

## Trazabilidad con los requerimientos

| RF | Qué pide (versión medible) | Dónde está | Prueba |
|---|---|---|---|
| RF-01 | Registro con campos obligatorios, correo único y consentimiento de datos | `api.js` (Registro) · `paginas-sitio.jsx` | ✅ |
| RF-02 | JWT de 24 h, bloqueo de 15 min tras 5 intentos en 10 min, redirección por rol | `api.js` (Login) | ✅ |
| RF-03 | Solo eventos activos y vigentes, con cupo real | `api.js` (Eventos) | ✅ |
| RF-04 | Puntos con dirección, teléfono y horario, sin login | `api.js` (Puntos de recolección) | ✅ |
| RF-05 | Folio de 8 caracteres, una sola cita activa por evento | `api.js` (Citas) + índice único parcial | ✅ |
| RF-06 | 0% de sobrecupo con solicitudes simultáneas | `SELECT … FOR UPDATE` sobre el evento | ✅ |
| RF-07 | Cancelar o reprogramar hasta 12 h antes y liberar el lugar | `api.js` (Citas) | ✅ |
| RF-08 | Correo al agendar, reprogramar y cancelar, con bitácora de fallos | `core.js` (Correos) + tabla `log_correos` | ✅ |
| RF-09 | Recordatorio entre 20 y 24 h antes | `core.js` (Recordatorios) | manual |
| RF-10 | Donación de cabello (20–35 cm) solo sobre citas atendidas | `api.js` (Donaciones) | ✅ |
| RF-11 | El donante solo ve sus propias donaciones | `api.js` (Donaciones) | ✅ |
| RF-12 | CRUD de eventos y puntos, cupos > 0, solo admin | `api.js` (Eventos, Puntos) | ✅ |
| RF-13 | Reporte de hasta 90 días, en pantalla y en PDF | `api.js` (Reportes) · `core.js` (Reporte PDF) | ✅ |
| RF-14 | Donante en ruta de admin = 403 | `core.js` (Autenticación) + rutas protegidas en `main.jsx` | ✅ |

---

## API (resumen)

Todas van bajo `/api`. 🔒 pide sesión; 👑 además pide rol de administrador.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/registro` | Crear cuenta de donante |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/yo` 🔒 | Datos de la sesión |
| POST | `/auth/recuperar` | Manda el enlace para restablecer la contraseña |
| POST | `/auth/restablecer/validar` | Revisa si el enlace sigue vigente |
| POST | `/auth/restablecer` | Guarda la nueva contraseña (`{ token, password }`) |
| PATCH | `/auth/password` 🔒 | Cambiar contraseña con la actual |
| GET/POST | `/admin/administradores` 👑 | Ver administradores / dar acceso |
| PATCH | `/admin/administradores/:id/quitar` 👑 | Quitar acceso al panel |
| GET | `/admin/accesos` 👑 | Bitácora de inicios de sesión con IP |
| GET | `/eventos/:id/asistentes/pdf` 👑 | Lista de asistentes imprimible |
| GET | `/eventos` | Eventos vigentes |
| GET | `/eventos/:id` | Detalle con horarios disponibles |
| GET | `/eventos/admin/todos` 👑 | Todos los eventos con métricas |
| POST/PUT/DELETE | `/eventos[/:id]` 👑 | Crear, editar o dar de baja (avisa por correo) |
| POST | `/eventos/imagen` 👑 | Subir imagen (PNG/JPG, máx. 5 MB) |
| GET | `/puntos` | Puntos activos |
| POST/PUT/DELETE | `/puntos[/:id]` 👑 | Gestión de puntos |
| POST | `/citas` 🔒 | Agendar (`{ evento_id, hora }`) |
| GET | `/citas/mias` 🔒 | Mis citas |
| PATCH | `/citas/:id/cancelar` 🔒 | Cancelar |
| PATCH | `/citas/:id/reprogramar` 🔒 | Cambiar de horario |
| GET | `/citas/admin` 👑 | Todas las citas con filtros |
| PATCH | `/citas/:id/estado` 👑 | Marcar `atendida` / `no_asistio` |
| GET | `/donaciones/mias` 🔒 | Historial del donante |
| GET | `/donaciones` 👑 | Listado (`?estado=&q=`) |
| POST | `/donaciones` 👑 | Registrar donación (`{ cita_id, largo_cm }`) |
| PATCH | `/donaciones/:id` 👑 | Cambiar estado |
| GET | `/reportes/dashboard` 👑 | Métricas, donaciones por mes y largos de cabello |
| GET | `/reportes?desde=&hasta=` 👑 | Reporte por periodo |
| GET | `/reportes/pdf?desde=&hasta=` 👑 | El mismo reporte en PDF |
| GET | `/reportes/donantes` 👑 | Donantes con sus totales |
| GET | `/reportes/notificaciones` 👑 | Notificaciones del panel |
| GET | `/correo/estado` 👑 | Conexión SMTP y últimos envíos |
| POST | `/correo/prueba` 👑 | Manda un correo de prueba |

---

## Decisiones que tomamos

- **Solo cabello.** La campaña es de donación de cabello, así que quitamos los tipos de donación: cada donación guarda su largo en cm (20 a 35).
- **El cupo se valida con un candado en la fila del evento** (`FOR UPDATE`). Primero lo hicimos solo con `COUNT(*)` y en la prueba de concurrencia se colaban dos citas.
- **"Una cita activa por evento" también vive en la BD**, como índice único parcial.
- **Personas beneficiadas = donaciones completadas.** Es la estimación que acordamos para la V1.
- **Los porcentajes del dashboard comparan los últimos 30 días contra los 30 anteriores**, porque con mes calendario todo salía en 0% a principio de mes.
- **Las gráficas son SVG hechos a mano**; Chart.js agregaba ~200 kb por dos gráficas.

## Versión 2 (mejoras sobre el SRS)

- **Recuperar contraseña** por correo con enlace de un solo uso y cambio de contraseña desde el perfil. Al cambiarla se cierran las demás sesiones.
- **Alta de administradores** desde el panel, por invitación (la persona crea su propia contraseña).
- **Sesión verificada contra la BD:** si a alguien le quitan el rol o cambia su contraseña, su token deja de servir al instante.
- **Seguridad:** límite de intentos por IP, bitácora de accesos con IP, cabeceras de seguridad y consentimiento de datos guardado con fecha.
- **Correos con reintentos automáticos.**
- **Modo sin conexión (PWA):** la app se puede instalar y, si se cae la señal en el evento, sigue mostrando eventos, puntos y citas guardados.
- **Lista de asistentes imprimible** por evento, con casillas de asistencia y largo del cabello, como respaldo en papel.
- **"Recordarme"**: si no se marca, la sesión se borra al cerrar el navegador.

## Pendientes

- Recordatorios por WhatsApp.

---

## Despliegue

En producción Express sirve la página compilada (`client/dist`), así que todo se sube junto:

- **Build:** `npm install && npm run build`
- **Start:** `npm start` (archivo de entrada: `server/index.js`)
- **Variables:** `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` (la URL pública, se usa en los enlaces de los correos), `APP_TZ=America/Mexico_City`, `ADMIN_CORREO`, `ADMIN_PASSWORD`, las `SMTP_*` y `TRUST_PROXY=1` (Render, Hostinger y casi todos los hostings ponen un proxy delante; sin esto el límite por IP vería a todos con la misma IP).
- Las tablas se crean solas al arrancar (`db:migrate`). Solo si quieren los datos demo corran `npm run db:init`, que **borra todo**.

Sirve igual en Render + Neon o en Hostinger (plan Business/Cloud con Node.js) + Neon. Las imágenes que sube el admin se guardan en `server/uploads`; en hostings con disco temporal se pierden al redeplegar.
