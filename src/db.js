// ==========================================================
// #CONEXION_POSTGRES
// CONEXIÓN A POSTGRESQL
// Aquí nos conectamos a la base de datos.
// Los datos de conexión están en el archivo .env, en DATABASE_URL:
//   postgres://usuario:contraseña@localhost:5432/hoteles_antigua
//
// En los demás archivos se usa así:
//   const pool = require('../db');
//   const resultado = await pool.query('SELECT * FROM hospedajes');
//   resultado.rows  -> las filas que devolvió la consulta
// ==========================================================
const { Pool } = require('pg');

let ssl = false;
// En Render (internet) se necesita SSL; en la computadora no
if (process.env.DB_SSL === 'true') {
  ssl = { rejectUnauthorized: false };
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: ssl,
});

module.exports = pool;
