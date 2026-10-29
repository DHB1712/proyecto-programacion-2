// #ACTUALIZAR_BASE
// Actualiza una base ya creada SIN borrar datos (se puede ejecutar varias veces).
// Agrega las columnas y tablas nuevas que se fueron sumando al proyecto.
// Uso: npm run db:migrate
require('dotenv').config();
const { Client } = require('pg');

const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

const PASOS = [
  // Perfil "cliente" y correo del usuario
  'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo VARCHAR(120)',
  'ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check',
  "ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'registrador', 'cliente'))",
  // Marca de datos de ejemplo sin verificar
  'ALTER TABLE hospedajes ADD COLUMN IF NOT EXISTS es_ejemplo BOOLEAN NOT NULL DEFAULT FALSE',
  // Enlace a la página del hotel en Google Maps
  'ALTER TABLE hospedajes ADD COLUMN IF NOT EXISTS enlace_maps VARCHAR(500)',
  // Favoritos
  `CREATE TABLE IF NOT EXISTS favoritos (
     usuario_id   INTEGER   NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
     hospedaje_id INTEGER   NOT NULL REFERENCES hospedajes(id) ON DELETE CASCADE,
     creado_en    TIMESTAMP NOT NULL DEFAULT NOW(),
     PRIMARY KEY (usuario_id, hospedaje_id)
   )`,
];

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl });
  await db.connect();
  try {
    await db.query('BEGIN');
    for (const sql of PASOS) await db.query(sql);
    await db.query('COMMIT');
    console.log('Base de datos actualizada.');
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Error al actualizar la base de datos:', err.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();
