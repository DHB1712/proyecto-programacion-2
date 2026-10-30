// ==========================================================
// #SERVIDOR
// SERVIDOR PRINCIPAL
// Este es el archivo que se ejecuta con "npm start".
// - Muestra las páginas de la carpeta "public".
// - Tiene la API (/api/...) que usan las páginas para pedir
//   y guardar datos en la base de datos.
// ==========================================================

// Cargamos los datos del archivo .env (contraseña de la base, puerto...)
require('dotenv').config();

const express = require('express');
const { leerUsuario } = require('./src/auth');

const app = express();

// En Render las peticiones pasan por un proxy: así req.ip es la IP real del visitante
// (se usa para limitar los intentos de inicio de sesión)
app.set('trust proxy', 1);

// #SEGURIDAD - Encabezados básicos de seguridad en todas las respuestas
app.disable('x-powered-by');   // no decimos que usamos Express
app.use(function (req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');            // el navegador no adivina tipos de archivo
  res.set('X-Frame-Options', 'SAMEORIGIN');                // otras páginas no nos pueden meter en un iframe
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Para poder recibir datos en formato JSON desde las páginas
app.use(express.json());

// Para mostrar las páginas de la carpeta "public"
app.use(express.static(__dirname + '/public'));

// Antes de cada ruta de la API revisamos si el usuario inició sesión
app.use('/api', leerUsuario);

// ----- Rutas de la API -----   #RUTAS_API
// Cada línea conecta una dirección (/api/...) con su archivo en src/routes
app.use('/api/hospedajes', require('./src/routes/hospedajes'));
app.use('/api/tipos', require('./src/routes/tipos'));
app.use('/api/favoritos', require('./src/routes/favoritos'));
app.use('/api', require('./src/routes/usuarios'));

// Lista de servicios (wifi, parqueo...)
app.get('/api/servicios', function (req, res) {
  res.json(require('./src/servicios'));
});

// Si piden una ruta de la API que no existe
app.use('/api', function (req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ----- Errores -----   #ERRORES
// Si algo falla en una ruta, llega aquí.
// Para los errores más comunes de PostgreSQL damos un mensaje claro.
app.use(function (error, req, res, next) {
  let mensaje = 'Error interno del servidor.';

  if (error.code === 'ECONNREFUSED') {
    mensaje = 'No se pudo conectar a PostgreSQL. Revise que esté encendido.';
  } else if (error.code === '28P01') {
    mensaje = 'La contraseña de PostgreSQL en el archivo .env es incorrecta.';
  } else if (error.code === '3D000') {
    mensaje = 'La base de datos no existe. Ejecute: npm run db:init';
  } else if (error.code === '42P01') {
    mensaje = 'Las tablas no existen. Ejecute: npm run db:init';
  }

  console.error(error);
  res.status(500).json({ error: mensaje });
});

// ----- Encender el servidor -----   #PUERTO
const PUERTO = process.env.PORT || 3000;

app.listen(PUERTO, function () {
  console.log('Servidor listo en http://localhost:' + PUERTO);
});
