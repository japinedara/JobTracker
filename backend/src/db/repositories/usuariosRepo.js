/* =====================================================================
   REPOSITORIO — USUARIOS
   ---------------------------------------------------------------------
   Reemplaza las operaciones en memoria sobre `store.usuarios` por
   consultas SQL contra la tabla `usuarios`. Cada función devuelve
   objetos con las mismas claves camelCase que ya esperaba el
   frontend (mapeo de columnas snake_case -> camelCase).

   Columna BD          ->  Campo JSON
   ------------------------------------
   id                   ->  id
   nombre               ->  nombre
   apellidos            ->  apellidos
   correo               ->  correo
   password             ->  password (solo uso interno, nunca se expone)
   rol                  ->  rol
   estado_verificacion  ->  estadoVerificacion
   telefono             ->  telefono
   ciudad               ->  ciudad
   linkedin             ->  linkedin
   github               ->  github
   ===================================================================== */
const { pool } = require('../connection');

// Convierte una fila de la tabla `usuarios` al shape camelCase del frontend
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    apellidos: row.apellidos,
    correo: row.correo,
    password: row.password,
    rol: row.rol,
    estadoVerificacion: row.estado_verificacion,
    telefono: row.telefono,
    ciudad: row.ciudad,
    linkedin: row.linkedin,
    github: row.github
  };
}

// --- SELECT * FROM usuarios ---
async function findAll() {
  const [rows] = await pool.query('SELECT * FROM usuarios ORDER BY id ASC');
  return rows.map(mapRow);
}

// --- SELECT * FROM usuarios WHERE id = ? ---
async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM usuarios WHERE id = ?', [id]);
  return mapRow(rows[0]);
}

// --- SELECT * FROM usuarios WHERE correo = ? (case-insensitive) ---
async function findByEmail(correo) {
  const [rows] = await pool.query(
    'SELECT * FROM usuarios WHERE LOWER(correo) = LOWER(?)',
    [correo]
  );
  return mapRow(rows[0]);
}

// --- INSERT INTO usuarios ---
async function create(data) {
  const {
    nombre,
    apellidos = '',
    correo,
    password,
    rol = 'USER',
    estadoVerificacion = 'pendiente_verificacion',
    telefono = '',
    ciudad = '',
    linkedin = '',
    github = ''
  } = data;

  const [result] = await pool.query(
    `INSERT INTO usuarios
       (nombre, apellidos, correo, password, rol, estado_verificacion, telefono, ciudad, linkedin, github)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, apellidos, correo, password, rol, estadoVerificacion, telefono, ciudad, linkedin, github]
  );

  return findById(result.insertId);
}

// --- UPDATE usuarios SET ... WHERE id = ? ---
// Actualiza solo los campos presentes en "data" (los demás conservan su valor actual).
async function update(id, data) {
  const actual = await findById(id);
  if (!actual) return null;

  const nombre = data.nombre !== undefined ? data.nombre : actual.nombre;
  const apellidos = data.apellidos !== undefined ? data.apellidos : actual.apellidos;
  const correo = data.correo !== undefined ? data.correo : actual.correo;
  const password = data.password !== undefined ? data.password : actual.password;
  const rol = (data.rol === 'ADMIN' || data.rol === 'USER') ? data.rol : actual.rol;
  const estadoVerificacion = data.estadoVerificacion !== undefined ? data.estadoVerificacion : actual.estadoVerificacion;
  const telefono = data.telefono !== undefined ? data.telefono : actual.telefono;
  const ciudad = data.ciudad !== undefined ? data.ciudad : actual.ciudad;
  const linkedin = data.linkedin !== undefined ? data.linkedin : actual.linkedin;
  const github = data.github !== undefined ? data.github : actual.github;

  await pool.query(
    `UPDATE usuarios SET
       nombre = ?, apellidos = ?, correo = ?, password = ?, rol = ?,
       estado_verificacion = ?, telefono = ?, ciudad = ?, linkedin = ?, github = ?
     WHERE id = ?`,
    [nombre, apellidos, correo, password, rol, estadoVerificacion, telefono, ciudad, linkedin, github, id]
  );

  return findById(id);
}

// --- DELETE FROM usuarios WHERE id = ? ---
async function remove(id) {
  const [result] = await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

// --- SELECT COUNT(*) FROM usuarios --- (usado por /stats)
async function count() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM usuarios');
  return rows[0].total;
}

module.exports = {
  findAll,
  findById,
  findByEmail,
  create,
  update,
  remove,
  count
};
