/* =====================================================================
   REPOSITORIO — ACTIVIDAD RECIENTE
   ---------------------------------------------------------------------
   Reemplaza store.actividad / store.logActivity() por consultas SQL
   contra la tabla `actividad`. Se mantiene siempre la regla de
   "últimos 10 eventos" tal como funcionaba en memoria.

   Columna BD  ->  Campo JSON
   ------------------------------------
   id           ->  id
   tipo         ->  tipo
   mensaje      ->  mensaje
   tono         ->  tono
   fecha        ->  fecha (ISO string)
   ===================================================================== */
const { pool } = require('../connection');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tipo: row.tipo,
    mensaje: row.mensaje,
    tono: row.tono,
    // Se normaliza a ISO string para mantener el mismo formato que
    // devolvía la versión en memoria (new Date().toISOString()).
    fecha: row.fecha instanceof Date ? row.fecha.toISOString() : new Date(row.fecha).toISOString()
  };
}

// --- Últimos 10 eventos, más recientes primero ---
async function findRecent(limit = 10) {
  const [rows] = await pool.query(
    'SELECT * FROM actividad ORDER BY fecha DESC, id DESC LIMIT ?',
    [limit]
  );
  return rows.map(mapRow);
}

// --- INSERT INTO actividad ---
// Inserta el nuevo evento y, en la misma operación, recorta la tabla
// para conservar solo los 10 más recientes (igual que el `.slice(0, 10)`
// que hacía la versión en memoria).
//
// CORRECCIÓN DE BUG (error 500 al aprobar/rechazar solicitudes, y en
// general al crear/editar/eliminar vacantes o registrar usuarios):
// la versión anterior hacía
//   DELETE FROM actividad WHERE id NOT IN (SELECT id FROM (SELECT id FROM actividad ...) AS recientes)
// Esta consulta falla en MySQL con el error 1093
// ("You can't specify target table for update in FROM clause"),
// porque MySQL no permite borrar de una tabla mientras se hace una
// subconsulta sobre esa misma tabla en el FROM, incluso con un alias
// intermedio. Como actividadRepo.log() se llama desde casi todas las
// rutas (vacantes, usuarios, solicitudes), cualquier acción que
// registrara actividad terminaba en un error 500.
//
// La solución: separar en dos pasos simples que MySQL sí permite:
//   1) Averiguar el id de corte (el id del 10º registro más reciente).
//   2) Borrar solo lo que sea más viejo que ese id de corte.
async function log(tipo, mensaje, tono = 'info') {
  await pool.query(
    'INSERT INTO actividad (tipo, mensaje, tono, fecha) VALUES (?, ?, ?, NOW())',
    [tipo, mensaje, tono]
  );

  // Paso 1: encuentra la fecha y el id del 10º evento más reciente
  // (mismo criterio de orden que el resto del sistema: fecha DESC, id DESC)
  const [corte] = await pool.query(
    'SELECT fecha, id FROM actividad ORDER BY fecha DESC, id DESC LIMIT 1 OFFSET 9'
  );

  // Paso 2: si existe un 10º registro, borra todo lo que quede "después"
  // de él en ese mismo orden (fecha más vieja, o misma fecha con id menor)
  if (corte.length > 0) {
    const { fecha: fechaCorte, id: idCorte } = corte[0];
    await pool.query(
      'DELETE FROM actividad WHERE fecha < ? OR (fecha = ? AND id < ?)',
      [fechaCorte, fechaCorte, idCorte]
    );
  }
}

module.exports = {
  findRecent,
  log
};
