/* =====================================================================
   REPOSITORIO — SOLICITUDES DE ADMINISTRADOR
   ---------------------------------------------------------------------
   Reemplaza las operaciones en memoria sobre `store.adminRequests` por
   consultas SQL contra la tabla `solicitudes_admin`.

   Columna BD     ->  Campo JSON
   ------------------------------------
   id              ->  id
   usuario_id      ->  usuarioId
   nombre          ->  nombre
   correo          ->  correo
   fecha           ->  fecha
   estado          ->  estado
   ===================================================================== */
const { pool } = require('../connection');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    nombre: row.nombre,
    correo: row.correo,
    fecha: row.fecha,
    estado: row.estado
  };
}

// --- SELECT * FROM solicitudes_admin ---
async function findAll() {
  const [rows] = await pool.query('SELECT * FROM solicitudes_admin ORDER BY fecha DESC, id DESC');
  return rows.map(mapRow);
}

// --- SELECT * FROM solicitudes_admin WHERE id = ? ---
async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM solicitudes_admin WHERE id = ?', [id]);
  return mapRow(rows[0]);
}

// --- Busca una solicitud PENDIENTE para un usuario dado (evita duplicados) ---
async function findPendienteByUsuarioId(usuarioId) {
  const [rows] = await pool.query(
    `SELECT * FROM solicitudes_admin WHERE usuario_id = ? AND estado = 'PENDIENTE' LIMIT 1`,
    [usuarioId]
  );
  return mapRow(rows[0]);
}

// --- INSERT INTO solicitudes_admin ---
async function create(data) {
  const { usuarioId, nombre, correo, fecha, estado = 'PENDIENTE' } = data;

  const [result] = await pool.query(
    `INSERT INTO solicitudes_admin (usuario_id, nombre, correo, fecha, estado)
     VALUES (?, ?, ?, ?, ?)`,
    [usuarioId, nombre, correo, fecha, estado]
  );

  return findById(result.insertId);
}

// --- UPDATE solicitudes_admin SET estado = ? WHERE id = ? ---
async function updateEstado(id, estado) {
  await pool.query('UPDATE solicitudes_admin SET estado = ? WHERE id = ?', [estado, id]);
  return findById(id);
}

module.exports = {
  findAll,
  findById,
  findPendienteByUsuarioId,
  create,
  updateEstado
};
