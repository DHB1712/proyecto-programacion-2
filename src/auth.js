// ==========================================================
// #TOKEN  #PERMISOS  #ROLES
// INICIO DE SESIÓN Y PERMISOS
// Cuando alguien inicia sesión le damos un "token": un texto
// especial que el navegador guarda y manda en cada petición.
// Con ese token sabemos quién es el usuario y qué rol tiene.
//
// Roles:
//   admin       -> puede hacer todo
//   registrador -> registra hospedajes (integrantes del grupo)
//   cliente     -> solo guarda favoritos
// ==========================================================
const jwt = require('jsonwebtoken');
const pool = require('./db');

// Clave secreta para firmar los tokens (está en el .env)
const CLAVE_SECRETA = process.env.JWT_SECRET || 'clave-de-desarrollo';

// #TOKEN - Crea el token de un usuario. Dura 8 horas.
function crearToken(usuario) {
  const datos = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
  return jwt.sign(datos, CLAVE_SECRETA, { expiresIn: '8h' });
}

// Revisa si la petición trae un token y averigua quién es el usuario.
// Si no hay token, req.usuario queda en null (es un visitante).
async function leerUsuario(req, res, next) {
  req.usuario = null;

  // El token viene así: "Authorization: Bearer abc123..."
  const encabezado = req.headers.authorization || '';
  if (!encabezado.startsWith('Bearer ')) {
    return next();
  }
  const token = encabezado.replace('Bearer ', '');

  // Comprobamos que el token sea válido
  let datos;
  try {
    datos = jwt.verify(token, CLAVE_SECRETA);
  } catch (error) {
    return next(); // token vencido o falso: lo tratamos como visitante
  }

  // Buscamos al usuario en la base para tener su rol actual
  // (así, si el admin le cambia el rol o lo desactiva, aplica de una vez)
  try {
    const resultado = await pool.query('SELECT id, nombre, rol, activo FROM usuarios WHERE id = $1', [datos.id]);
    const usuario = resultado.rows[0];
    if (usuario && usuario.activo) {
      req.usuario = { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol };
    }
    next();
  } catch (error) {
    next(error);
  }
}

// ----- Filtros para proteger rutas -----   #PERMISOS
// Se ponen en las rutas así: router.post('/', requiereEditor, ...)

// Solo deja pasar si el usuario inició sesión
function requiereSesion(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Debe iniciar sesión.' });
  }
  next();
}

// Solo deja pasar al administrador y a los registradores
function requiereEditor(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Debe iniciar sesión.' });
  }
  if (req.usuario.rol !== 'admin' && req.usuario.rol !== 'registrador') {
    return res.status(403).json({ error: 'Su cuenta no tiene permiso para registrar hospedajes.' });
  }
  next();
}

// Solo deja pasar al administrador
function requiereAdmin(req, res, next) {
  if (!req.usuario || req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede realizar esta acción.' });
  }
  next();
}

module.exports = { crearToken, leerUsuario, requiereSesion, requiereEditor, requiereAdmin };
