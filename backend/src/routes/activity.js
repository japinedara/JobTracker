/* =====================================================================
   RUTAS DE ACTIVIDAD RECIENTE
   ---------------------------------------------------------------------
   GET /activity -> últimos 10 eventos registrados (más recientes primero)

   Los eventos se generan automáticamente desde otras rutas mediante
   store.logActivity(), cada vez que ocurre una acción real:
     - vacante_creada / vacante_editada / vacante_eliminada
     - estado_cambiado
     - usuario_registrado
     - solicitud_enviada / solicitud_aprobada / solicitud_rechazada
   ===================================================================== */
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// --- GET /activity ---
router.get('/', (req, res) => {
  res.json(store.actividad);
});

module.exports = router;
