/* =====================================================================
   RUTAS DE SEGUIMIENTOS (vista general)
   ---------------------------------------------------------------------
   GET  /seguimientos       -> historial completo (todas las vacantes)
   POST /seguimientos        -> crear seguimiento (requiere vacanteId)

   El frontend usa esta ruta para la sección "Seguimientos", que
   muestra el historial completo independientemente de la vacante.
   Para seguimientos de una vacante específica, ver /jobs/:id/seguimientos.
   ===================================================================== */
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { todayISO } = require('../utils/helpers');

// --- GET /seguimientos ---
router.get('/', (req, res) => {
  res.json(store.seguimientos);
});

// --- POST /seguimientos ---
router.post('/', (req, res) => {
  const { vacanteId, fecha, tipo, descripcion } = req.body;

  if (!vacanteId) {
    return res.status(400).json({ error: 'vacanteId es obligatorio.' });
  }

  const vacante = store.vacantes.find(v => v.id === Number(vacanteId));
  if (!vacante) {
    return res.status(404).json({ error: 'Vacante no encontrada.' });
  }

  const nuevo = {
    id: store.getNextSeguimientoId(),
    vacanteId: Number(vacanteId),
    fecha: fecha || todayISO(),
    tipo: tipo || 'Otro',
    descripcion: descripcion || ''
  };

  store.seguimientos.push(nuevo);
  res.status(201).json(nuevo);
});

module.exports = router;
