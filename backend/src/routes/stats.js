/* =====================================================================
   RUTAS DE ESTADÍSTICAS (DASHBOARD)
   ---------------------------------------------------------------------
   GET /stats -> objeto con todo lo que el Dashboard necesita:

   {
     totales: {
       vacantesTotales, aplicacionesEnviadas, entrevistas, ofertas, rechazos
     },
     distribucionEstados: {
       'Aplicada': n, 'En revisión': n, 'Entrevista': n, 'Oferta': n, 'Rechazada': n
     },
     resumen: {
       empresaTop: { nombre, total },
       ultimaVacante: { cargo, empresa, fechaCreacion },
       totalUsuarios
     },
     actividadReciente: [...]
   }
   ===================================================================== */
const express = require('express');
const router = express.Router();
const store = require('../data/store');

const ESTADOS = ['Aplicada', 'En revisión', 'Entrevista', 'Oferta', 'Rechazada'];

router.get('/', (req, res) => {
  const vacantes = store.vacantes;

  // ---- Tarjetas principales del Dashboard ----
  const total = vacantes.length;
  const aplicaciones = total; // toda vacante registrada representa una aplicación enviada
  const entrevistas = vacantes.filter(v => v.estado === 'Entrevista').length;
  const ofertas = vacantes.filter(v => v.estado === 'Oferta').length;
  const rechazos = vacantes.filter(v => v.estado === 'Rechazada').length;

  // ---- Distribución por estado (gráfico) ----
  const distribucionEstados = {};
  ESTADOS.forEach(estado => {
    distribucionEstados[estado] = vacantes.filter(v => v.estado === estado).length;
  });

  // ---- Resumen rápido ----
  let empresaTop = { nombre: '—', total: 0 };
  if (vacantes.length > 0) {
    const conteo = {};
    vacantes.forEach(v => { conteo[v.empresa] = (conteo[v.empresa] || 0) + 1; });
    const ordenado = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    empresaTop = { nombre: ordenado[0][0], total: ordenado[0][1] };
  }

  let ultimaVacante = null;
  if (vacantes.length > 0) {
    const ultima = [...vacantes].sort((a, b) =>
      (a.fechaCreacion || '').localeCompare(b.fechaCreacion || '')
    ).pop();
    ultimaVacante = {
      cargo: ultima.cargo,
      empresa: ultima.empresa,
      fechaCreacion: ultima.fechaCreacion
    };
  }

  const totalUsuarios = store.usuarios.length;

  res.json({
    totales: {
      vacantesTotales: total,
      aplicacionesEnviadas: aplicaciones,
      entrevistas,
      ofertas,
      rechazos
    },
    distribucionEstados,
    resumen: {
      empresaTop,
      ultimaVacante,
      totalUsuarios
    },
    actividadReciente: store.actividad
  });
});

module.exports = router;
