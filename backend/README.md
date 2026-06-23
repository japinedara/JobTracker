# JobTracker API (Backend)

> **Actualización — correcciones de persistencia y aislamiento por usuario**
> Se corrigieron 6 problemas: registro desde login no persistía, seguimientos
> no se guardaban, solicitudes de administrador no se guardaban, aprobar una
> solicitud no actualizaba el rol en BD, vacantes visibles entre usuarios, y
> faltaba cambio de contraseña en Perfil. Ver detalle al final de este archivo.

Backend en **Node.js + Express + MySQL** (vía `mysql2`), diseñado para
conectarse directamente con el frontend de JobTracker (`index.html`)
mediante `fetch()`.

## ⚠️ Acción requerida en tu base de datos

Si ya tienes la base de datos `jobtracker` creada, ejecuta el script de
migración antes de arrancar el backend:

```bash
mysql -u root -p jobtracker < sql/migration_usuario_id.sql
```

Esto agrega la columna `usuario_id` a la tabla `vacantes` (con FK hacia
`usuarios`), necesaria para que cada usuario vea únicamente sus propias
vacantes y seguimientos. Revisa el script: por defecto asigna las vacantes
existentes al primer usuario con rol `ADMIN`.

Si vas a crear la base de datos desde cero, usa directamente
`sql/schema.sql` (ya incluye `usuario_id` en la definición de `vacantes`).

## Instalación y ejecución

```bash
cd jobtracker-backend
npm install
cp .env.example .env
# Edita .env con tus credenciales de MySQL (host, usuario, contraseña, BD)
npm start
```

El servidor queda disponible en:

```
http://localhost:3000
```

Al iniciar, el servidor verifica la conexión a MySQL antes de aceptar
peticiones. Si las credenciales son incorrectas, el proceso termina
con un mensaje de error claro en la consola.

CORS está habilitado para que el frontend (servido desde cualquier
origen, incluyendo `file://` o `http://localhost:5500`, etc.) pueda
consumir la API sin restricciones.

---

## Base de datos MySQL

El backend espera una base de datos `jobtracker` con las tablas
`usuarios`, `vacantes`, `seguimientos` y `solicitudes_admin` (más una
tabla `actividad` para el log de eventos del Dashboard).

El archivo `sql/schema.sql` contiene la definición completa de
referencia (`CREATE TABLE`) y un `INSERT` opcional con los mismos
datos de ejemplo que tenía la versión en memoria. Si ya tienes las
tablas creadas con otros nombres de columna, ajusta los nombres en
`src/db/repositories/*.js` (las consultas SQL) para que coincidan.

Mapeo de columnas usado (snake_case en BD -> camelCase en JSON):

| Tabla              | Columna BD            | Campo JSON          |
|---------------------|--------------------------|------------------------|
| usuarios             | estado_verificacion        | estadoVerificacion       |
| vacantes              | fecha_creacion               | fechaCreacion              |
| seguimientos           | vacante_id                      | vacanteId                    |
| solicitudes_admin        | usuario_id                         | usuarioId                       |

