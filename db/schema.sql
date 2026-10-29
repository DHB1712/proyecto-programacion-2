-- ==========================================================
-- #TABLAS
-- TABLAS DE LA BASE DE DATOS (PostgreSQL)
-- Hoteles y hospedajes de Antigua Guatemala - Grupo 4
--
-- Este archivo lo ejecuta "npm run db:init".
-- OJO: primero BORRA las tablas y luego las crea de nuevo.
-- ==========================================================

-- Borramos las tablas si ya existían (lugares y categorias eran de una versión anterior)
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
  correo        VARCHAR(120),                  -- también puede iniciar sesión con el correo
  password_hash TEXT NOT NULL,                 -- contraseña CIFRADA (nunca la contraseña real)
  rol           VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'registrador', 'cliente')),
  activo        BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE = no puede entrar
  creado_en     TIMESTAMP NOT NULL DEFAULT NOW()
);


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

  creado_por     INTEGER REFERENCES usuarios(id),    -- quién lo registró
  creado_en      TIMESTAMP NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);


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
