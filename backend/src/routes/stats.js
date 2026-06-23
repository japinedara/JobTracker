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

   MIGRACIÓN A MYSQL: cada cálculo que antes recorría store.vacantes
   en memoria ahora se hace con consultas SQL (COUNT, GROUP BY, ORDER
   BY + LIMIT) a través de vacantesRepo y usuariosRepo. El shape de la
   respuesta JSON es exactamente el mismo que antes.

   CORRECCIÓN DE BUG (vacantes visibles para todos): todas las
   métricas relacionadas con vacantes (totales, distribución por
   estado, empresa top, última vacante) ahora se calculan SOLO sobre
   las vacantes del usuario actual (identificado mediante
   getCurrentUserId). "totalUsuarios" se mantiene global a propósito,
   ya que es información del sistema, no de las vacantes de una
   persona en particular.
   ===================================================================== */
const express = require('express');
const router = express.Router();
const vacantesRepo = require('../db/repositories/vacantesRepo');
const usuariosRepo = require('../db/repositories/usuariosRepo');
const actividadRepo = require('../db/repositories/actividadRepo');
const { getCurrentUserId } = require('../utils/helpers');

const ESTADOS = ['Aplicada', 'En revisión', 'Entrevista', 'Oferta', 'Rechazada'];

router.get('/', async (req, res, next) => {
  try {
    const usuarioId = getCurrentUserId(req);

    const [total, porEstado, empresaTop, ultimaVacante, totalUsuarios, actividadReciente] =
      await Promise.all([
        vacantesRepo.count(usuarioId),
        vacantesRepo.countByEstado(usuarioId),
        vacantesRepo.empresaConMasVacantes(usuarioId),
        vacantesRepo.ultimaCreada(usuarioId),
        usuariosRepo.count(),
        actividadRepo.findRecent(10)
      ]);

    // ---- Tarjetas principales del Dashboard ----
    const aplicaciones = total; // toda vacante registrada representa una aplicación enviada
    const entrevistas = porEstado['Entrevista'] || 0;
    const ofertas = porEstado['Oferta'] || 0;
    const rechazos = porEstado['Rechazada'] || 0;

    // ---- Distribución por estado (gráfico) ----
    const distribucionEstados = {};
    ESTADOS.forEach(estado => {
      distribucionEstados[estado] = porEstado[estado] || 0;
    });

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
      actividadReciente
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
