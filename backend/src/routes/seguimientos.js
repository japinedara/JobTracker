/* =====================================================================
   RUTAS DE SEGUIMIENTOS (vista general)
   ---------------------------------------------------------------------
   GET  /seguimientos       -> historial completo (todas las vacantes)
   POST /seguimientos        -> crear seguimiento (requiere vacanteId)

   El frontend usa esta ruta para la sección "Seguimientos", que
   muestra el historial completo independientemente de la vacante.
   Para seguimientos de una vacante específica, ver /jobs/:id/seguimientos.

   MIGRACIÓN A MYSQL: reemplaza store.seguimientos por consultas SQL
   contra la tabla `seguimientos` mediante seguimientosRepo.
   ===================================================================== */
const express = require('express');
const router = express.Router();
const seguimientosRepo = require('../db/repositories/seguimientosRepo');
const vacantesRepo = require('../db/repositories/vacantesRepo');
const { todayISO } = require('../utils/helpers');

// --- GET /seguimientos ---
router.get('/', async (req, res, next) => {
  try {
    const lista = await seguimientosRepo.findAll();
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
