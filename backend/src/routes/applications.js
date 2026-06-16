/* =====================================================================
   RUTAS DE SOLICITUDES (APPLICATIONS / ADMIN REQUESTS)
   ---------------------------------------------------------------------
   GET  /applications          -> lista de solicitudes de rol Administrador
   POST /applications           -> crear una solicitud (usuario actual)
   PUT  /applications/:id         -> resolver solicitud (APROBADA / RECHAZADA)

   Corresponde a la sección "Solicitudes de rol Administrador" del
   panel de Usuarios (solo ADMIN) y al botón "Solicitar rol
   Administrador" en Perfil.

   Estados posibles: PENDIENTE, APROBADA, RECHAZADA.
   Al aprobar, el usuario solicitante pasa a rol ADMIN.
   ===================================================================== */
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { todayISO } = require('../utils/helpers');

// --- GET /applications ---
router.get('/', (req, res) => {
  res.json(store.adminRequests);
});

// --- POST /applications ---
// Crea una solicitud de rol Administrador para un usuario.
// Espera { usuarioId } en el body (el frontend lo toma de la sesión actual).
router.post('/', (req, res) => {
  const { usuarioId } = req.body;

  if (!usuarioId) {
    return res.status(400).json({ error: 'usuarioId es obligatorio.' });
  }

  const usuario = store.usuarios.find(u => u.id === Number(usuarioId));
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }

  // Evita duplicar solicitudes pendientes para el mismo usuario
  const yaExiste = store.adminRequests.find(
    r => r.usuarioId === usuario.id && r.estado === 'PENDIENTE'
  );
  if (yaExiste) {
    return res.status(409).json({ error: 'Ya tienes una solicitud pendiente.' });
  }

  const nueva = {
    id: store.getNextAdminRequestId(),
    usuarioId: usuario.id,
    nombre: `${usuario.nombre} ${usuario.apellidos}`.trim(),
    correo: usuario.correo,
    fecha: todayISO(),
    estado: 'PENDIENTE'
  };

  store.adminRequests.push(nueva);
  store.logActivity('solicitud_enviada', `Solicitud de rol Administrador enviada por ${nueva.nombre}`, 'warning');

  res.status(201).json(nueva);
});

// --- PUT /applications/:id ---
// Resuelve una solicitud: { estado: 'APROBADA' | 'RECHAZADA' }
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body;

  if (estado !== 'APROBADA' && estado !== 'RECHAZADA') {
    return res.status(400).json({ error: "estado debe ser 'APROBADA' o 'RECHAZADA'." });
  }

  const idx = store.adminRequests.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Solicitud no encontrada.' });
  }

  store.adminRequests[idx].estado = estado;

  if (estado === 'APROBADA') {
    store.logActivity('solicitud_aprobada', `Solicitud de Administrador aprobada para ${store.adminRequests[idx].nombre}`, 'success');

    // El usuario solicitante pasa a ser ADMIN
    const usuarioIdx = store.usuarios.findIndex(u => u.id === store.adminRequests[idx].usuarioId);
    if (usuarioIdx !== -1) {
      store.usuarios[usuarioIdx].rol = 'ADMIN';
    }
  } else {
    store.logActivity('solicitud_rechazada', `Solicitud de Administrador rechazada para ${store.adminRequests[idx].nombre}`, 'danger');
  }

  res.json(store.adminRequests[idx]);
});

module.exports = router;