Variables de entorno (`.env`, ver `.env.example`):

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=jobtracker
DB_CONNECTION_LIMIT=10
PORT=3000
```

---

## Usuarios de prueba (seed)

| Correo                          | Contraseña | Rol   |
|----------------------------------|------------|-------|
| laura.gomez@jobtracker.com        | admin123   | ADMIN |
| mariana.rios@jobtracker.com       | user123    | USER  |

(Estos usuarios se insertan mediante `sql/schema.sql` si las tablas
están vacías; si tu base de datos ya tiene otros usuarios, esos son
los que se usarán.)

---

## Endpoints

### Autenticación (`/api/auth`)

| Método | Ruta                  | Descripción                                  |
|--------|------------------------|-----------------------------------------------|
| POST   | `/api/auth/login`      | `{ correo, password }` → `{ token, user }`     |
| POST   | `/api/auth/register`   | `{ nombre, apellidos, correo, password }` → usuario creado (rol USER) |
| POST   | `/api/auth/logout`     | `{ success: true }`                            |

### Usuarios (`/users`)

| Método | Ruta                     | Descripción                                       |
|--------|---------------------------|------------------------------------------------------|
| GET    | `/users`                  | Lista de usuarios (sin contraseña)                    |
| POST   | `/users`                   | Crear usuario (panel ADMIN)                           |
| PUT    | `/users/:id`                | Editar usuario (nombre, correo, rol, etc.)            |
| DELETE | `/users/:id`                 | Eliminar usuario                                      |
| GET    | `/users/:id/profile`         | Obtener perfil de un usuario                          |
| PUT    | `/users/:id/profile`          | Actualizar perfil (nombre, apellidos, correo, teléfono, ciudad, linkedin, github). `rol` y `estadoVerificacion` se ignoran. |
| PUT    | `/users/:id/password`          | Cambiar contraseña: `{ passwordActual, passwordNueva }`. Valida la actual antes de aceptar la nueva (mín. 6 caracteres). |

### Identificación del usuario actual (header `x-user-id`)

El proyecto no usa JWT verificado en servidor. Para que el backend sepa
qué usuario está pidiendo qué (y así filtrar vacantes/seguimientos por
dueño), el frontend envía el id del usuario con sesión activa en el
header `x-user-id` en cada petición relevante. También se acepta como
`?usuarioId=` en query string o `usuarioId` en el body, como alternativa.

- Si el header no se envía, `/jobs` y `/seguimientos` devuelven **todos**
  los registros (comportamiento anterior, por compatibilidad).
- Si se envía, `/jobs` y `/seguimientos` filtran solo lo del usuario.
- `PUT/DELETE /jobs/:id` y las rutas de seguimientos por vacante devuelven
  `403` si la vacante no pertenece al usuario identificado.



| Método | Ruta                          | Descripción                                              |
|--------|--------------------------------|---------------------------------------------------------------|
| GET    | `/jobs`                        | Lista de vacantes                                              |
| POST   | `/jobs`                         | Crear vacante `{ empresa, cargo, salario, ciudad, estado }`    |
| PUT    | `/jobs/:id`                       | Editar vacante / cambiar estado                                |
| DELETE | `/jobs/:id`                        | Eliminar vacante (y sus seguimientos)                          |
| GET    | `/jobs/:id/seguimientos`            | Seguimientos de una vacante específica                         |
| POST   | `/jobs/:id/seguimientos`             | Crear seguimiento para una vacante                             |

### Seguimientos (`/seguimientos`)

| Método | Ruta              | Descripción                                                |
|--------|---------------------|------------------------------------------------------------------|
| GET    | `/seguimientos`     | Historial completo de seguimientos (todas las vacantes)            |
| POST   | `/seguimientos`      | Crear seguimiento `{ vacanteId, fecha, tipo, descripcion }`         |

### Solicitudes de Administrador (`/applications`)

| Método | Ruta                  | Descripción                                                  |
|--------|------------------------|--------------------------------------------------------------------|
| GET    | `/applications`       | Lista de solicitudes                                                 |
| POST   | `/applications`        | Crear solicitud `{ usuarioId }` → estado `PENDIENTE`                 |
| PUT    | `/applications/:id`      | Resolver `{ estado: "APROBADA" \| "RECHAZADA" }`. Si se aprueba, el usuario pasa a rol `ADMIN`. |

### Actividad (`/activity`)

| Método | Ruta        | Descripción                                          |
|--------|---------------|--------------------------------------------------------------|
| GET    | `/activity`   | Últimos 10 eventos (vacante creada/editada/eliminada, estado cambiado, usuario registrado, solicitudes) |

### Estadísticas (`/stats`)

| Método | Ruta     | Descripción                                                          |
|--------|------------|--------------------------------------------------------------------------|
| GET    | `/stats`   | Métricas del Dashboard: totales, distribución por estado, resumen rápido y actividad reciente |

Ejemplo de respuesta de `/stats` (idéntico al de la versión en memoria):

```json
{
  "totales": {
    "vacantesTotales": 5,
    "aplicacionesEnviadas": 5,
    "entrevistas": 1,
    "ofertas": 1,
    "rechazos": 1
  },
  "distribucionEstados": {
    "Aplicada": 1,
    "En revisión": 1,
    "Entrevista": 1,
    "Oferta": 1,
    "Rechazada": 1
  },
  "resumen": {
    "empresaTop": { "nombre": "Nimbus Tech", "total": 1 },
    "ultimaVacante": { "cargo": "Diseñador UI/UX", "empresa": "PixelWorks", "fechaCreacion": "2026-06-08" },
    "totalUsuarios": 2
  },
  "actividadReciente": [ /* últimos 10 eventos */ ]
}
```

---

## Conectar con el frontend

El frontend (`index.html`) ya está conectado a estos endpoints
mediante `fetch` contra `API_BASE_URL = 'http://localhost:3000'`. No
es necesario cambiar nada en el frontend: la migración a MySQL es
transparente porque cada ruta devuelve exactamente el mismo shape de
respuesta JSON que la versión en memoria.

## Estructura del proyecto

```
jobtracker-backend/
├── package.json
├── .env.example            # Variables de entorno para la conexión MySQL
├── sql/
│   └── schema.sql            # CREATE TABLE de referencia + seed opcional
└── src/
    ├── server.js              # Punto de entrada; verifica conexión MySQL y monta las rutas
    ├── db/
    │   ├── connection.js        # Pool de conexiones mysql2/promise
    │   └── repositories/
    │       ├── usuariosRepo.js    # Consultas SQL sobre la tabla `usuarios`
    │       ├── vacantesRepo.js     # Consultas SQL sobre la tabla `vacantes`
    │       ├── seguimientosRepo.js  # Consultas SQL sobre la tabla `seguimientos`
    │       ├── solicitudesRepo.js    # Consultas SQL sobre `solicitudes_admin`
    │       └── actividadRepo.js       # Consultas SQL sobre la tabla `actividad`
    ├── utils/
    │   └── helpers.js            # stripPassword, todayISO (sin cambios)
    ├── legacy/
    │   └── store.js               # Versión anterior en memoria (ya no se usa; solo referencia)
    └── routes/
        ├── auth.js                 # /api/auth/login, register, logout
        ├── users.js                 # /users
        ├── jobs.js                   # /jobs (+ /jobs/:id/seguimientos)
        ├── seguimientos.js            # /seguimientos
        ├── applications.js             # /applications
        ├── activity.js                  # /activity
        └── stats.js                      # /stats
