/* =====================================================================
   RUTAS DE VACANTES (JOBS)
   ---------------------------------------------------------------------
   GET    /jobs        -> lista de vacantes
   POST   /jobs         -> crear vacante
   PUT    /jobs/:id      -> editar vacante (incluye cambios de estado)
   DELETE /jobs/:id       -> eliminar vacante (y sus seguimientos)

   GET    /jobs/:id/seguimientos -> historial de seguimientos de una vacante
   POST   /jobs/:id/seguimientos -> registrar un nuevo seguimiento

   Cada operación de creación/edición/eliminación o cambio de estado
   registra un evento en el log de actividad reciente.
   ===================================================================== */
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { todayISO } = require('../utils/helpers');

// --- GET /jobs ---
router.get('/', (req, res) => {
  res.json(store.vacantes);
});

// --- POST /jobs ---
router.post('/', (req, res) => {
  const { empresa, cargo, salario, ciudad, estado, fechaCreacion } = req.body;

  if (!empresa || !cargo || !ciudad) {
    return res.status(400).json({ error: 'Empresa, cargo y ciudad son obligatorios.' });
  }

  const nueva = {
    id: store.getNextVacanteId(),
    empresa,
    cargo,
    salario: salario || '',
    ciudad,
    estado: estado || 'Aplicada',
    fechaCreacion: fechaCreacion || todayISO()
  };

  store.vacantes.push(nueva);
  store.logActivity('vacante_creada', `Vacante creada: ${nueva.cargo} en ${nueva.empresa}`, 'success');

  res.status(201).json(nueva);
});

// --- PUT /jobs/:id ---
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = store.vacantes.findIndex(v => v.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Vacante no encontrada.' });
  }

  const anterior = store.vacantes[idx];
  const { empresa, cargo, salario, ciudad, estado, fechaCreacion } = req.body;

  const actualizada = {
    ...anterior,
    empresa: empresa !== undefined ? empresa : anterior.empresa,
    cargo: cargo !== undefined ? cargo : anterior.cargo,
    salario: salario !== undefined ? salario : anterior.salario,
    ciudad: ciudad !== undefined ? ciudad : anterior.ciudad,
    estado: estado !== undefined ? estado : anterior.estado,
    fechaCreacion: fechaCreacion !== undefined ? fechaCreacion : anterior.fechaCreacion
  };

  store.vacantes[idx] = actualizada;

  const estadoCambio = estado !== undefined && estado !== anterior.estado;

  if (estadoCambio) {
    store.logActivity(
      'estado_cambiado',
      `Estado actualizado: ${anterior.cargo} en ${anterior.empresa} → ${estado}`,
      'info'
    );
  } else {
    store.logActivity(
      'vacante_editada',
      `Vacante editada: ${actualizada.cargo} en ${actualizada.empresa}`,
      'accent'
    );
  }

  res.json(actualizada);
});

// --- DELETE /jobs/:id ---
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const idx = store.vacantes.findIndex(v => v.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Vacante no encontrada.' });
  }

  const vacante = store.vacantes[idx];
  store.vacantes.splice(idx, 1);

  // Elimina también los seguimientos asociados a esta vacante
  for (let i = store.seguimientos.length - 1; i >= 0; i--) {
    if (store.seguimientos[i].vacanteId === id) {
      store.seguimientos.splice(i, 1);
    }
  }

  store.logActivity('vacante_eliminada', `Vacante eliminada: ${vacante.cargo} en ${vacante.empresa}`, 'danger');

  res.json({ success: true });
});

// --- GET /jobs/:id/seguimientos ---
router.get('/:id/seguimientos', (req, res) => {
  const vacanteId = Number(req.params.id);
  const lista = store.seguimientos.filter(s => s.vacanteId === vacanteId);
  res.json(lista);
});

// --- POST /jobs/:id/seguimientos ---
router.post('/:id/seguimientos', (req, res) => {
  const vacanteId = Number(req.params.id);
  const vacante = store.vacantes.find(v => v.id === vacanteId);

  if (!vacante) {
    return res.status(404).json({ error: 'Vacante no encontrada.' });
  }

  const { fecha, tipo, descripcion } = req.body;

  const nuevo = {
    id: store.getNextSeguimientoId(),
    vacanteId,
    fecha: fecha || todayISO(),
    tipo: tipo || 'Otro',
    descripcion: descripcion || ''
  };

  store.seguimientos.push(nuevo);
  res.status(201).json(nuevo);
});

module.exports = router;
