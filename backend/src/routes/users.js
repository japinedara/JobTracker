/* =====================================================================
   RUTAS DE USUARIOS
   ---------------------------------------------------------------------
   GET    /users           -> lista de usuarios (sin password)
   POST   /users            -> crear usuario (uso ADMIN)
   PUT    /users/:id         -> editar usuario
   DELETE /users/:id          -> eliminar usuario

   GET    /users/:id/profile -> obtener perfil de un usuario específico
   PUT    /users/:id/profile -> actualizar perfil (campos personales)

   En un backend real, estas rutas estarían protegidas por un
   middleware de autenticación (JWT) y autorización (rol ADMIN para
   crear/editar/eliminar usuarios de terceros).
   ===================================================================== */
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { stripPassword } = require('../utils/helpers');

// --- GET /users ---
// Lista de usuarios del sistema (tabla de Usuarios, solo ADMIN en el frontend)
router.get('/', (req, res) => {
  res.json(store.usuarios.map(stripPassword));
});

// --- POST /users ---
// Crea un usuario directamente desde el panel de administración
router.post('/', (req, res) => {
  const { nombre, apellidos, correo, password, rol, telefono, ciudad, linkedin, github } = req.body;

  if (!nombre || !correo) {
    return res.status(400).json({ error: 'Nombre y correo son obligatorios.' });
  }

  const existe = store.usuarios.find(u => u.correo.toLowerCase() === String(correo).toLowerCase());
  if (existe) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
  }

  const nuevo = {
    id: store.getNextUsuarioId(),
    nombre,
    apellidos: apellidos || '',
    correo,
    password: password || 'changeme123',
    // El frontend solo permite ADMIN o USER
    rol: rol === 'ADMIN' ? 'ADMIN' : 'USER',
    estadoVerificacion: 'pendiente_verificacion',
    telefono: telefono || '',
    ciudad: ciudad || '',
    linkedin: linkedin || '',
    github: github || ''
  };

  store.usuarios.push(nuevo);
  store.logActivity('usuario_registrado', `Nuevo usuario registrado: ${nuevo.nombre} ${nuevo.apellidos}`, 'info');

  res.status(201).json(stripPassword(nuevo));
});

// --- PUT /users/:id ---
// Edita un usuario existente (usado por el panel de Usuarios)
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = store.usuarios.findIndex(u => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const { nombre, apellidos, correo, password, rol, estadoVerificacion, telefono, ciudad, linkedin, github } = req.body;
  const actual = store.usuarios[idx];

  store.usuarios[idx] = {
    ...actual,
    nombre: nombre !== undefined ? nombre : actual.nombre,
    apellidos: apellidos !== undefined ? apellidos : actual.apellidos,
    correo: correo !== undefined ? correo : actual.correo,
    password: password !== undefined ? password : actual.password,
    // Solo ADMIN o USER son roles válidos
    rol: rol === 'ADMIN' || rol === 'USER' ? rol : actual.rol,
    estadoVerificacion: estadoVerificacion !== undefined ? estadoVerificacion : actual.estadoVerificacion,
    telefono: telefono !== undefined ? telefono : actual.telefono,
    ciudad: ciudad !== undefined ? ciudad : actual.ciudad,
    linkedin: linkedin !== undefined ? linkedin : actual.linkedin,
    github: github !== undefined ? github : actual.github
  };

  res.json(stripPassword(store.usuarios[idx]));
});

// --- DELETE /users/:id ---
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = store.usuarios.findIndex(u => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  store.usuarios.splice(idx, 1);
  res.json({ success: true });
});

// --- GET /users/:id/profile ---
// Devuelve el perfil de un usuario específico (sin contraseña)
router.get('/:id/profile', (req, res) => {
  const id = Number(req.params.id);
  const user = store.usuarios.find(u => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  res.json(stripPassword(user));
});

// --- PUT /users/:id/profile ---
// Actualiza únicamente los campos personales editables desde la
// sección "Perfil" del frontend. "rol" y "estadoVerificacion" se
// ignoran aunque vengan en el payload.
router.put('/:id/profile', (req, res) => {
  const id = Number(req.params.id);
  const idx = store.usuarios.findIndex(u => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  const { nombre, apellidos, correo, telefono, ciudad, linkedin, github } = req.body;
  const actual = store.usuarios[idx];

  store.usuarios[idx] = {
    ...actual,
    nombre: nombre !== undefined ? nombre : actual.nombre,
    apellidos: apellidos !== undefined ? apellidos : actual.apellidos,
    correo: correo !== undefined ? correo : actual.correo,
    telefono: telefono !== undefined ? telefono : actual.telefono,
    ciudad: ciudad !== undefined ? ciudad : actual.ciudad,
    linkedin: linkedin !== undefined ? linkedin : actual.linkedin,
    github: github !== undefined ? github : actual.github
    // rol y estadoVerificacion NO se modifican aquí
  };

  res.json(stripPassword(store.usuarios[idx]));
});

module.exports = router;