```

---

## Correcciones aplicadas (sesión de bugfixing)

### 1. El registro desde login no persistía
**Causa:** `index.html` nunca llamaba al backend para login/registro; usaba
un arreglo local (`state.usuarios`) con dos usuarios de ejemplo hardcodeados.
**Archivos:** `index.html` (funciones `api.login`, `api.register`, `api.logout`
ahora hacen `fetch` real a `/api/auth/login`, `/api/auth/register`,
`/api/auth/logout`). Backend sin cambios (ya estaba correcto).

### 2. Los seguimientos no se guardaban
**Causa:** misma razón: `api.getSeguimientos`/`api.createSeguimiento` en el
frontend nunca llamaban a `/seguimientos`.
**Archivos:** `index.html` (conectadas a `/seguimientos`); además
`renderAll()` y `navigateTo()` ahora recargan `state.seguimientos` desde el
backend (antes nadie lo hacía, así que aunque se guardara, la tabla no se
refrescaba).

### 3. Las solicitudes de administrador no se guardaban
**Causa:** igual que los dos anteriores: `api.createAdminRequest`,
`getAdminRequests`, `resolveAdminRequest` operaban sobre un arreglo local.
**Archivos:** `index.html` (conectadas a `/applications`). El backend
(`src/routes/applications.js`) ya estaba correcto.

### 4. Aprobar una solicitud no actualizaba el rol en BD
**Causa:** consecuencia directa del punto 3 — nunca llegaba ninguna
solicitud real al backend para aprobar. Una vez conectado el punto 3,
este problema queda resuelto automáticamente (la ruta backend ya hacía
`UPDATE usuarios SET rol = 'ADMIN'` correctamente).
**Archivos:** ninguno adicional; se simplificó `resolveAdminRequest` en
`index.html` (ya no necesita el truco de buscar por correo entre frontend
y backend, porque ahora comparten el mismo `usuarioId`).

### 5. Vacantes visibles para todos los usuarios
**Causa:** la tabla `vacantes` no tenía columna `usuario_id`; `GET /jobs`
devolvía todas las filas sin filtrar.
**Cambios SQL necesarios:** ejecutar `sql/migration_usuario_id.sql` sobre
tu base de datos existente (agrega `usuario_id` + FK a `usuarios`).
**Archivos backend:** `src/db/repositories/vacantesRepo.js` (acepta
`usuarioId` para filtrar en `findAll`, `count`, `countByEstado`,
`empresaConMasVacantes`, `ultimaCreada`), `src/db/repositories/seguimientosRepo.js`
(`findAll` ahora hace `JOIN` con `vacantes` para filtrar por dueño),
`src/routes/jobs.js` (filtra por usuario, exige `usuarioId` al crear,
valida propiedad en editar/eliminar/seguimientos), `src/routes/seguimientos.js`
(filtra y valida propiedad), `src/routes/stats.js` (las métricas de
vacantes ahora son por usuario; `totalUsuarios` se mantiene global),
`src/utils/helpers.js` (nueva función `getCurrentUserId`).
**Archivos frontend:** `index.html` (`fetchJSON` envía automáticamente el
header `x-user-id` con `state.currentUser.id` en cada petición).

### 6. Faltaba cambio de contraseña en Perfil
**Archivos backend:** `src/routes/users.js` (nuevo endpoint
`PUT /users/:id/password`).
**Archivos frontend:** `index.html` (nuevo panel "Cambiar contraseña" en
la sección Perfil + función `api.changePassword`).

### Resumen de archivos modificados

Backend: `src/utils/helpers.js`, `src/db/repositories/vacantesRepo.js`,
`src/db/repositories/seguimientosRepo.js`, `src/routes/jobs.js`,
`src/routes/seguimientos.js`, `src/routes/stats.js`, `src/routes/users.js`,
`sql/schema.sql` (actualizado), `sql/migration_usuario_id.sql` (nuevo).

Frontend: `index.html` (capa `api` completa conectada al backend real;
`renderAll`/`navigateTo`/`renderPerfil` ahora recargan seguimientos y
solicitudes; nuevo panel de cambio de contraseña; limpieza de
`state.usuarios`, seeds y contadores locales que ya no se usaban).

**No se requieren cambios SQL adicionales más allá de
`sql/migration_usuario_id.sql`** (o usar `sql/schema.sql` si creas la base
de datos desde cero).

