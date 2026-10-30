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
  // El correo no se puede repetir (se usa para iniciar sesión).
  // Primero lo dejamos en minúsculas; si ya hay correos repetidos solo avisamos.
  "UPDATE usuarios SET correo = NULLIF(LOWER(TRIM(correo)), '') WHERE correo IS NOT NULL",
  `DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_correo_key') THEN
       IF EXISTS (SELECT correo FROM usuarios WHERE correo IS NOT NULL GROUP BY correo HAVING COUNT(*) > 1) THEN
         RAISE NOTICE 'Hay correos repetidos en usuarios: corríjalos y vuelva a ejecutar npm run db:migrate.';
       ELSE
         ALTER TABLE usuarios ADD CONSTRAINT usuarios_correo_key UNIQUE (correo);
       END IF;
     END IF;
   END $$`,
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
  // No puede haber dos hospedajes con el mismo nombre. Si ya hay repetidos, solo avisamos.
  `DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'hospedajes_nombre_unico') THEN
       IF EXISTS (SELECT 1 FROM hospedajes GROUP BY LOWER(TRIM(nombre)) HAVING COUNT(*) > 1) THEN
         RAISE NOTICE 'Hay hospedajes con nombres repetidos: cámbieles el nombre y vuelva a ejecutar npm run db:migrate.';
       ELSE
         CREATE UNIQUE INDEX hospedajes_nombre_unico ON hospedajes (LOWER(TRIM(nombre)));
       END IF;
     END IF;
   END $$`,
  // Seguridad por filas (RLS): bloquea la API pública de Supabase (ver db/schema.sql #SEGURIDAD_SUPABASE)
  'ALTER TABLE tipos_hospedaje ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE hospedajes ENABLE ROW LEVEL SECURITY',
  'ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY',
  // Roles y permisos (ver db/schema.sql #TABLA_ROLES y src/permisos.js)
  'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS permisos TEXT[]',
  `CREATE TABLE IF NOT EXISTS roles (
     slug        VARCHAR(20) PRIMARY KEY,
     nombre      VARCHAR(50) NOT NULL,
     descripcion TEXT,
     permisos    TEXT[] NOT NULL DEFAULT '{}'
   )`,
  `INSERT INTO roles (slug, nombre, descripcion, permisos) VALUES
     ('admin', 'Administrador', 'Acceso total al sistema.',
      '{registrar,propios,editar_todos,eliminar_todos,aprobar,publicar,estado,tipos,usuarios}'),
     ('registrador', 'Registrador', 'Registra hospedajes; sus funciones las decide el administrador.',
      '{registrar,propios,editar_todos,publicar}'),
     ('cliente', 'Cliente', 'Consulta hospedajes y guarda favoritos.', '{}')
   ON CONFLICT (slug) DO NOTHING`,
  'ALTER TABLE roles ENABLE ROW LEVEL SECURITY',
  // Administrador principal (ver db/schema.sql #ADMIN_PRINCIPAL)
  'ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT FALSE',
  'CREATE UNIQUE INDEX IF NOT EXISTS usuarios_un_principal ON usuarios (es_principal) WHERE es_principal',
  // Si todavía no hay principal, lo es la cuenta "admin" (José Diego)
  `UPDATE usuarios SET es_principal = TRUE, rol = 'admin', activo = TRUE, permisos = NULL
   WHERE usuario = 'admin' AND NOT EXISTS (SELECT 1 FROM usuarios WHERE es_principal)`,
  `CREATE OR REPLACE FUNCTION proteger_admin_principal() RETURNS trigger
   LANGUAGE plpgsql AS $$
   BEGIN
     IF TG_OP = 'DELETE' THEN
       IF OLD.es_principal THEN
         RAISE EXCEPTION 'El administrador principal no se puede eliminar.';
       END IF;
       RETURN OLD;
     END IF;
     IF OLD.es_principal AND (NOT NEW.es_principal OR NEW.rol <> 'admin' OR NOT NEW.activo OR NEW.permisos IS NOT NULL) THEN
       RAISE EXCEPTION 'El administrador principal no se puede modificar: siempre es administrador con acceso total.';
     END IF;
     RETURN NEW;
   END $$`,
  'DROP TRIGGER IF EXISTS proteger_admin_principal ON usuarios',
  `CREATE TRIGGER proteger_admin_principal BEFORE UPDATE OR DELETE ON usuarios
     FOR EACH ROW EXECUTE FUNCTION proteger_admin_principal()`,
  // Solicitudes de eliminación (ver db/schema.sql #SOLICITUD_ELIMINACION)
  'ALTER TABLE hospedajes ADD COLUMN IF NOT EXISTS eliminacion_solicitada TIMESTAMP',
  'ALTER TABLE hospedajes ADD COLUMN IF NOT EXISTS eliminacion_motivo TEXT',
  'ALTER TABLE hospedajes ADD COLUMN IF NOT EXISTS eliminacion_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL',
  // Candado: solo la aplicación puede borrar hospedajes (ver db/schema.sql #PROTEGER_BORRADO)
  `CREATE TABLE IF NOT EXISTS intentos_borrado (
     id         SERIAL PRIMARY KEY,
     fecha      TIMESTAMP NOT NULL DEFAULT NOW(),
     consulta   TEXT,
     usuario_bd TEXT,
     aplicacion TEXT,
     ip         INET
   )`,
  'ALTER TABLE intentos_borrado ENABLE ROW LEVEL SECURITY',
  `CREATE OR REPLACE FUNCTION proteger_borrado_hospedajes() RETURNS trigger
   LANGUAGE plpgsql AS $$
   BEGIN
     IF current_setting('app.permitir_borrado', true) = 'si' THEN
       IF TG_LEVEL = 'ROW' THEN
         RETURN OLD;
       END IF;
       RETURN NULL;
     END IF;
     IF TG_OP = 'TRUNCATE' THEN
       RAISE EXCEPTION 'Borrado bloqueado: solo la aplicación puede borrar hospedajes.';
     END IF;
     IF TG_LEVEL = 'STATEMENT' THEN
       INSERT INTO intentos_borrado (consulta, usuario_bd, aplicacion, ip)
       VALUES (left(current_query(), 1000), current_user, current_setting('application_name', true), inet_client_addr());
       RETURN NULL;
     END IF;
     RETURN NULL;
   END $$`,
  'DROP TRIGGER IF EXISTS proteger_borrado_consulta ON hospedajes',
  `CREATE TRIGGER proteger_borrado_consulta BEFORE DELETE ON hospedajes
     FOR EACH STATEMENT EXECUTE FUNCTION proteger_borrado_hospedajes()`,
  'DROP TRIGGER IF EXISTS proteger_borrado_fila ON hospedajes',
  `CREATE TRIGGER proteger_borrado_fila BEFORE DELETE ON hospedajes
     FOR EACH ROW EXECUTE FUNCTION proteger_borrado_hospedajes()`,
  'DROP TRIGGER IF EXISTS proteger_vaciado ON hospedajes',
  `CREATE TRIGGER proteger_vaciado BEFORE TRUNCATE ON hospedajes
     FOR EACH STATEMENT EXECUTE FUNCTION proteger_borrado_hospedajes()`,
];

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl });
  db.on('notice', (aviso) => console.log('Aviso:', aviso.message));
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
