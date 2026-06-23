/* =====================================================================
   RUTAS DE VACANTES (JOBS)
   ---------------------------------------------------------------------
   GET    /jobs        -> lista de vacantes DEL USUARIO ACTUAL
   POST   /jobs         -> crear vacante (queda asociada al usuario actual)
   PUT    /jobs/:id      -> editar vacante (incluye cambios de estado)
   DELETE /jobs/:id       -> eliminar vacante (y sus seguimientos)

   GET    /jobs/:id/seguimientos -> historial de seguimientos de una vacante
   POST   /jobs/:id/seguimientos -> registrar un nuevo seguimiento

   CORRECCIÓN DE BUG (vacantes visibles para todos los usuarios):
   Cada vacante pertenece a un usuario (columna usuario_id en la
   tabla `vacantes`, ver sql/migration_usuario_id.sql). El usuario
   actual se identifica mediante getCurrentUserId(req), que lee el
   header `x-user-id` enviado por el frontend (con sus alternativas
   por query/body) — ver utils/helpers.js para más detalle.

   - GET /jobs: si se identifica al usuario, solo devuelve SUS
     vacantes. Si no se envía ningún identificador (compatibilidad
     hacia atrás), devuelve todas, igual que antes de esta corrección.
   - POST /jobs: requiere identificar al usuario; la vacante se crea
     con ese usuario como dueño.
   - PUT/DELETE /jobs/:id y las rutas de seguimientos por vacante:
     si se identifica al usuario, se verifica que la vacante le
     pertenezca antes de permitir la operación (403 si no le pertenece).
   ===================================================================== */
const express = require('express');
const router = express.Router();
const vacantesRepo = require('../db/repositories/vacantesRepo');
const seguimientosRepo = require('../db/repositories/seguimientosRepo');
const actividadRepo = require('../db/repositories/actividadRepo');
const { todayISO, getCurrentUserId } = require('../utils/helpers');

// --- GET /jobs ---
router.get('/', async (req, res, next) => {
  try {
    const usuarioId = getCurrentUserId(req);
    const vacantes = await vacantesRepo.findAll(usuarioId);
    res.json(vacantes);
  } catch (err) {
    next(err);
  }
});

// --- POST /jobs ---
router.post('/', async (req, res, next) => {
  try {
    const usuarioId = getCurrentUserId(req);
    if (!usuarioId) {
      return res.status(401).json({ error: 'No se pudo identificar al usuario actual (falta x-user-id).' });
    }

    const { empresa, cargo, salario, ciudad, estado, fechaCreacion } = req.body;

    if (!empresa || !cargo || !ciudad) {
      return res.status(400).json({ error: 'Empresa, cargo y ciudad son obligatorios.' });
    }

    const nueva = await vacantesRepo.create({
      usuarioId,
      empresa,
      cargo,
      salario: salario || '',
      ciudad,
      estado: estado || 'Aplicada',
      fechaCreacion: fechaCreacion || todayISO()
    });

    await actividadRepo.log('vacante_creada', `Vacante creada: ${nueva.cargo} en ${nueva.empresa}`, 'success');

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
});

// --- PUT /jobs/:id ---
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const anterior = await vacantesRepo.findById(id);

    if (!anterior) {
      return res.status(404).json({ error: 'Vacante no encontrada.' });
    }

    const usuarioId = getCurrentUserId(req);
    if (usuarioId && anterior.usuarioId !== usuarioId) {
      return res.status(403).json({ error: 'Esta vacante no te pertenece.' });
    }

    const { estado } = req.body;
    const actualizada = await vacantesRepo.update(id, req.body);

    const estadoCambio = estado !== undefined && estado !== anterior.estado;

    if (estadoCambio) {
      await actividadRepo.log(
        'estado_cambiado',
        `Estado actualizado: ${anterior.cargo} en ${anterior.empresa} → ${estado}`,
        'info'
      );
    } else {
      await actividadRepo.log(
        'vacante_editada',
        `Vacante editada: ${actualizada.cargo} en ${actualizada.empresa}`,
        'accent'
      );
    }

    res.json(actualizada);
  } catch (err) {
    next(err);
  }
});

// --- DELETE /jobs/:id ---
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const vacante = await vacantesRepo.findById(id);

    if (!vacante) {
      return res.status(404).json({ error: 'Vacante no encontrada.' });
    }

    const usuarioId = getCurrentUserId(req);
    if (usuarioId && vacante.usuarioId !== usuarioId) {
      return res.status(403).json({ error: 'Esta vacante no te pertenece.' });
    }

    // Elimina también los seguimientos asociados a esta vacante.
    // Si tu tabla `seguimientos` ya tiene ON DELETE CASCADE en la FK,
    // esta línea es redundante pero inofensiva; si no la tiene, es
    // necesaria para mantener el mismo comportamiento que la versión
    // en memoria.
    await seguimientosRepo.removeByVacanteId(id);

    await vacantesRepo.remove(id);

    await actividadRepo.log('vacante_eliminada', `Vacante eliminada: ${vacante.cargo} en ${vacante.empresa}`, 'danger');

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- GET /jobs/:id/seguimientos ---
router.get('/:id/seguimientos', async (req, res, next) => {
  try {
    const vacanteId = Number(req.params.id);
    const vacante = await vacantesRepo.findById(vacanteId);

    if (!vacante) {
      return res.status(404).json({ error: 'Vacante no encontrada.' });
    }

    const usuarioId = getCurrentUserId(req);
    if (usuarioId && vacante.usuarioId !== usuarioId) {
      return res.status(403).json({ error: 'Esta vacante no te pertenece.' });
    }

    const lista = await seguimientosRepo.findByVacanteId(vacanteId);
    res.json(lista);
  } catch (err) {
    next(err);
  }
});

// --- POST /jobs/:id/seguimientos ---
router.post('/:id/seguimientos', async (req, res, next) => {
  try {
    const vacanteId = Number(req.params.id);
    const vacante = await vacantesRepo.findById(vacanteId);

    if (!vacante) {
      return res.status(404).json({ error: 'Vacante no encontrada.' });
    }

    const usuarioId = getCurrentUserId(req);
    if (usuarioId && vacante.usuarioId !== usuarioId) {
      return res.status(403).json({ error: 'Esta vacante no te pertenece.' });
    }

    const { fecha, tipo, descripcion } = req.body;

    const nuevo = await seguimientosRepo.create({
      vacanteId,
      fecha: fecha || todayISO(),
      tipo: tipo || 'Otro',
      descripcion: descripcion || ''
    });

    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
