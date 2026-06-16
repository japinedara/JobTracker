/* =====================================================================
   RUTAS DE VACANTES (JOBS)
   ---------------------------------------------------------------------
   GET    /jobs        -> lista de vacantes
   POST   /jobs         -> crear vacante
   PUT    /jobs/:id      -> editar vacante (incluye cambios de estado)
   DELETE /jobs/:id       -> eliminar vacante (y sus seguimientos)

   GET    /jobs/:id/seguimientos -> historial de seguimientos de una vacante
   POST   /jobs/:id/seguimientos -> registrar un nuevo seguimiento

   MIGRACIÓN A MYSQL: las operaciones que antes mutaban store.vacantes
   y store.seguimientos ahora se ejecutan contra las tablas `vacantes`
   y `seguimientos` mediante vacantesRepo / seguimientosRepo. Cada
   operación de creación/edición/eliminación o cambio de estado sigue
   registrando un evento en la tabla `actividad` (actividadRepo),
   igual que en la versión en memoria.
   ===================================================================== */
const express = require('express');
const router = express.Router();
const vacantesRepo = require('../db/repositories/vacantesRepo');
const seguimientosRepo = require('../db/repositories/seguimientosRepo');
const actividadRepo = require('../db/repositories/actividadRepo');
const { todayISO } = require('../utils/helpers');

// --- GET /jobs ---
router.get('/', async (req, res, next) => {
  try {
    const vacantes = await vacantesRepo.findAll();
    res.json(vacantes);
  } catch (err) {
    next(err);
  }
});

// --- POST /jobs ---
router.post('/', async (req, res, next) => {
  try {
    const { empresa, cargo, salario, ciudad, estado, fechaCreacion } = req.body;

    if (!empresa || !cargo || !ciudad) {
      return res.status(400).json({ error: 'Empresa, cargo y ciudad son obligatorios.' });
    }

    const nueva = await vacantesRepo.create({
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
