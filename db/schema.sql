-- ==========================================================
-- #TABLAS
-- TABLAS DE LA BASE DE DATOS (PostgreSQL)
-- Hoteles y hospedajes de Antigua Guatemala - Grupo 4
--
-- Este archivo lo ejecuta "npm run db:init".
-- OJO: primero BORRA las tablas y luego las crea de nuevo.
-- ==========================================================

-- Borramos las tablas si ya existían (lugares y categorias eran de una versión anterior)
DROP TABLE IF EXISTS intentos_borrado;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS lugares;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS favoritos;
DROP TABLE IF EXISTS hospedajes;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS tipos_hospedaje;


-- ----------------------------------------------------------
-- #TABLA_TIPOS
-- Tipos de hospedaje: Hotel, Hostal, Posada...
-- ----------------------------------------------------------
CREATE TABLE tipos_hospedaje (
  id          SERIAL PRIMARY KEY,               -- número que se pone solo (1, 2, 3...)
  nombre      VARCHAR(80) NOT NULL UNIQUE,      -- ej: 'Hotel boutique'
  slug        VARCHAR(40) NOT NULL UNIQUE,      -- nombre corto para la dirección web, ej: 'hotel-boutique'
  descripcion TEXT,
  icono       VARCHAR(40) DEFAULT 'bi-building', -- ícono de Bootstrap Icons
  activo      BOOLEAN NOT NULL DEFAULT TRUE     -- FALSE = no aparece en las listas
);


-- ----------------------------------------------------------
-- #TABLA_USUARIOS
-- Personas que pueden iniciar sesión.
-- rol: 'admin' (administrador), 'registrador' (integrante del grupo)
--      o 'cliente' (crea su cuenta para guardar favoritos)
-- ----------------------------------------------------------
CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  usuario       VARCHAR(50) NOT NULL UNIQUE,   -- con esto inicia sesión
  correo        VARCHAR(120) UNIQUE,           -- también puede iniciar sesión con el correo (no se repite)
  password_hash TEXT NOT NULL,                 -- contraseña CIFRADA (nunca la contraseña real)
  rol           VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'registrador', 'cliente')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE = no puede entrar
  permisos      TEXT[],                        -- #ROLES permisos ajustados a esta cuenta (NULL = los de su rol)
  es_principal  BOOLEAN NOT NULL DEFAULT FALSE, -- #ADMIN_PRINCIPAL TRUE = administrador principal (no se le puede quitar nada)
  creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Solo puede haber UN administrador principal
CREATE UNIQUE INDEX usuarios_un_principal ON usuarios (es_principal) WHERE es_principal;


-- ----------------------------------------------------------
-- #TABLA_ROLES
-- Permisos de cada rol (la lista de permisos está en src/permisos.js).
-- El administrador siempre tiene todos y el cliente ninguno;
-- los del registrador se cambian en Administración -> Roles.
-- ----------------------------------------------------------
CREATE TABLE roles (
  slug        VARCHAR(20) PRIMARY KEY,         -- 'admin', 'registrador' o 'cliente'
  nombre      VARCHAR(50) NOT NULL,
  descripcion TEXT,
  permisos    TEXT[] NOT NULL DEFAULT '{}'
);

INSERT INTO roles (slug, nombre, descripcion, permisos) VALUES
  ('admin', 'Administrador', 'Acceso total al sistema.',
   '{registrar,propios,editar_todos,eliminar_todos,aprobar,publicar,estado,tipos,usuarios}'),
  ('registrador', 'Registrador', 'Registra hospedajes; sus funciones las decide el administrador.',
   '{registrar,propios,editar_todos,publicar}'),
  ('cliente', 'Cliente', 'Consulta hospedajes y guarda favoritos.', '{}');


-- ----------------------------------------------------------
-- #TABLA_HOSPEDAJES
-- La tabla principal: un registro por cada hotel u hospedaje.
-- ----------------------------------------------------------
CREATE TABLE hospedajes (
  id             SERIAL PRIMARY KEY,
  codigo         VARCHAR(20) UNIQUE,                 -- ej: 'HOT-0007'
  nombre         VARCHAR(150) NOT NULL,
  tipo_id        INTEGER NOT NULL REFERENCES tipos_hospedaje(id),  -- qué tipo es (Hotel, Hostal...)
  descripcion    TEXT,
  departamento   VARCHAR(60) NOT NULL DEFAULT 'Sacatepéquez',
  municipio      VARCHAR(60) NOT NULL DEFAULT 'Antigua Guatemala',
  direccion      VARCHAR(200),

  -- #COORDENADAS: la ubicación en el mapa
  -- (la latitud va de -90 a 90 y la longitud de -180 a 180)
  latitud        NUMERIC(9,6) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
  longitud       NUMERIC(9,6) NOT NULL CHECK (longitud BETWEEN -180 AND 180),

  -- Contacto (todo opcional)
  telefono       VARCHAR(30),
  correo         VARCHAR(120),
  sitio_web      VARCHAR(200),
  contacto       VARCHAR(200),                       -- redes sociales u otros

  precio_desde   NUMERIC(10,2) CHECK (precio_desde IS NULL OR precio_desde >= 0),  -- precio por noche en quetzales
  servicios      TEXT[] NOT NULL DEFAULT '{}',       -- lista de servicios, ej: {wifi,parqueo}
  foto_url       VARCHAR(300),                       -- enlace de una foto (opcional)
  enlace_maps    VARCHAR(500),                       -- #GOOGLE_MAPS página del hotel en Google Maps (opcional)
  es_ejemplo     BOOLEAN NOT NULL DEFAULT FALSE,     -- TRUE = datos de muestra sin verificar

  -- Estado del registro
  estado         VARCHAR(10) NOT NULL DEFAULT 'activo'
                 CHECK (estado IN ('activo', 'inactivo')),             -- inactivo = oculto del catálogo
  revision       VARCHAR(12) NOT NULL DEFAULT 'pendiente'
                 CHECK (revision IN ('pendiente', 'aprobado', 'rechazado')),  -- lo decide el admin
  observacion    TEXT,                               -- por qué se rechazó

  -- #SOLICITUD_ELIMINACION: un registrador pide borrar su hotel y un administrador lo aprueba
  eliminacion_solicitada TIMESTAMP,                  -- cuándo se pidió (NULL = no hay solicitud)
  eliminacion_motivo     TEXT,                       -- por qué quiere eliminarlo
  eliminacion_por        INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,  -- quién lo pidió

  creado_por     INTEGER REFERENCES usuarios(id),    -- quién lo registró
  creado_en      TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);


