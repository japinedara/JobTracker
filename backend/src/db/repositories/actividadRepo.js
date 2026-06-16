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
async function log(tipo, mensaje, tono = 'info') {
  await pool.query(
    'INSERT INTO actividad (tipo, mensaje, tono, fecha) VALUES (?, ?, ?, NOW())',
    [tipo, mensaje, tono]
  );

  // Elimina cualquier evento más allá de los 10 más recientes
  await pool.query(
    `DELETE FROM actividad
     WHERE id NOT IN (
       SELECT id FROM (
         SELECT id FROM actividad ORDER BY fecha DESC, id DESC LIMIT 10
       ) AS recientes
     )`
  );
}

module.exports = {
  findRecent,
  log
};
