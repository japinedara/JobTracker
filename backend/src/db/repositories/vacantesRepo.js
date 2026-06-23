/* =====================================================================
   REPOSITORIO — VACANTES
   ---------------------------------------------------------------------
   Reemplaza las operaciones en memoria sobre `store.vacantes` por
   consultas SQL contra la tabla `vacantes`.

   Columna BD       ->  Campo JSON
   ------------------------------------
   id                ->  id
   usuario_id        ->  usuarioId (dueño de la vacante; no se expone
                          en las respuestas porque el frontend no lo
                          usaba antes, pero se usa para filtrar)
   empresa           ->  empresa
   cargo             ->  cargo
   salario           ->  salario
   ciudad            ->  ciudad
   estado            ->  estado
   fecha_creacion    ->  fechaCreacion

   CORRECCIÓN DE BUG: cada vacante pertenece a un usuario (usuario_id).
   Todas las consultas de lectura (findAll, countByEstado,
   empresaConMasVacantes, ultimaCreada, count) ahora aceptan un
   parámetro opcional `usuarioId` para filtrar por dueño. Las rutas en
   src/routes/jobs.js y src/routes/stats.js siempre lo pasan, de modo
   que cada usuario solo ve sus propias vacantes.
   ===================================================================== */
const { pool } = require('../connection');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    empresa: row.empresa,
    cargo: row.cargo,
    salario: row.salario,
    ciudad: row.ciudad,
    estado: row.estado,
    fechaCreacion: row.fecha_creacion
  };
}

// --- SELECT * FROM vacantes [WHERE usuario_id = ?] ---
// Si no se pasa usuarioId, devuelve todas (uso interno/administrativo).
async function findAll(usuarioId) {
  if (usuarioId !== undefined && usuarioId !== null) {
    const [rows] = await pool.query(
      'SELECT * FROM vacantes WHERE usuario_id = ? ORDER BY id ASC',
      [usuarioId]
    );
    return rows.map(mapRow);
  }
  const [rows] = await pool.query('SELECT * FROM vacantes ORDER BY id ASC');
  return rows.map(mapRow);
}

// --- SELECT * FROM vacantes WHERE id = ? ---
async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM vacantes WHERE id = ?', [id]);
  return mapRow(rows[0]);
}

// --- INSERT INTO vacantes ---
async function create(data) {
  const { usuarioId, empresa, cargo, salario = '', ciudad, estado = 'Aplicada', fechaCreacion } = data;

  const [result] = await pool.query(
    `INSERT INTO vacantes (usuario_id, empresa, cargo, salario, ciudad, estado, fecha_creacion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [usuarioId, empresa, cargo, salario, ciudad, estado, fechaCreacion]
  );

  return findById(result.insertId);
}

// --- UPDATE vacantes SET ... WHERE id = ? ---
// El dueño (usuario_id) no se modifica desde aquí: una vacante no
// cambia de propietario al editarla.
async function update(id, data) {
  const actual = await findById(id);
  if (!actual) return null;

  const empresa = data.empresa !== undefined ? data.empresa : actual.empresa;
  const cargo = data.cargo !== undefined ? data.cargo : actual.cargo;
  const salario = data.salario !== undefined ? data.salario : actual.salario;
  const ciudad = data.ciudad !== undefined ? data.ciudad : actual.ciudad;
  const estado = data.estado !== undefined ? data.estado : actual.estado;
  const fechaCreacion = data.fechaCreacion !== undefined ? data.fechaCreacion : actual.fechaCreacion;

  await pool.query(
    `UPDATE vacantes SET
       empresa = ?, cargo = ?, salario = ?, ciudad = ?, estado = ?, fecha_creacion = ?
     WHERE id = ?`,
    [empresa, cargo, salario, ciudad, estado, fechaCreacion, id]
  );

  return findById(id);
}

// --- DELETE FROM vacantes WHERE id = ? ---
// La eliminación en cascada de seguimientos la maneja la FK
// (ON DELETE CASCADE) definida en sql/schema.sql. Si tu tabla no
// tiene esa restricción, ver seguimientosRepo.removeByVacanteId().
async function remove(id) {
  const [result] = await pool.query('DELETE FROM vacantes WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// --- Datos para /stats: totales por estado [filtrado por usuario] ---
async function countByEstado(usuarioId) {
  const sql = usuarioId !== undefined && usuarioId !== null
    ? 'SELECT estado, COUNT(*) AS total FROM vacantes WHERE usuario_id = ? GROUP BY estado'
    : 'SELECT estado, COUNT(*) AS total FROM vacantes GROUP BY estado';
  const params = usuarioId !== undefined && usuarioId !== null ? [usuarioId] : [];

  const [rows] = await pool.query(sql, params);
  const result = {};
  rows.forEach(r => { result[r.estado] = r.total; });
  return result;
}

// --- Empresa con más vacantes registradas [filtrado por usuario] ---
async function empresaConMasVacantes(usuarioId) {
  const sql = usuarioId !== undefined && usuarioId !== null
    ? `SELECT empresa, COUNT(*) AS total FROM vacantes
       WHERE usuario_id = ?
       GROUP BY empresa ORDER BY total DESC, empresa ASC LIMIT 1`
    : `SELECT empresa, COUNT(*) AS total FROM vacantes
       GROUP BY empresa ORDER BY total DESC, empresa ASC LIMIT 1`;
  const params = usuarioId !== undefined && usuarioId !== null ? [usuarioId] : [];

  const [rows] = await pool.query(sql, params);
  if (rows.length === 0) return { nombre: '—', total: 0 };
  return { nombre: rows[0].empresa, total: rows[0].total };
}

// --- Última vacante creada [filtrado por usuario] ---
async function ultimaCreada(usuarioId) {
  const sql = usuarioId !== undefined && usuarioId !== null
    ? `SELECT * FROM vacantes WHERE usuario_id = ? ORDER BY fecha_creacion DESC, id DESC LIMIT 1`
    : `SELECT * FROM vacantes ORDER BY fecha_creacion DESC, id DESC LIMIT 1`;
  const params = usuarioId !== undefined && usuarioId !== null ? [usuarioId] : [];

  const [rows] = await pool.query(sql, params);
  if (rows.length === 0) return null;
  const v = mapRow(rows[0]);
  return { cargo: v.cargo, empresa: v.empresa, fechaCreacion: v.fechaCreacion };
}

// --- Conteo total [filtrado por usuario] (usado en /stats) ---
async function count(usuarioId) {
  const sql = usuarioId !== undefined && usuarioId !== null
    ? 'SELECT COUNT(*) AS total FROM vacantes WHERE usuario_id = ?'
    : 'SELECT COUNT(*) AS total FROM vacantes';
  const params = usuarioId !== undefined && usuarioId !== null ? [usuarioId] : [];

  const [rows] = await pool.query(sql, params);
  return rows[0].total;
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  countByEstado,
  empresaConMasVacantes,
  ultimaCreada,
  count
};
