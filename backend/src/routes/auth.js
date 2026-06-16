/* =====================================================================
   RUTAS DE AUTENTICACIÓN
   ---------------------------------------------------------------------
   POST /api/auth/login
   POST /api/auth/register
   POST /api/auth/logout

   MIGRACIÓN A MYSQL: las búsquedas y la creación de usuarios ya no
   usan store.usuarios (en memoria); ahora consultan la tabla
   `usuarios` a través de usuariosRepo y registran actividad en la
   tabla `actividad` a través de actividadRepo. Las respuestas JSON
   mantienen exactamente el mismo shape que antes.
   ===================================================================== */
const express = require('express');
const router = express.Router();
const usuariosRepo = require('../db/repositories/usuariosRepo');
const actividadRepo = require('../db/repositories/actividadRepo');
const { stripPassword } = require('../utils/helpers');

// --- POST /api/auth/login ---
router.post('/login', async (req, res, next) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }

    const user = await usuariosRepo.findByEmail(correo);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    // Token simulado (en un backend real se firmaría con JWT + clave secreta)
    const token = `fake-jwt-token.${user.id}.${Date.now()}`;

    res.json({ token, user: stripPassword(user) });
  } catch (err) {
    next(err);
  }
});

// --- POST /api/auth/register ---
router.post('/register', async (req, res, next) => {
  try {
    const { nombre, apellidos, correo, password } = req.body;

    if (!nombre || !apellidos || !correo || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
    }

    const existe = await usuariosRepo.findByEmail(correo);
    if (existe) {
      return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo.' });
    }

    const nuevo = await usuariosRepo.create({
      nombre,
      apellidos,
      correo,
      password,
      // Todo registro nuevo entra como USER (nunca ADMIN directo)
      rol: 'USER',
      // Estructura preparada para futura verificación de correo
      estadoVerificacion: 'pendiente_verificacion',
      telefono: '',
      ciudad: '',
      linkedin: '',
      github: ''
    });

    await actividadRepo.log('usuario_registrado', `Nuevo usuario registrado: ${nuevo.nombre} ${nuevo.apellidos}`, 'info');

    res.status(201).json(stripPassword(nuevo));
  } catch (err) {
    next(err);
  }
});

// --- POST /api/auth/logout ---
// Con JWT, normalmente el cliente simplemente descarta el token.
// Este endpoint existe para mantener la simetría con el frontend.
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
