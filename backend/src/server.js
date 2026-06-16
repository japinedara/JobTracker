/* =====================================================================
   SERVIDOR JOBTRACKER — Node.js + Express (datos en memoria)
   ---------------------------------------------------------------------
   Backend diseñado para conectarse directamente con el frontend
   JobTracker (index.html) mediante fetch() desde localhost.

   Ejecutar:
     npm install
     npm start

   El servidor corre por defecto en http://localhost:3000
   ===================================================================== */
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const jobsRoutes = require('./routes/jobs');
const seguimientosRoutes = require('./routes/seguimientos');
const applicationsRoutes = require('./routes/applications');
const activityRoutes = require('./routes/activity');
const statsRoutes = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// MIDDLEWARES GLOBALES
// ---------------------------------------------------------------------
app.use(cors()); // Habilita peticiones desde el frontend (otro origen/puerto)
app.use(express.json()); // Parseo de bodies JSON

// Log simple de peticiones (útil para depurar durante el desarrollo)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// ---------------------------------------------------------------------
// RUTAS
// ---------------------------------------------------------------------
// Autenticación: /api/auth/login, /register, /logout
app.use('/api/auth', authRoutes);

// Usuarios (CRUD + perfil): /users
app.use('/users', usersRoutes);

// Vacantes (CRUD + seguimientos por vacante): /jobs
app.use('/jobs', jobsRoutes);

// Seguimientos (vista general): /seguimientos
app.use('/seguimientos', seguimientosRoutes);

// Solicitudes de rol Administrador: /applications
app.use('/applications', applicationsRoutes);

// Actividad reciente: /activity
app.use('/activity', activityRoutes);

// Estadísticas para el Dashboard: /stats
app.use('/stats', statsRoutes);

// ---------------------------------------------------------------------
// RUTA RAÍZ / HEALTHCHECK
// ---------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    name: 'JobTracker API',
    status: 'ok',
    endpoints: [
      'POST   /api/auth/login',
      'POST   /api/auth/register',
      'POST   /api/auth/logout',
      'GET    /users',
      'POST   /users',
      'PUT    /users/:id',
      'DELETE /users/:id',
      'GET    /users/:id/profile',
      'PUT    /users/:id/profile',
      'GET    /jobs',
      'POST   /jobs',
      'PUT    /jobs/:id',
      'DELETE /jobs/:id',
      'GET    /jobs/:id/seguimientos',
      'POST   /jobs/:id/seguimientos',
      'GET    /seguimientos',
      'POST   /seguimientos',
      'GET    /applications',
      'POST   /applications',
      'PUT    /applications/:id',
      'GET    /activity',
      'GET    /stats'
    ]
  });
});

// ---------------------------------------------------------------------
// MANEJO DE RUTAS NO ENCONTRADAS
// ---------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ---------------------------------------------------------------------
// MANEJO DE ERRORES
// ---------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ---------------------------------------------------------------------
// INICIO DEL SERVIDOR
// ---------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`JobTracker API escuchando en http://localhost:${PORT}`);
});
