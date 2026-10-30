// ==========================================================
// #API_USUARIOS
// RUTAS DE USUARIOS E INICIO DE SESIÓN
//   POST  /api/auth/login      -> iniciar sesión (con usuario o correo)
//   POST  /api/auth/registro   -> crear cuenta de cliente
//   GET   /api/auth/yo         -> ver mis datos
//   PUT   /api/auth/yo         -> cambiar mi nombre y correo
//   PUT   /api/auth/password   -> cambiar mi contraseña
//   GET   /api/usuarios        -> lista de usuarios (permiso "usuarios")
//   POST  /api/usuarios        -> crear usuario (permiso "usuarios")
//   PATCH /api/usuarios/5      -> cambiar rol, permisos o activar/desactivar (permiso "usuarios")
//   GET   /api/roles           -> roles con sus permisos (permiso "usuarios")
//   PUT   /api/roles/registrador -> cambiar los permisos del rol registrador (permiso "usuarios")
//
// Las contraseñas NO se guardan tal cual: se guardan cifradas con bcrypt.
// ==========================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { crearToken, requiereSesion, requierePermiso } = require('../auth');
const { PERMISOS, limpiarPermisos, permisosDe } = require('../permisos');

const router = express.Router();

// Usuarios y roles solo los maneja quien tiene el permiso "usuarios" (el administrador)
const requiereUsuarios = requierePermiso('usuarios');

// #PERMISOS_EFECTIVOS - Permisos que de verdad tiene una cuenta (según su rol y sus ajustes)
async function permisosDeUsuario(usuario) {
  const rol = await pool.query('SELECT permisos FROM roles WHERE slug = $1', [usuario.rol]);
  let permisosRol = null;
  if (rol.rows.length > 0) {
    permisosRol = rol.rows[0].permisos;
  }
  return permisosDe(usuario.rol, usuario.permisos, permisosRol);
}

