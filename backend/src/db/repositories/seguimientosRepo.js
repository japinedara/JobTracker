/* =====================================================================
   REPOSITORIO — SEGUIMIENTOS
   ---------------------------------------------------------------------
   Reemplaza las operaciones en memoria sobre `store.seguimientos` por
   consultas SQL contra la tabla `seguimientos`.

   Columna BD     ->  Campo JSON
   ------------------------------------
   id              ->  id
   vacante_id      ->  vacanteId
   fecha           ->  fecha
   tipo            ->  tipo
   descripcion     ->  descripcion

   CORRECCIÓN DE BUG: la tabla `seguimientos` no tiene usuario_id
   propio (un seguimiento pertenece a una vacante, y la vacante
   pertenece a un usuario). Para que cada usuario solo vea sus propios
   seguimientos, findAll() ahora acepta un `usuarioId` opcional y hace
   JOIN con `vacantes` para filtrar por el dueño real.
   ===================================================================== */
const { pool } = require('../connection');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    vacanteId: row.vacante_id,
    fecha: row.fecha,
    tipo: row.tipo,
    descripcion: row.descripcion
  };
}

// --- SELECT seguimientos.* FROM seguimientos JOIN vacantes [WHERE usuario_id = ?] ---
// Si no se pasa usuarioId, devuelve el historial completo (uso interno/administrativo).
async function findAll(usuarioId) {
  if (usuarioId !== undefined && usuarioId !== null) {
    const [rows] = await pool.query(
      `SELECT s.* FROM seguimientos s
       INNER JOIN vacantes v ON v.id = s.vacante_id
       WHERE v.usuario_id = ?
       ORDER BY s.fecha DESC, s.id DESC`,
      [usuarioId]
    );
    return rows.map(mapRow);
  }
  const [rows] = await pool.query('SELECT * FROM seguimientos ORDER BY fecha DESC, id DESC');
  return rows.map(mapRow);
}

// --- SELECT * FROM seguimientos WHERE vacante_id = ? ---
async function findByVacanteId(vacanteId) {
  const [rows] = await pool.query(
    'SELECT * FROM seguimientos WHERE vacante_id = ? ORDER BY fecha DESC, id DESC',
    [vacanteId]
  );
  return rows.map(mapRow);
}

// --- SELECT * FROM seguimientos WHERE id = ? ---
async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM seguimientos WHERE id = ?', [id]);
  return mapRow(rows[0]);
}

// --- INSERT INTO seguimientos ---
async function create(data) {
  const { vacanteId, fecha, tipo = 'Otro', descripcion = '' } = data;

  const [result] = await pool.query(
    `INSERT INTO seguimientos (vacante_id, fecha, tipo, descripcion)
     VALUES (?, ?, ?, ?)`,
    [vacanteId, fecha, tipo, descripcion]
  );

  return findById(result.insertId);
}

// --- DELETE FROM seguimientos WHERE vacante_id = ? ---
// Se usa al eliminar una vacante, en caso de que la FK de tu tabla no
// tenga ON DELETE CASCADE configurado.
async function removeByVacanteId(vacanteId) {
  await pool.query('DELETE FROM seguimientos WHERE vacante_id = ?', [vacanteId]);
}

module.exports = {
  findAll,
  findByVacanteId,
  findById,
  create,
  removeByVacanteId
};
