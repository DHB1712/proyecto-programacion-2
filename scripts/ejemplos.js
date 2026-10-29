// ==========================================================
// #EJEMPLOS
// CARGAR HOSPEDAJES DE EJEMPLO
// Uso: npm run db:ejemplos
// Agrega los hoteles de db/ejemplos.js que todavía no existan.
// NO borra lo que haya registrado el grupo y se puede
// ejecutar varias veces sin repetir hoteles.
// ==========================================================
require('dotenv').config();
const { Client } = require('pg');
const ejemplos = require('../db/ejemplos');

// Ejemplos de versiones anteriores que ya no se usan
// (se borran solo si siguen marcados como ejemplo)
const EJEMPLOS_VIEJOS = [
  'Hostal de ejemplo - Centro',
  'Posada de ejemplo - Calle del Arco',
  'Hostal Terraza del Volcán',
  'Casa de Huéspedes La Merced',
  'Apartamentos Vista al Volcán de Agua',
];

async function cargarEjemplos(db) {
  // 1. Crear los tipos de hospedaje que falten
  const idDelTipo = {};
  for (const tipo of ejemplos.tipos) {
    const resultado = await db.query(
      `INSERT INTO tipos_hospedaje (nombre, slug, descripcion, icono) VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
       RETURNING id`,
      [tipo.nombre, tipo.slug, tipo.descripcion, tipo.icono]
    );
    idDelTipo[tipo.slug] = resultado.rows[0].id;
  }

  // Los ejemplos quedan a nombre del primer administrador
  const admin = await db.query("SELECT id FROM usuarios WHERE rol = 'admin' ORDER BY id LIMIT 1");
  let idAdmin = null;
  if (admin.rows.length > 0) {
    idAdmin = admin.rows[0].id;
  }

  // 2. Borrar los ejemplos viejos
  const borrados = await db.query(
    'DELETE FROM hospedajes WHERE nombre = ANY($1) AND (es_ejemplo OR nombre LIKE $2)',
    [EJEMPLOS_VIEJOS, '%de ejemplo%']
  );

  // 3. Ya no usamos fotos en los ejemplos (las fotos se ven en Google Maps)
  await db.query('UPDATE hospedajes SET foto_url = NULL WHERE es_ejemplo');

  // 4. Agregar los hoteles que todavía no existan
  let nuevos = 0;
  for (const h of ejemplos.hospedajes) {
    const existe = await db.query('SELECT id FROM hospedajes WHERE LOWER(nombre) = LOWER($1)', [h.nombre]);
    if (existe.rows.length > 0) {
      continue;   // ya está, no lo repetimos
    }

    const resultado = await db.query(
      `INSERT INTO hospedajes
         (nombre, tipo_id, descripcion, direccion, latitud, longitud, precio_desde, servicios,
          es_ejemplo, revision, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, 'aprobado', $9)
       RETURNING id`,
      [h.nombre, idDelTipo[h.tipo], h.descripcion, h.direccion, h.latitud, h.longitud,
       h.precio_desde, h.servicios, idAdmin]
    );

    // Código del hotel: id 7 -> HOT-0007
    const id = resultado.rows[0].id;
    await db.query('UPDATE hospedajes SET codigo = $1 WHERE id = $2', ['HOT-' + String(id).padStart(4, '0'), id]);
    nuevos++;
  }

  return { nuevos: nuevos, borrados: borrados.rowCount };
}

// init-db.js también usa esta función
module.exports = cargarEjemplos;

// Si se ejecuta directo con "npm run db:ejemplos"
if (require.main === module) {
  const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: ssl });

  db.connect()
    .then(function () { return cargarEjemplos(db); })
    .then(function (r) {
      console.log('Ejemplos cargados: ' + r.nuevos + ' nuevos, ' + r.borrados + ' ejemplos viejos eliminados.');
    })
    .catch(function (error) {
      console.error('Error al cargar los ejemplos:', error.message);
      process.exitCode = 1;
    })
    .finally(function () {
      db.end();
    });
}
