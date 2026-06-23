/* =====================================================================
   RUTAS DE SEGUIMIENTOS (vista general)
   ---------------------------------------------------------------------
   GET  /seguimientos       -> historial completo DEL USUARIO ACTUAL
   POST /seguimientos        -> crear seguimiento (requiere vacanteId)

   El frontend usa esta ruta para la sección "Seguimientos", que
   muestra el historial completo independientemente de la vacante.
   Para seguimientos de una vacante específica, ver /jobs/:id/seguimientos.

   CORRECCIÓN DE BUG (seguimientos visibles entre usuarios / no se
   guardaban): la tabla `seguimientos` no tiene usuario_id propio,
   pero cada seguimiento pertenece a una vacante que sí lo tiene.
   GET /seguimientos ahora filtra por dueño mediante un JOIN con
   `vacantes` (ver seguimientosRepo.findAll). POST /seguimientos
   ahora valida que la vacante referenciada pertenezca al usuario
   actual antes de crear el seguimiento (403 si no le pertenece).
   ===================================================================== */
const express = require('express');
const router = express.Router();
const seguimientosRepo = require('../db/repositories/seguimientosRepo');
const vacantesRepo = require('../db/repositories/vacantesRepo');
const { todayISO, getCurrentUserId } = require('../utils/helpers');

// --- GET /seguimientos ---
router.get('/', async (req, res, next) => {
  try {
    const usuarioId = getCurrentUserId(req);
    const lista = await seguimientosRepo.findAll(usuarioId);
    res.json(lista);
  } catch (err) {
    next(err);
  }
});

// --- POST /seguimientos ---
router.post('/', async (req, res, next) => {
  try {
    const { vacanteId, fecha, tipo, descripcion } = req.body;

    if (!vacanteId) {
      return res.status(400).json({ error: 'vacanteId es obligatorio.' });
    }

    const vacante = await vacantesRepo.findById(Number(vacanteId));
    if (!vacante) {
      return res.status(404).json({ error: 'Vacante no encontrada.' });
    }

    const usuarioId = getCurrentUserId(req);
    if (usuarioId && vacante.usuarioId !== usuarioId) {
      return res.status(403).json({ error: 'Esta vacante no te pertenece.' });
    }

    const nuevo = await seguimientosRepo.create({
      vacanteId: Number(vacanteId),
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
