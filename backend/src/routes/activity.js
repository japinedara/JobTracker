/* =====================================================================
   RUTAS DE ACTIVIDAD RECIENTE
   ---------------------------------------------------------------------
   GET /activity -> últimos 10 eventos registrados (más recientes primero)

   Los eventos se generan automáticamente desde otras rutas mediante
   actividadRepo.log(), cada vez que ocurre una acción real:
     - vacante_creada / vacante_editada / vacante_eliminada
     - estado_cambiado
     - usuario_registrado
     - solicitud_enviada / solicitud_aprobada / solicitud_rechazada

   MIGRACIÓN A MYSQL: reemplaza store.actividad por una consulta SQL
   contra la tabla `actividad` mediante actividadRepo.findRecent().
   ===================================================================== */
const express = require('express');
const router = express.Router();
const actividadRepo = require('../db/repositories/actividadRepo');

// --- GET /activity ---
router.get('/', async (req, res, next) => {
  try {
    const eventos = await actividadRepo.findRecent(10);
    res.json(eventos);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
