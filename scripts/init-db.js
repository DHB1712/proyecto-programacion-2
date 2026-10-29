// #CREAR_BASE
// Crea la base de datos (si no existe), las tablas y los datos iniciales
// (usuarios de prueba y hoteles de ejemplo).
// Uso: npm run db:init   (ATENCIÓN: borra y vuelve a crear las tablas)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const cargarEjemplos = require('./ejemplos');

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en el archivo .env');
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const dbName = url.pathname.replace('/', '');
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

async function main() {
  // 1. Crear la base de datos si no existe
  const adminUrl = new URL(process.env.DATABASE_URL);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString(), ssl });
  try {
    await admin.connect();
    const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (existe.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Base de datos "${dbName}" creada.`);
    }
  } catch (err) {
    // En servicios como Render la base ya existe y no se permite conectarse a "postgres"
    console.log('Aviso: no se pudo verificar/crear la base de datos:', err.message);
  } finally {
    await admin.end().catch(() => {});
  }

  // 2. Crear tablas, usuarios y hospedajes de ejemplo
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl });
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));

    const usuarios = [
      ['Administrador', 'admin', 'admin123', 'admin'],
      ['Integrante 1 - Grupo 4', 'registrador1', 'registro123', 'registrador'],
      ['Integrante 2 - Grupo 4', 'registrador2', 'registro123', 'registrador'],
      ['Integrante 3 - Grupo 4', 'registrador3', 'registro123', 'registrador'],
      ['Cliente de prueba', 'cliente1', 'cliente123', 'cliente'],
    ];
    for (const [nombre, usuario, password, rol] of usuarios) {
      await db.query('INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES ($1,$2,$3,$4)',
        [nombre, usuario, await bcrypt.hash(password, 10), rol]);
    }

    const r = await cargarEjemplos(db);

    await db.query('COMMIT');
    console.log(`Tablas creadas con ${r.nuevos} hospedajes de ejemplo.`);
    console.log('Usuarios: admin / admin123  |  registrador1 ... registrador3 / registro123  |  cliente1 / cliente123');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error('Error al inicializar la base de datos:', err.message);
  process.exit(1);
});
