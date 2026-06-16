/* =====================================================================
   RUTAS DE AUTENTICACIÓN
   ---------------------------------------------------------------------
   POST /api/auth/login
   POST /api/auth/register
   POST /api/auth/logout
   ===================================================================== */
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { stripPassword } = require('../utils/helpers');

// --- POST /api/auth/login ---
router.post('/login', (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }

  const user = store.usuarios.find(
    u => u.correo.toLowerCase() === String(correo).toLowerCase() && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }

  // Token simulado (en un backend real se firmaría con JWT + clave secreta)
  const token = `fake-jwt-token.${user.id}.${Date.now()}`;

  res.json({ token, user: stripPassword(user) });
});

// --- POST /api/auth/register ---
router.post('/register', (req, res) => {
  const { nombre, apellidos, correo, password } = req.body;

  if (!nombre || !apellidos || !correo || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  const existe = store.usuarios.find(u => u.correo.toLowerCase() === String(correo).toLowerCase());
  if (existe) {
    return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo.' });
  }

  const nuevo = {
    id: store.getNextUsuarioId(),
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
  };

  store.usuarios.push(nuevo);
  store.logActivity('usuario_registrado', `Nuevo usuario registrado: ${nuevo.nombre} ${nuevo.apellidos}`, 'info');

  res.status(201).json(stripPassword(nuevo));
});

// --- POST /api/auth/logout ---
// Con JWT, normalmente el cliente simplemente descarta el token.
// Este endpoint existe para mantener la simetría con el frontend.
router.post('/logout', (req, res) => {
  res.json({ success: true });
});

module.exports = router;
