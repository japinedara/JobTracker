/* =====================================================================
   REPOSITORIO — VACANTES
   ---------------------------------------------------------------------
   Reemplaza las operaciones en memoria sobre `store.vacantes` por
   consultas SQL contra la tabla `vacantes`.

   Columna BD       ->  Campo JSON
   ------------------------------------
   id                ->  id
   empresa           ->  empresa
   cargo             ->  cargo
   salario           ->  salario
   ciudad            ->  ciudad
   estado            ->  estado
   fecha_creacion    ->  fechaCreacion
   ===================================================================== */
const { pool } = require('../connection');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    empresa: row.empresa,
    cargo: row.cargo,
    salario: row.salario,
    ciudad: row.ciudad,
    estado: row.estado,
    fechaCreacion: row.fecha_creacion
  };
}

// --- SELECT * FROM vacantes ---
async function findAll() {
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
  const { empresa, cargo, salario = '', ciudad, estado = 'Aplicada', fechaCreacion } = data;

  const [result] = await pool.query(
    `INSERT INTO vacantes (empresa, cargo, salario, ciudad, estado, fecha_creacion)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [empresa, cargo, salario, ciudad, estado, fechaCreacion]
  );

  return findById(result.insertId);
}

// --- UPDATE vacantes SET ... WHERE id = ? ---
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

// --- Datos para /stats: totales por estado ---
async function countByEstado() {
  const [rows] = await pool.query(
    'SELECT estado, COUNT(*) AS total FROM vacantes GROUP BY estado'
  );
  const result = {};
  rows.forEach(r => { result[r.estado] = r.total; });
  return result;
}

// --- Empresa con más vacantes registradas ---
async function empresaConMasVacantes() {
  const [rows] = await pool.query(
    `SELECT empresa, COUNT(*) AS total
     FROM vacantes
     GROUP BY empresa
     ORDER BY total DESC, empresa ASC
     LIMIT 1`
  );
  if (rows.length === 0) return { nombre: '—', total: 0 };
  return { nombre: rows[0].empresa, total: rows[0].total };
}

// --- Última vacante creada (por fecha_creacion, luego por id) ---
async function ultimaCreada() {
  const [rows] = await pool.query(
    `SELECT * FROM vacantes
     ORDER BY fecha_creacion DESC, id DESC
     LIMIT 1`
  );
  if (rows.length === 0) return null;
  const v = mapRow(rows[0]);
  return { cargo: v.cargo, empresa: v.empresa, fechaCreacion: v.fechaCreacion };
}

// --- Conteo total / por estado puntual (usado en /stats) ---
async function count() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM vacantes');
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