// Lo que recibe el navegador al iniciar sesión: el token y los datos del usuario
// (los permisos sirven para mostrar solo los botones que puede usar)
async function datosDeSesion(usuario) {
  return {
    token: crearToken(usuario),
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      usuario: usuario.usuario,
      correo: usuario.correo,
      rol: usuario.rol,
      permisos: await permisosDeUsuario(usuario),
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

// 23505 = valor repetido. Según la restricción sabemos si fue el usuario o el correo.
function mensajeRepetido(error) {
  if (error.constraint === 'usuarios_correo_key') {
    return 'Ese correo ya está registrado en otra cuenta.';
  }
  return 'Ese nombre de usuario ya está en uso. Elija otro.';
}

// #LIMITE_INTENTOS - Para que nadie pruebe contraseñas sin parar:
// después de 10 intentos fallidos desde la misma IP hay que esperar 15 minutos.
// Se guarda en memoria (se reinicia si se reinicia el servidor).
const MAX_INTENTOS = 10;
const ESPERA_MS = 15 * 60 * 1000;
const intentosFallidos = new Map();   // ip -> { cantidad, desde }

function estaBloqueado(ip) {
  const registro = intentosFallidos.get(ip);
  if (!registro) {
    return false;
  }
  if (Date.now() - registro.desde > ESPERA_MS) {
    intentosFallidos.delete(ip);   // ya pasó el tiempo de espera
    return false;
  }
  return registro.cantidad >= MAX_INTENTOS;
}

function anotarFallo(ip) {
  const registro = intentosFallidos.get(ip);
  if (registro && Date.now() - registro.desde <= ESPERA_MS) {
    registro.cantidad++;
  } else {
    intentosFallidos.set(ip, { cantidad: 1, desde: Date.now() });
  }
}

// ==========================================================
// SESIÓN
// ==========================================================

// #INICIO_SESION - Iniciar sesión (revisa usuario y contraseña y devuelve el token)
router.post('/auth/login', async function (req, res, next) {
  try {
    if (estaBloqueado(req.ip)) {
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo.' });
    }

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
      anotarFallo(req.ip);
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }
    intentosFallidos.delete(req.ip);   // entró bien: borramos sus fallos
    if (!usuario.activo) {
      return res.status(403).json({ error: 'Su cuenta está desactivada. Comuníquese con el administrador.' });
    }

    res.json(await datosDeSesion(usuario));
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
    res.status(201).json(await datosDeSesion(resultado.rows[0]));
  } catch (error) {
    // 23505 = valor repetido: ese usuario o correo ya existe
    if (error.code === '23505') {
      return res.status(409).json({ error: mensajeRepetido(error) });
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
    // Con los permisos actuales, para que las páginas muestren los botones correctos
    res.json(Object.assign(resultado.rows[0], { permisos: req.usuario.permisos }));
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
    res.json(await datosDeSesion(resultado.rows[0]));
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: mensajeRepetido(error) });
    }
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
// ADMINISTRACIÓN DE USUARIOS (permiso "usuarios": el administrador)
// ==========================================================

// Lista de usuarios: primero admins, luego registradores y al final clientes.
// "ajustados" = la cuenta tiene permisos propios distintos a los de su rol.
router.get('/usuarios', requiereUsuarios, async function (req, res, next) {
  try {
    const resultado = await pool.query(
      `SELECT u.id, u.nombre, u.usuario, u.correo, u.rol, u.activo, u.permisos, u.es_principal, r.permisos AS permisos_rol,
              (SELECT COUNT(*)::int FROM hospedajes h WHERE h.creado_por = u.id) AS registros
       FROM usuarios u LEFT JOIN roles r ON r.slug = u.rol
       ORDER BY u.es_principal DESC, CASE u.rol WHEN 'admin' THEN 0 WHEN 'registrador' THEN 1 ELSE 2 END, u.usuario`
    );
    const usuarios = resultado.rows.map(function (u) {
      return {
        id: u.id, nombre: u.nombre, usuario: u.usuario, correo: u.correo, rol: u.rol, activo: u.activo,
        registros: u.registros,
        es_principal: u.es_principal,
        permisos: permisosDe(u.rol, u.permisos, u.permisos_rol),
        ajustados: u.rol === 'registrador' && Array.isArray(u.permisos),
      };
    });
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
});

// Crear un usuario con el rol que elija el admin
router.post('/usuarios', requiereUsuarios, async function (req, res, next) {
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
      return res.status(409).json({ error: mensajeRepetido(error) });
    }
    next(error);
  }
});

// #ROLES - Cambiar el rol, los permisos o activar/desactivar un usuario
router.patch('/usuarios/:id', requiereUsuarios, async function (req, res, next) {
  try {
    const id = Number(req.params.id) || 0;

    // El admin no se puede quitar el rol, los permisos ni desactivar a sí mismo
    if (id === req.usuario.id) {
      return res.status(400).json({ error: 'No puede cambiar su propio usuario desde aquí.' });
    }

    // #ADMIN_PRINCIPAL - Al administrador principal nadie le puede cambiar el rol, los permisos ni desactivarlo
    // (la base de datos también lo impide con el trigger proteger_admin_principal)
    const objetivo = await pool.query('SELECT es_principal FROM usuarios WHERE id = $1', [id]);
    if (objetivo.rowCount > 0 && objetivo.rows[0].es_principal) {
      return res.status(403).json({ error: 'El administrador principal no se puede modificar: siempre es administrador con acceso total.' });
    }

    let resultado;
    if (req.body.rol !== undefined) {
      const rol = req.body.rol;
      if (rol !== 'admin' && rol !== 'registrador' && rol !== 'cliente') {
        return res.status(400).json({ error: 'Rol no válido.' });
      }
      // Al cambiar de rol, la cuenta vuelve a los permisos normales de su nuevo rol
      resultado = await pool.query('UPDATE usuarios SET rol = $1, permisos = NULL WHERE id = $2', [rol, id]);
    } else if (req.body.permisos !== undefined) {
      // #ROLES - Permisos de una cuenta: solo se ajustan a registradores
      // (el administrador siempre tiene todos y el cliente ninguno).
      // permisos: null -> vuelve a los permisos de su rol
      const cuenta = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [id]);
      if (cuenta.rowCount === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
      if (cuenta.rows[0].rol !== 'registrador') {
        return res.status(400).json({ error: 'Solo se pueden ajustar los permisos de un registrador.' });
      }
      let permisos = null;
      if (req.body.permisos !== null) {
        permisos = limpiarPermisos(req.body.permisos);
      }
      resultado = await pool.query('UPDATE usuarios SET permisos = $1 WHERE id = $2', [permisos, id]);
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

// ==========================================================
// #ROLES
// ROLES Y SUS PERMISOS (permiso "usuarios": el administrador)
// ==========================================================

// Lista de permisos que existen y los roles con sus permisos y cuántas cuentas tienen
router.get('/roles', requiereUsuarios, async function (req, res, next) {
  try {
    const resultado = await pool.query(
      `SELECT r.slug, r.nombre, r.descripcion, r.permisos,
              (SELECT COUNT(*)::int FROM usuarios u WHERE u.rol = r.slug) AS cuentas
       FROM roles r
       ORDER BY CASE r.slug WHEN 'admin' THEN 0 WHEN 'registrador' THEN 1 ELSE 2 END`
    );
    const roles = resultado.rows.map(function (r) {
      return {
        slug: r.slug, nombre: r.nombre, descripcion: r.descripcion, cuentas: r.cuentas,
        permisos: permisosDe(r.slug, null, r.permisos),
        editable: r.slug === 'registrador',   // admin = todo y cliente = nada: no se cambian
      };
    });
    res.json({ permisos: PERMISOS, roles: roles });
  } catch (error) {
    next(error);
  }
});

// Cambiar los permisos del rol registrador (aplica a todos los registradores sin ajustes propios)
router.put('/roles/:slug', requiereUsuarios, async function (req, res, next) {
  try {
    if (req.params.slug !== 'registrador') {
      return res.status(400).json({ error: 'Solo se pueden cambiar los permisos del rol Registrador.' });
    }
    const permisos = limpiarPermisos(req.body.permisos);
    await pool.query('UPDATE roles SET permisos = $1 WHERE slug = $2', [permisos, 'registrador']);
    res.json({ ok: true, permisos: permisos });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
