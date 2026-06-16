# JobTracker API (Backend)

Backend en **Node.js + Express** con datos en memoria, diseñado para
conectarse directamente con el frontend de JobTracker (`index.html`)
mediante `fetch()`.

## Instalación y ejecución

```bash
cd jobtracker-backend
npm install
npm start
```

El servidor queda disponible en:

```
http://localhost:3000
```

CORS está habilitado para que el frontend (servido desde cualquier
origen, incluyendo `file://` o `http://localhost:5500`, etc.) pueda
consumir la API sin restricciones.

> Los datos viven en memoria. Al reiniciar el servidor, se recargan
> los datos de ejemplo (seed): 2 usuarios, 5 vacantes y 4 seguimientos.

---

## Usuarios de prueba (seed)

| Correo                          | Contraseña | Rol   |
|----------------------------------|------------|-------|
| laura.gomez@jobtracker.com        | admin123   | ADMIN |
| mariana.rios@jobtracker.com       | user123    | USER  |

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

Ejemplo de respuesta de `/stats`:

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

En `index.html`, reemplaza las funciones de la capa `api` para usar
`fetch` contra `http://localhost:3000`. Ejemplos:

```javascript
const API_URL = 'http://localhost:3000';

const api = {
  login(correo, password) {
    return fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, password })
    }).then(res => {
      if (!res.ok) return res.json().then(e => Promise.reject(new Error(e.error)));
      return res.json();
    });
  },

  getVacantes() {
    return fetch(`${API_URL}/jobs`).then(res => res.json());
  },

  createVacante(data) {
    return fetch(`${API_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json());
  },

  // ... mismo patrón para updateVacante (PUT /jobs/:id),
  // deleteVacante (DELETE /jobs/:id), getUsuarios (/users),
  // getSeguimientos (/seguimientos), createAdminRequest (/applications),
  // getDashboardStats (/stats), etc.
};
```

## Estructura del proyecto

```
jobtracker-backend/
├── package.json
└── src/
    ├── server.js          # Punto de entrada, monta todas las rutas
    ├── data/
    │   └── store.js        # "Base de datos" en memoria + seed + actividad
    ├── utils/
    │   └── helpers.js       # stripPassword, todayISO
    └── routes/
        ├── auth.js           # /api/auth/login, register, logout
        ├── users.js           # /users
        ├── jobs.js             # /jobs (+ /jobs/:id/seguimientos)
        ├── seguimientos.js      # /seguimientos
        ├── applications.js       # /applications
        ├── activity.js            # /activity
        └── stats.js                # /stats
```
