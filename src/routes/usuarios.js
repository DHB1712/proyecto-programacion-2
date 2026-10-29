// ==========================================================
// #API_USUARIOS
// RUTAS DE USUARIOS E INICIO DE SESIÓN
//   POST  /api/auth/login      -> iniciar sesión (con usuario o correo)
//   POST  /api/auth/registro   -> crear cuenta de cliente
//   GET   /api/auth/yo         -> ver mis datos
//   PUT   /api/auth/yo         -> cambiar mi nombre y correo
//   PUT   /api/auth/password   -> cambiar mi contraseña
//   GET   /api/usuarios        -> lista de usuarios (admin)
//   POST  /api/usuarios        -> crear usuario (admin)
//   PATCH /api/usuarios/5      -> cambiar rol o activar/desactivar (admin)
//
// Las contraseñas NO se guardan tal cual: se guardan cifradas con bcrypt.
// ==========================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { crearToken, requiereSesion, requiereAdmin } = require('../auth');

const router = express.Router();

// Lo que recibe el navegador al iniciar sesión: el token y los datos del usuario
function datosDeSesion(usuario) {
  return {
    token: crearToken(usuario),
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      usuario: usuario.usuario,
      correo: usuario.correo,
      rol: usuario.rol,
    },
  };
}

// Revisa los datos de una cuenta nueva. Devuelve el mensaje de error, o null si está bien.
function validarCuenta(nombre, usuario, correo, password) {
  if (nombre === '') {
    return 'El nombre es obligatorio.';
  }
  // Usuario: de 3 a 50 caracteres, solo minúsculas, números, punto, guion o guion bajo
  if (!/^[a-z0-9._-]{3,50}$/.test(usuario)) {
    return 'El usuario debe tener de 3 a 50 caracteres: letras minúsculas, números, punto, guion o guion bajo.';
  }
  if (correo && !correo.includes('@')) {
    return 'El correo no es válido.';
  }
  if (password.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return null;
}

// ==========================================================
// SESIÓN
// ==========================================================

// #INICIO_SESION - Iniciar sesión (revisa usuario y contraseña y devuelve el token)
router.post('/auth/login', async function (req, res, next) {
  try {
    const usuarioOCorreo = String(req.body.usuario || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    // Se puede entrar con el nombre de usuario o con el correo
    const resultado = await pool.query(
      'SELECT * FROM usuarios WHERE usuario = $1 OR correo = $1',
      [usuarioOCorreo]
    );
    const usuario = resultado.rows[0];

    // #CONTRASENA_CIFRADA - Comparamos la contraseña escrita con la cifrada que está en la base
    if (!usuario || !(await bcrypt.compare(password, usuario.password_hash))) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Su cuenta está desactivada. Comuníquese con el administrador.' });
    }

    res.json(datosDeSesion(usuario));
  } catch (error) {
    next(error);
  }
});

// #CREAR_CUENTA - Crear cuenta: cualquier persona puede crear su cuenta de cliente
router.post('/auth/registro', async function (req, res, next) {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const correo = String(req.body.correo || '').trim().toLowerCase() || null;
    const password = String(req.body.password || '');

    const error = validarCuenta(nombre, usuario, correo, password);
    if (error) {
      return res.status(400).json({ error: error });
    }

    // #CONTRASENA_CIFRADA - Ciframos la contraseña antes de guardarla
    const passwordCifrada = await bcrypt.hash(password, 10);

    // Siempre se crea como "cliente" (nadie puede hacerse admin solo)
    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, usuario, correo, password_hash, rol)
       VALUES ($1, $2, $3, $4, 'cliente') RETURNING *`,
      [nombre, usuario, correo, passwordCifrada]
    );

    // Lo dejamos con la sesión iniciada de una vez
    res.status(201).json(datosDeSesion(resultado.rows[0]));
  } catch (error) {
    // 23505 = valor repetido: ese usuario ya existe
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ese nombre de usuario ya está en uso. Elija otro.' });
    }
    next(error);
  }
});

// #MI_CUENTA - Ver mis datos (con cuántos favoritos y registros tengo)
router.get('/auth/yo', requiereSesion, async function (req, res, next) {
  try {
    const resultado = await pool.query(
      `SELECT id, nombre, usuario, correo, rol, creado_en,
              (SELECT COUNT(*)::int FROM favoritos WHERE usuario_id = $1) AS favoritos,
              (SELECT COUNT(*)::int FROM hospedajes WHERE creado_por = $1) AS registros
       FROM usuarios WHERE id = $1`,
      [req.usuario.id]
    );
    res.json(resultado.rows[0]);
  } catch (error) {
    next(error);
  }
});

// #MI_CUENTA - Cambiar mi nombre y correo
router.put('/auth/yo', requiereSesion, async function (req, res, next) {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const correo = String(req.body.correo || '').trim().toLowerCase() || null;

    if (nombre === '') {
      return res.status(400).json({ error: 'El nombre es obligatorio.' });
    }
    if (correo && !correo.includes('@')) {
      return res.status(400).json({ error: 'El correo no es válido.' });
    }

    const resultado = await pool.query(
      'UPDATE usuarios SET nombre = $1, correo = $2 WHERE id = $3 RETURNING *',
      [nombre, correo, req.usuario.id]
    );
    // Devolvemos un token nuevo porque el nombre cambió
    res.json(datosDeSesion(resultado.rows[0]));
  } catch (error) {
    next(error);
  }
});

// #CAMBIAR_CONTRASENA - Cambiar mi contraseña (hay que escribir la actual)
router.put('/auth/password', requiereSesion, async function (req, res, next) {
  try {
    const actual = String(req.body.actual || '');
    const nueva = String(req.body.nueva || '');

    const resultado = await pool.query('SELECT password_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
    const correcta = await bcrypt.compare(actual, resultado.rows[0].password_hash);
    if (!correcta) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    if (nueva.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const nuevaCifrada = await bcrypt.hash(nueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [nuevaCifrada, req.usuario.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================================
// #ADMIN_USUARIOS
// ADMINISTRACIÓN DE USUARIOS (solo admin)
// ==========================================================

// Lista de usuarios: primero admins, luego registradores y al final clientes
router.get('/usuarios', requiereAdmin, async function (req, res, next) {
  try {
    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.usuario, u.correo, u.rol, u.activo,
              (SELECT COUNT(*)::int FROM hospedajes h WHERE h.creado_por = u.id) AS registros
       FROM usuarios u
       ORDER BY CASE u.rol WHEN 'admin' THEN 0 WHEN 'registrador' THEN 1 ELSE 2 END, u.usuario`
    );
    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

// Crear un usuario con el rol que elija el admin
router.post('/usuarios', requiereAdmin, async function (req, res, next) {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const usuario = String(req.body.usuario || '').trim().toLowerCase();
    const correo = String(req.body.correo || '').trim().toLowerCase() || null;
    const password = String(req.body.password || '');

    let rol = req.body.rol;
    if (rol !== 'admin' && rol !== 'registrador' && rol !== 'cliente') {
      rol = 'registrador';
    }

    const error = validarCuenta(nombre, usuario, correo, password);
    if (error) {
      return res.status(400).json({ error: error });
    }

    const passwordCifrada = await bcrypt.hash(password, 10);
    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, usuario, correo, password_hash, rol)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nombre, usuario, correo, passwordCifrada, rol]
    );
    res.status(201).json({ id: resultado.rows[0].id });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
    }
    next(error);
  }
});

// #ROLES - Cambiar el rol o activar/desactivar un usuario
router.patch('/usuarios/:id', requiereAdmin, async function (req, res, next) {
  try {
    const id = Number(req.params.id) || 0;

    // El admin no se puede quitar el rol ni desactivar a sí mismo
    if (id === req.usuario.id) {
      return res.status(400).json({ error: 'No puede cambiar su propio usuario desde aquí.' });
    }

    let resultado;
    if (req.body.rol !== undefined) {
      const rol = req.body.rol;
      if (rol !== 'admin' && rol !== 'registrador' && rol !== 'cliente') {
        return res.status(400).json({ error: 'Rol no válido.' });
      }
      resultado = await pool.query('UPDATE usuarios SET rol = $1 WHERE id = $2', [rol, id]);
    } else if (typeof req.body.activo === 'boolean') {
      resultado = await pool.query('UPDATE usuarios SET activo = $1 WHERE id = $2', [req.body.activo, id]);
    } else {
      return res.status(400).json({ error: 'No hay cambios.' });
    }

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
