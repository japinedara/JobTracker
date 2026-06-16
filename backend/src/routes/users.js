/* =====================================================================
   RUTAS DE USUARIOS
   ---------------------------------------------------------------------
   GET    /users           -> lista de usuarios (sin password)
   POST   /users            -> crear usuario (uso ADMIN)
   PUT    /users/:id         -> editar usuario
   DELETE /users/:id          -> eliminar usuario

   GET    /users/:id/profile -> obtener perfil de un usuario específico
   PUT    /users/:id/profile -> actualizar perfil (campos personales)

   MIGRACIÓN A MYSQL: todas las operaciones que antes mutaban el
   arreglo store.usuarios ahora se ejecutan contra la tabla `usuarios`
   mediante usuariosRepo (SELECT/INSERT/UPDATE/DELETE). Las respuestas
   JSON mantienen exactamente el mismo shape que antes.

   En un backend real, estas rutas estarían protegidas por un
   middleware de autenticación (JWT) y autorización (rol ADMIN para
   crear/editar/eliminar usuarios de terceros).
   ===================================================================== */
const express = require('express');
const router = express.Router();
const usuariosRepo = require('../db/repositories/usuariosRepo');
const actividadRepo = require('../db/repositories/actividadRepo');
const { stripPassword } = require('../utils/helpers');

// --- GET /users ---
// Lista de usuarios del sistema (tabla de Usuarios, solo ADMIN en el frontend)
router.get('/', async (req, res, next) => {
  try {
    const usuarios = await usuariosRepo.findAll();
    res.json(usuarios.map(stripPassword));
  } catch (err) {
    next(err);
  }
});

// --- POST /users ---
// Crea un usuario directamente desde el panel de administración
router.post('/', async (req, res, next) => {
  try {
    const { nombre, apellidos, correo, password, rol, telefono, ciudad, linkedin, github } = req.body;

    if (!nombre || !correo) {
      return res.status(400).json({ error: 'Nombre y correo son obligatorios.' });
    }

    const existe = await usuariosRepo.findByEmail(correo);
    if (existe) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
    }

    const nuevo = await usuariosRepo.create({
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
    });

    await actividadRepo.log('usuario_registrado', `Nuevo usuario registrado: ${nuevo.nombre} ${nuevo.apellidos}`, 'info');

    res.status(201).json(stripPassword(nuevo));
  } catch (err) {
    next(err);
  }
});

// --- PUT /users/:id ---
// Edita un usuario existente (usado por el panel de Usuarios)
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const actual = await usuariosRepo.findById(id);

    if (!actual) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const actualizado = await usuariosRepo.update(id, req.body);
    res.json(stripPassword(actualizado));
  } catch (err) {
    next(err);
  }
});

// --- DELETE /users/:id ---
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const eliminado = await usuariosRepo.remove(id);

    if (!eliminado) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- GET /users/:id/profile ---
// Devuelve el perfil de un usuario específico (sin contraseña)
router.get('/:id/profile', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = await usuariosRepo.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(stripPassword(user));
  } catch (err) {
    next(err);
  }
});

// --- PUT /users/:id/profile ---
// Actualiza únicamente los campos personales editables desde la
// sección "Perfil" del frontend. "rol" y "estadoVerificacion" se
// ignoran aunque vengan en el payload.
router.put('/:id/profile', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const actual = await usuariosRepo.findById(id);

    if (!actual) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { nombre, apellidos, correo, telefono, ciudad, linkedin, github } = req.body;

    // rol y estadoVerificacion NO se modifican aquí: se omiten a
    // propósito del objeto que se envía al repositorio.
    const actualizado = await usuariosRepo.update(id, {
      nombre, apellidos, correo, telefono, ciudad, linkedin, github
    });

    res.json(stripPassword(actualizado));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
