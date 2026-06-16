# JobTracker API (Backend)

Backend en **Node.js + Express + MySQL** (vía `mysql2`), diseñado para
conectarse directamente con el frontend de JobTracker (`index.html`)
mediante `fetch()`.

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

### Vacantes (`/jobs`)

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

