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

   MIGRACIÓN A MYSQL: reemplaza store.adminRequests y la promoción de
   rol sobre store.usuarios por consultas SQL contra las tablas
   `solicitudes_admin` y `usuarios` mediante solicitudesRepo /
   usuariosRepo. El mismo sistema de roles ADMIN/USER se conserva
   exactamente igual.
   ===================================================================== */
const express = require('express');
const router = express.Router();
const solicitudesRepo = require('../db/repositories/solicitudesRepo');
const usuariosRepo = require('../db/repositories/usuariosRepo');
const actividadRepo = require('../db/repositories/actividadRepo');
const { todayISO } = require('../utils/helpers');

// --- GET /applications ---
router.get('/', async (req, res, next) => {
  try {
    const lista = await solicitudesRepo.findAll();
    res.json(lista);
  } catch (err) {
    next(err);
  }
});

// --- POST /applications ---
// Crea una solicitud de rol Administrador para un usuario.
// Espera { usuarioId } en el body (el frontend lo toma de la sesión actual).
router.post('/', async (req, res, next) => {
  try {
    const { usuarioId } = req.body;

    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es obligatorio.' });
    }

    const usuario = await usuariosRepo.findById(Number(usuarioId));
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Evita duplicar solicitudes pendientes para el mismo usuario
    const yaExiste = await solicitudesRepo.findPendienteByUsuarioId(usuario.id);
    if (yaExiste) {
      return res.status(409).json({ error: 'Ya tienes una solicitud pendiente.' });
    }

    const nueva = await solicitudesRepo.create({
      usuarioId: usuario.id,
      nombre: `${usuario.nombre} ${usuario.apellidos}`.trim(),
      correo: usuario.correo,
      fecha: todayISO(),
      estado: 'PENDIENTE'
    });

    await actividadRepo.log('solicitud_enviada', `Solicitud de rol Administrador enviada por ${nueva.nombre}`, 'warning');

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
});

// --- PUT /applications/:id ---
// Resuelve una solicitud: { estado: 'APROBADA' | 'RECHAZADA' }
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;

    if (estado !== 'APROBADA' && estado !== 'RECHAZADA') {
      return res.status(400).json({ error: "estado debe ser 'APROBADA' o 'RECHAZADA'." });
    }

    const solicitud = await solicitudesRepo.findById(id);
    if (!solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const actualizada = await solicitudesRepo.updateEstado(id, estado);

    if (estado === 'APROBADA') {
      await actividadRepo.log('solicitud_aprobada', `Solicitud de Administrador aprobada para ${actualizada.nombre}`, 'success');

      // El usuario solicitante pasa a ser ADMIN
      await usuariosRepo.update(actualizada.usuarioId, { rol: 'ADMIN' });
    } else {
      await actividadRepo.log('solicitud_rechazada', `Solicitud de Administrador rechazada para ${actualizada.nombre}`, 'danger');
    }

    res.json(actualizada);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