-- #DUPLICADOS: no puede haber dos hospedajes con el mismo nombre
-- (sin importar mayúsculas ni espacios al inicio o al final)
CREATE UNIQUE INDEX hospedajes_nombre_unico ON hospedajes (LOWER(TRIM(nombre)));


-- ----------------------------------------------------------
-- #TABLA_FAVORITOS
-- Qué hospedajes guardó cada usuario con el corazón.
-- ON DELETE CASCADE: si se borra el usuario o el hotel, se borra su favorito.
-- ----------------------------------------------------------
CREATE TABLE favoritos (
  usuario_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  hospedaje_id INTEGER NOT NULL REFERENCES hospedajes(id) ON DELETE CASCADE,
  creado_en    TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (usuario_id, hospedaje_id)   -- el mismo favorito no se puede repetir
);


-- ----------------------------------------------------------
-- #SEGURIDAD_SUPABASE
-- Seguridad por filas (RLS). Supabase publica una API que puede leer y
-- borrar las tablas; con RLS activado y sin reglas, esa API no puede tocarlas.
-- Nuestra aplicación no se ve afectada: entra como "postgres", el dueño de
-- las tablas. (En un PostgreSQL normal esto tampoco cambia nada.)
-- ----------------------------------------------------------
ALTER TABLE tipos_hospedaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospedajes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoritos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles           ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------
-- #PROTEGER_BORRADO
-- Candado: solo nuestra aplicación puede borrar hospedajes.
-- Antes de borrar, la aplicación avisa con:
--   SELECT set_config('app.permitir_borrado', 'si', true);
-- Si otro programa (o el panel de Supabase) intenta borrar sin ese aviso,
-- no se borra nada y el intento queda anotado en "intentos_borrado".
-- Para ver los intentos:  SELECT * FROM intentos_borrado ORDER BY fecha DESC;
-- ----------------------------------------------------------
CREATE TABLE intentos_borrado (
  id         SERIAL PRIMARY KEY,
  fecha      TIMESTAMP NOT NULL DEFAULT NOW(),
  consulta   TEXT,           -- la consulta que intentó borrar
  usuario_bd TEXT,           -- usuario de la base con el que entró
  aplicacion TEXT,           -- nombre del programa (si lo manda)
  ip         INET            -- desde dónde se conectó
);
ALTER TABLE intentos_borrado ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION proteger_borrado_hospedajes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Nuestra aplicación abrió el candado: se borra normal
  IF current_setting('app.permitir_borrado', true) = 'si' THEN
    IF TG_LEVEL = 'ROW' THEN
      RETURN OLD;
    END IF;
    RETURN NULL;
  END IF;

  -- TRUNCATE (vaciar la tabla) no se puede saltar: se rechaza con error
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'Borrado bloqueado: solo la aplicación puede borrar hospedajes.';
  END IF;

  -- Una vez por consulta: anotamos quién intentó borrar
  IF TG_LEVEL = 'STATEMENT' THEN
    INSERT INTO intentos_borrado (consulta, usuario_bd, aplicacion, ip)
    VALUES (left(current_query(), 1000), current_user, current_setting('application_name', true), inet_client_addr());
    RETURN NULL;
  END IF;

  -- Por cada fila: devolver NULL hace que esa fila NO se borre
  RETURN NULL;
END $$;

CREATE TRIGGER proteger_borrado_consulta BEFORE DELETE ON hospedajes
  FOR EACH STATEMENT EXECUTE FUNCTION proteger_borrado_hospedajes();
CREATE TRIGGER proteger_borrado_fila BEFORE DELETE ON hospedajes
  FOR EACH ROW EXECUTE FUNCTION proteger_borrado_hospedajes();
CREATE TRIGGER proteger_vaciado BEFORE TRUNCATE ON hospedajes
  FOR EACH STATEMENT EXECUTE FUNCTION proteger_borrado_hospedajes();


-- ----------------------------------------------------------
-- #ADMIN_PRINCIPAL
-- Candado del administrador principal: nadie le puede quitar el rol de
-- administrador, desactivarlo, recortarle permisos, quitarle la marca ni
-- borrar su cuenta (ni la aplicación, ni alguien que entre directo a la base).
-- Sí puede cambiar su nombre, correo y contraseña desde "Mi cuenta".
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION proteger_admin_principal() RETURNS trigger
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
END $$;

CREATE TRIGGER proteger_admin_principal BEFORE UPDATE OR DELETE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION proteger_admin_principal();
