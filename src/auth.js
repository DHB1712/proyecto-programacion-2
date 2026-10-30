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
const { permisosDe } = require('./permisos');

// Clave secreta para firmar los tokens (está en el .env)
// En internet (Render) es obligatoria: con la clave de desarrollo, que está
// en el código, cualquiera podría fabricar un token de administrador.
const EN_PRODUCCION = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
if (!process.env.JWT_SECRET && EN_PRODUCCION) {
  throw new Error('Falta la variable JWT_SECRET. Agréguela en Render con un texto largo y secreto.');
}
if (!process.env.JWT_SECRET) {
  console.warn('Aviso: no hay JWT_SECRET en el .env; se usa la clave de desarrollo.');
}
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

  // Buscamos al usuario en la base para tener su rol y sus permisos actuales
  // (así, si el admin le cambia el rol o los permisos, o lo desactiva, aplica de una vez)
  try {
    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.rol, u.activo, u.permisos, r.permisos AS permisos_rol
       FROM usuarios u LEFT JOIN roles r ON r.slug = u.rol
       WHERE u.id = $1`,
      [datos.id]
    );
    const usuario = resultado.rows[0];
    if (usuario && usuario.activo) {
      req.usuario = {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        permisos: permisosDe(usuario.rol, usuario.permisos, usuario.permisos_rol),
      };
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

// ¿La cuenta tiene este permiso? (la lista de permisos está en src/permisos.js)
function tienePermiso(usuario, permiso) {
  return usuario !== null && usuario.permisos.includes(permiso);
}

// Deja pasar a quien tenga al menos un permiso de gestión (admin y registradores)
function requiereEditor(req, res, next) {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Debe iniciar sesión.' });
  }
  if (req.usuario.permisos.length === 0) {
    return res.status(403).json({ error: 'Su cuenta no tiene permiso para manejar hospedajes.' });
  }
  next();
}

// #PERMISOS - Deja pasar solo a quien tenga ese permiso.
// Se usa así: router.patch('/:id/revision', requierePermiso('aprobar'), ...)
function requierePermiso(permiso) {
  return function (req, res, next) {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Debe iniciar sesión.' });
    }
    if (!tienePermiso(req.usuario, permiso)) {
      return res.status(403).json({ error: 'Su cuenta no tiene permiso para realizar esta acción.' });
    }
    next();
  };
}

module.exports = { crearToken, leerUsuario, requiereSesion, requiereEditor, requierePermiso, tienePermiso };
