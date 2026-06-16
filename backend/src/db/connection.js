/* =====================================================================
   CONEXIÓN A MYSQL
   ---------------------------------------------------------------------
   Crea un pool de conexiones reutilizable con mysql2/promise. Todas
   las consultas del backend pasan por este pool (ver
   src/db/repositories/*.js).

   Variables de entorno esperadas (ver .env.example):
     DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
   ===================================================================== */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'jobtracker',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  dateStrings: true // Devuelve DATE/DATETIME como strings ('YYYY-MM-DD', ...) en lugar de objetos Date
});

// Verifica la conexión al iniciar el servidor (falla rápido y con
// un mensaje claro si las credenciales o el host son incorrectos).
async function verifyConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log(`Conectado a MySQL (${process.env.DB_NAME || 'jobtracker'}) en ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  } finally {
    conn.release();
  }
}

module.exports = { pool, verifyConnection };
