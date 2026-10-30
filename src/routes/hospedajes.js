// ==========================================================
// #API_HOSPEDAJES
// RUTAS DE HOSPEDAJES   (/api/hospedajes)
//
//   GET    /api/hospedajes              -> catálogo (lo ve todo el mundo)
//   GET    /api/hospedajes/filtros      -> departamentos y municipios
//   GET    /api/hospedajes/gestion      -> lista para admin y registradores
//   GET    /api/hospedajes/5            -> detalle del hospedaje 5
//   POST   /api/hospedajes              -> crear
//   PUT    /api/hospedajes/5            -> editar
//   DELETE /api/hospedajes/5            -> eliminar (permiso "eliminar_todos")
//   POST   /api/hospedajes/5/solicitar-eliminacion -> pedir que se elimine uno propio
//   PATCH  /api/hospedajes/5/eliminacion -> aprobar o rechazar esa solicitud (admin)
//   PATCH  /api/hospedajes/5/revision   -> aprobar o rechazar (admin)
//   PATCH  /api/hospedajes/5/estado     -> activar o desactivar (admin)
// ==========================================================
const express = require('express');
const pool = require('../db');
const servicios = require('../servicios');
const { requiereEditor, requierePermiso, tienePermiso } = require('../auth');

// #PERMISOS - ¿Puede ver y manejar los registros de TODOS (no solo los suyos)?
function veTodos(usuario) {
  return ['editar_todos', 'eliminar_todos', 'aprobar', 'estado'].some(function (p) {
    return tienePermiso(usuario, p);
  });
}

// ¿Es suyo y tiene el permiso "propios"? (puede editarlo y pedir que se elimine)
function esPropio(usuario, hospedaje) {
  return tienePermiso(usuario, 'propios') && hospedaje.creado_por === usuario.id;
}

// #PROTEGER_BORRADO - Borra un hospedaje. La base solo deja borrar si avisamos que somos la aplicación.
// set_config(..., true) dura solo esta transacción (BEGIN ... COMMIT).
async function borrarHospedaje(id) {
  const conexion = await pool.connect();
  try {
    await conexion.query('BEGIN');
    await conexion.query("SELECT set_config('app.permitir_borrado', 'si', true)");
    await conexion.query('DELETE FROM hospedajes WHERE id = $1', [id]);
    await conexion.query('COMMIT');
  } catch (error) {
    await conexion.query('ROLLBACK');
    throw error;
  } finally {
    conexion.release();
  }
}

const router = express.Router();

// Consulta base: trae el hospedaje junto con el nombre de su tipo
// y el nombre de la persona que lo registró.
// (::float convierte los números decimales para que lleguen como número y no como texto)
const CONSULTA_BASE = `
  SELECT h.*,
         h.latitud::float AS latitud,
         h.longitud::float AS longitud,
         h.precio_desde::float AS precio_desde,
         h.creado_por AS creado_por_id,
         t.nombre AS tipo, t.slug AS tipo_slug, t.icono, t.activo AS tipo_activo,
         u.nombre AS creado_por,
         ue.nombre AS eliminacion_por_nombre
  FROM hospedajes h
  JOIN tipos_hospedaje t ON t.id = h.tipo_id
  LEFT JOIN usuarios u ON u.id = h.creado_por
  LEFT JOIN usuarios ue ON ue.id = h.eliminacion_por
`;

// #SOLICITUD_ELIMINACION - La solicitud de eliminación solo la ven quien la pidió y quienes manejan todos
function ocultarSolicitud(hospedaje, usuario) {
  const puedeVerla = usuario && (veTodos(usuario) || usuario.id === hospedaje.creado_por_id);
  if (!puedeVerla) {
    delete hospedaje.eliminacion_solicitada;
    delete hospedaje.eliminacion_motivo;
    delete hospedaje.eliminacion_por;
    delete hospedaje.eliminacion_por_nombre;
  }
  return hospedaje;
}

// #GOOGLE_MAPS - Le agrega a un hospedaje el enlace de Google Maps (con sus coordenadas)
function agregarEnlaceMaps(hospedaje) {
  hospedaje.google_maps = 'https://www.google.com/maps?q=' + hospedaje.latitud + ',' + hospedaje.longitud;
  return hospedaje;
}

// #FILTROS - Arma la parte del WHERE según los filtros que mandó la página.
// Por cada filtro agregamos una condición y su valor a la lista "valores".
function filtrosDeBusqueda(filtros, valores) {
  let sql = '';

  // Buscar por texto en nombre, descripción, dirección o código.
  // % y _ son comodines en ILIKE: les ponemos \ delante para buscarlos como texto normal.
  if (filtros.q) {
    const texto = String(filtros.q).replace(/[\\%_]/g, '\\$&');
    valores.push('%' + texto + '%');
    const n = valores.length;
    sql += ` AND (h.nombre ILIKE $${n} OR h.descripcion ILIKE $${n} OR h.direccion ILIKE $${n} OR h.codigo ILIKE $${n})`;
  }

  // Tipo: puede venir el número (id) o el nombre corto (slug), ej: 'hostal'
  if (filtros.tipo) {
    valores.push(filtros.tipo);
    if (isNaN(filtros.tipo)) {
      sql += ` AND t.slug = $${valores.length}`;
    } else {
      sql += ` AND t.id = $${valores.length}`;
    }
  }

  if (filtros.departamento) {
    valores.push(filtros.departamento);
    sql += ` AND h.departamento = $${valores.length}`;
  }

  if (filtros.municipio) {
    valores.push(filtros.municipio);
    sql += ` AND h.municipio = $${valores.length}`;
  }

  // Servicios: vienen separados por coma, ej: 'wifi,parqueo'.
  // El hospedaje debe tenerlos todos (operador @> de PostgreSQL).
  if (filtros.servicios) {
    valores.push(filtros.servicios.split(','));
    sql += ` AND h.servicios @> $${valores.length}::text[]`;
  }

  // Si el precio no es un número válido, no se filtra por precio
  if (filtros.precio_max && !isNaN(filtros.precio_max)) {
    valores.push(Number(filtros.precio_max));
    sql += ` AND h.precio_desde <= $${valores.length}`;
  }

  return sql;
}

// Quita espacios de un texto. Si queda vacío devuelve null.
function limpiar(texto) {
  if (texto === undefined || texto === null) {
    return null;
  }
  texto = String(texto).trim();
  if (texto === '') {
    return null;
  }
  return texto;
}

// Toma los datos que mandó el formulario
function leerFormulario(body) {
  // Solo aceptamos servicios que existan en la lista
  const clavesValidas = servicios.map(function (s) { return s.clave; });
  let serviciosElegidos = [];
  if (Array.isArray(body.servicios)) {
    serviciosElegidos = body.servicios.filter(function (s) { return clavesValidas.includes(s); });
  }

  let precio = null;
  if (limpiar(body.precio_desde) !== null) {
    precio = Number(body.precio_desde);
  }

  return {
    nombre: limpiar(body.nombre),
    tipo_id: Number(body.tipo_id),
    descripcion: limpiar(body.descripcion),
    departamento: limpiar(body.departamento),
    municipio: limpiar(body.municipio),
    direccion: limpiar(body.direccion),
    latitud: limpiar(body.latitud),
    longitud: limpiar(body.longitud),
    telefono: limpiar(body.telefono),
    correo: limpiar(body.correo),
    sitio_web: limpiar(body.sitio_web),
    contacto: limpiar(body.contacto),
    precio_desde: precio,
    servicios: serviciosElegidos,
    foto_url: limpiar(body.foto_url),
    enlace_maps: limpiar(body.enlace_maps),   // #GOOGLE_MAPS enlace a la página del hotel
  };
}

// #VALIDACION  #COORDENADAS
// Revisa que los datos estén bien. Devuelve una lista de errores (vacía si todo está bien).
function validar(datos) {
  const errores = [];

  if (!datos.nombre) errores.push('El nombre es obligatorio.');
  if (!datos.tipo_id) errores.push('El tipo de hospedaje es obligatorio.');
  if (!datos.departamento) errores.push('El departamento es obligatorio.');
  if (!datos.municipio) errores.push('El municipio es obligatorio.');

  // La latitud va de -90 a 90 y la longitud de -180 a 180
  const lat = Number(datos.latitud);
  const lng = Number(datos.longitud);
  if (datos.latitud === null || isNaN(lat) || lat < -90 || lat > 90) {
    errores.push('La latitud debe ser un número entre -90 y 90.');
  }
  if (datos.longitud === null || isNaN(lng) || lng < -180 || lng > 180) {
    errores.push('La longitud debe ser un número entre -180 y 180.');
  }

  if (datos.precio_desde !== null && (isNaN(datos.precio_desde) || datos.precio_desde < 0)) {
    errores.push('El precio debe ser un número mayor o igual a 0.');
  }
  if (datos.correo && !datos.correo.includes('@')) {
    errores.push('El correo no es válido.');
  }
  if (datos.sitio_web && !datos.sitio_web.startsWith('http')) {
    errores.push('El sitio web debe empezar con http:// o https://');
  }
  if (datos.foto_url && !datos.foto_url.startsWith('http')) {
    errores.push('El enlace de la foto debe empezar con http:// o https://');
  }
  if (datos.enlace_maps && !datos.enlace_maps.startsWith('http')) {
    errores.push('El enlace de Google Maps debe empezar con http:// o https://');
  }

  return errores;
}

// #DUPLICADOS - Nombre repetido: NO se permite (sin importar mayúsculas ni espacios de más).
// La base de datos también lo impide con el índice hospedajes_nombre_unico.
async function buscarNombreRepetido(datos, idQueSeEdita) {
  const resultado = await pool.query(
    `SELECT id, codigo, nombre FROM hospedajes
     WHERE id <> $1 AND LOWER(TRIM(nombre)) = LOWER(TRIM($2))`,
    [idQueSeEdita || 0, datos.nombre]
  );
  return resultado.rows;
}

// #DUPLICADOS - Casi en el mismo punto del mapa (unos 20 metros): solo se avisa,
// porque dos hoteles distintos pueden estar uno al lado del otro.
async function buscarMismaUbicacion(datos, idQueSeEdita) {
  const resultado = await pool.query(
    `SELECT id, codigo, nombre FROM hospedajes
     WHERE id <> $1 AND ABS(latitud - $2) < 0.0002 AND ABS(longitud - $3) < 0.0002`,
    [idQueSeEdita || 0, datos.latitud, datos.longitud]
  );
  return resultado.rows;
}

// Revisa los repetidos antes de guardar. Devuelve la respuesta de error, o null si se puede guardar.
async function revisarDuplicados(datos, idQueSeEdita, forzar) {
  const mismoNombre = await buscarNombreRepetido(datos, idQueSeEdita);
  if (mismoNombre.length > 0) {
    return {
      error: 'Ya existe un hospedaje con el nombre "' + mismoNombre[0].nombre + '". Use otro nombre (por ejemplo, agregue la zona o la sucursal).',
      duplicados: mismoNombre,
      puedeForzar: false,
    };
  }

  if (!forzar) {
    const mismaUbicacion = await buscarMismaUbicacion(datos, idQueSeEdita);
    if (mismaUbicacion.length > 0) {
      return {
        error: 'Ya existe un hospedaje casi en la misma ubicación.',
        duplicados: mismaUbicacion,
        puedeForzar: true,
      };
    }
  }
  return null;
}

// Mensaje si la base de datos rechaza un nombre repetido (por ejemplo, si dos personas guardan a la vez)
const MENSAJE_NOMBRE_REPETIDO = 'Ya existe un hospedaje con ese nombre. Use otro nombre.';

// ==========================================================
// CONSULTA PÚBLICA
// ==========================================================

// #CATALOGO - Catálogo: solo hospedajes aprobados y activos, de un tipo activo
router.get('/', async function (req, res, next) {
  try {
    const valores = [];
    let sql = CONSULTA_BASE + " WHERE h.estado = 'activo' AND h.revision = 'aprobado' AND t.activo";
    sql += filtrosDeBusqueda(req.query, valores);

    // Orden: por precio (más barato primero) o por nombre
    if (req.query.orden === 'precio') {
      sql += ' ORDER BY h.precio_desde ASC NULLS LAST, h.nombre';
    } else {
      sql += ' ORDER BY h.nombre';
    }

    const resultado = await pool.query(sql, valores);
    res.json(resultado.rows.map(function (h) {
      return agregarEnlaceMaps(ocultarSolicitud(h, req.usuario));
    }));
  } catch (error) {
    next(error);
  }
});

// Departamentos y municipios que tienen hospedajes (para los filtros)
router.get('/filtros', async function (req, res, next) {
  try {
    const resultado = await pool.query(
      `SELECT DISTINCT h.departamento, h.municipio
       FROM hospedajes h
       JOIN tipos_hospedaje t ON t.id = h.tipo_id
       WHERE h.estado = 'activo' AND h.revision = 'aprobado' AND t.activo
       ORDER BY h.departamento, h.municipio`
    );
    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

// ==========================================================
// GESTIÓN (admin y registradores)
// ==========================================================

// #MIS_REGISTROS - Lista para "Mis registros". Quien tiene permisos sobre todos ve todos; los demás, solo los suyos.
router.get('/gestion', requiereEditor, async function (req, res, next) {
  try {
    const valores = [];
    let sql = CONSULTA_BASE + ' WHERE 1 = 1';

    if (!veTodos(req.usuario)) {
      valores.push(req.usuario.id);
      sql += ` AND h.creado_por = $${valores.length}`;
    }

    sql += filtrosDeBusqueda(req.query, valores);

    if (req.query.revision) {
      valores.push(req.query.revision);
      sql += ` AND h.revision = $${valores.length}`;
    }
    if (req.query.estado) {
      valores.push(req.query.estado);
      sql += ` AND h.estado = $${valores.length}`;
    }
    // ?eliminacion=1 -> solo los que tienen una solicitud de eliminación
    if (req.query.eliminacion === '1') {
      sql += ' AND h.eliminacion_solicitada IS NOT NULL';
    }

    // Primero las solicitudes de eliminación, luego pendientes, rechazados y al final aprobados
    sql += ` ORDER BY (h.eliminacion_solicitada IS NULL),
             CASE h.revision WHEN 'pendiente' THEN 0 WHEN 'rechazado' THEN 1 ELSE 2 END,
             h.actualizado_en DESC`;

    const resultado = await pool.query(sql, valores);
    res.json(resultado.rows.map(agregarEnlaceMaps));
  } catch (error) {
    next(error);
  }
});

// #DETALLE - Detalle de un hospedaje
router.get('/:id', async function (req, res, next) {
  try {
    const id = Number(req.params.id) || 0;
    if (!id) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }

    const resultado = await pool.query(CONSULTA_BASE + ' WHERE h.id = $1', [id]);
    const hospedaje = resultado.rows[0];
    if (!hospedaje) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }

    // Si no está aprobado y activo (o su tipo está desactivado), solo lo ven quienes manejan todos y quien lo registró
    const publico = hospedaje.estado === 'activo' && hospedaje.revision === 'aprobado' && hospedaje.tipo_activo;
    const usuario = req.usuario;
    const puedeVerlo = publico || (usuario && (veTodos(usuario) || usuario.id === hospedaje.creado_por_id));
    if (!puedeVerlo) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }

    res.json(agregarEnlaceMaps(ocultarSolicitud(hospedaje, usuario)));
  } catch (error) {
    next(error);
  }
});

// #CREAR_HOSPEDAJE - Crear un hospedaje (permiso "registrar")
router.post('/', requierePermiso('registrar'), async function (req, res, next) {
  try {
    const datos = leerFormulario(req.body);

    const errores = validar(datos);
    if (errores.length > 0) {
      return res.status(400).json({ error: errores.join(' '), errores: errores });
    }

    // Nombre repetido: se bloquea. Misma ubicación: se avisa (a menos que diga "guardar de todos modos")
    const repetido = await revisarDuplicados(datos, 0, req.body.forzar === true);
    if (repetido) {
      return res.status(409).json(repetido);
    }

    // Con el permiso "publicar" queda aprobado al instante; si no, queda pendiente de revisión
    let revision = 'pendiente';
    if (tienePermiso(req.usuario, 'publicar')) {
      revision = 'aprobado';
    }

    // Guardar y ponerle el código son dos pasos: los hacemos en una transacción
    // (BEGIN ... COMMIT) para que nunca quede un hospedaje sin código.
    const conexion = await pool.connect();
    let id, codigo;
    try {
      await conexion.query('BEGIN');
      const resultado = await conexion.query(
        `INSERT INTO hospedajes
           (nombre, tipo_id, descripcion, departamento, municipio, direccion, latitud, longitud,
            telefono, correo, sitio_web, contacto, precio_desde, servicios, foto_url, revision, creado_por,
            enlace_maps)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
         RETURNING id`,
        [datos.nombre, datos.tipo_id, datos.descripcion, datos.departamento, datos.municipio, datos.direccion,
         datos.latitud, datos.longitud, datos.telefono, datos.correo, datos.sitio_web, datos.contacto,
         datos.precio_desde, datos.servicios, datos.foto_url, revision, req.usuario.id,
         datos.enlace_maps]
      );

      // El código se arma con el id: 7 -> HOT-0007
      id = resultado.rows[0].id;
      codigo = 'HOT-' + String(id).padStart(4, '0');
      await conexion.query('UPDATE hospedajes SET codigo = $1 WHERE id = $2', [codigo, id]);
      await conexion.query('COMMIT');
    } catch (error) {
      await conexion.query('ROLLBACK');
      throw error;   // lo atiende el catch de abajo
    } finally {
      conexion.release();   // devolvemos la conexión al pool
    }

    res.status(201).json({ id: id, codigo: codigo, revision: revision });
  } catch (error) {
    // 23503 = el tipo de hospedaje no existe
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El tipo de hospedaje no existe.' });
    }
    // 23505 = la base rechazó un nombre repetido
    if (error.code === '23505' && error.constraint === 'hospedajes_nombre_unico') {
      return res.status(409).json({ error: MENSAJE_NOMBRE_REPETIDO, puedeForzar: false });
    }
    next(error);
  }
});

// #EDITAR_HOSPEDAJE - Editar un hospedaje
router.put('/:id', requiereEditor, async function (req, res, next) {
  try {
    const id = Number(req.params.id) || 0;
    const resultado = await pool.query('SELECT * FROM hospedajes WHERE id = $1', [id]);
    const hospedaje = resultado.rows[0];
    if (!hospedaje) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }

    // Permiso "editar_todos": cualquiera. Permiso "propios": los que registró esa persona.
    const editaTodos = tienePermiso(req.usuario, 'editar_todos');
    if (!editaTodos && !esPropio(req.usuario, hospedaje)) {
      return res.status(403).json({ error: 'Solo puede editar los hospedajes que usted registró.' });
    }

    const datos = leerFormulario(req.body);
    const errores = validar(datos);
    if (errores.length > 0) {
      return res.status(400).json({ error: errores.join(' '), errores: errores });
    }

    const repetido = await revisarDuplicados(datos, id, req.body.forzar === true);
    if (repetido) {
      return res.status(409).json(repetido);
    }

    // Quien revisa o edita todos no cambia la revisión. Si lo corrige alguien más, vuelve a
    // quedar pendiente (o aprobado, si tiene el permiso "publicar").
    let revision = hospedaje.revision;
    if (!editaTodos && !tienePermiso(req.usuario, 'aprobar')) {
      revision = tienePermiso(req.usuario, 'publicar') ? 'aprobado' : 'pendiente';
    }

    // es_ejemplo: la casilla "Datos de ejemplo" del formulario
    const esEjemplo = req.body.es_ejemplo === true;

    await pool.query(
      `UPDATE hospedajes SET
         nombre = $1, tipo_id = $2, descripcion = $3, departamento = $4, municipio = $5, direccion = $6,
         latitud = $7, longitud = $8, telefono = $9, correo = $10, sitio_web = $11, contacto = $12,
         precio_desde = $13, servicios = $14, foto_url = $15, revision = $16, es_ejemplo = $17,
         enlace_maps = $18, actualizado_en = NOW()
       WHERE id = $19`,
      [datos.nombre, datos.tipo_id, datos.descripcion, datos.departamento, datos.municipio, datos.direccion,
       datos.latitud, datos.longitud, datos.telefono, datos.correo, datos.sitio_web, datos.contacto,
       datos.precio_desde, datos.servicios, datos.foto_url, revision, esEjemplo, datos.enlace_maps, id]
    );

    res.json({ ok: true, revision: revision });
  } catch (error) {
    // 23503 = el tipo de hospedaje no existe
    if (error.code === '23503') {
      return res.status(400).json({ error: 'El tipo de hospedaje no existe.' });
    }
    // 23505 = la base rechazó un nombre repetido
    if (error.code === '23505' && error.constraint === 'hospedajes_nombre_unico') {
      return res.status(409).json({ error: MENSAJE_NOMBRE_REPETIDO, puedeForzar: false });
    }
    next(error);
  }
});

// #ELIMINAR_HOSPEDAJE - Eliminar un hospedaje directamente (permiso "eliminar_todos").
// Quien solo tiene "propios" no borra: envía una solicitud (ruta de abajo).
router.delete('/:id', requierePermiso('eliminar_todos'), async function (req, res, next) {
  try {
    const id = Number(req.params.id) || 0;
    const resultado = await pool.query('SELECT id FROM hospedajes WHERE id = $1', [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }
    await borrarHospedaje(id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// #SOLICITUD_ELIMINACION - Pedir que se elimine un hospedaje que puede editar
// (permiso "editar_todos": cualquiera; permiso "propios": los suyos).
// No se borra todavía: un administrador debe aprobarlo.
router.post('/:id/solicitar-eliminacion', requiereEditor, async function (req, res, next) {
  try {
    const id = Number(req.params.id) || 0;
    const resultado = await pool.query('SELECT creado_por, eliminacion_solicitada FROM hospedajes WHERE id = $1', [id]);
    const hospedaje = resultado.rows[0];
    if (!hospedaje) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }
    if (!tienePermiso(req.usuario, 'editar_todos') && !esPropio(req.usuario, hospedaje)) {
      return res.status(403).json({ error: 'Solo puede pedir que se eliminen los hospedajes que usted registró.' });
    }
    if (hospedaje.eliminacion_solicitada) {
      return res.status(409).json({ error: 'Ya se pidió eliminar este hospedaje; falta que un administrador lo apruebe.' });
    }

    const motivo = limpiar(req.body.motivo);
    if (!motivo) {
      return res.status(400).json({ error: 'Escriba el motivo para eliminar el hospedaje.' });
    }

    await pool.query(
      'UPDATE hospedajes SET eliminacion_solicitada = NOW(), eliminacion_motivo = $1, eliminacion_por = $2 WHERE id = $3',
      [motivo, req.usuario.id, id]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// #SOLICITUD_ELIMINACION - El administrador aprueba (se borra) o rechaza (se queda) la solicitud
router.patch('/:id/eliminacion', requierePermiso('eliminar_todos'), async function (req, res, next) {
  try {
    const id = Number(req.params.id) || 0;
    const decision = req.body.decision;
    if (decision !== 'aprobar' && decision !== 'rechazar') {
      return res.status(400).json({ error: 'Decisión no válida.' });
    }

    const resultado = await pool.query('SELECT eliminacion_solicitada FROM hospedajes WHERE id = $1', [id]);
    const hospedaje = resultado.rows[0];
    if (!hospedaje) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }
    if (!hospedaje.eliminacion_solicitada) {
      return res.status(400).json({ error: 'Este hospedaje no tiene una solicitud de eliminación.' });
    }

    if (decision === 'aprobar') {
      await borrarHospedaje(id);
    } else {
      await pool.query(
        'UPDATE hospedajes SET eliminacion_solicitada = NULL, eliminacion_motivo = NULL, eliminacion_por = NULL WHERE id = $1',
        [id]
      );
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// ==========================================================
// SOLO ADMINISTRADOR
// ==========================================================

// #APROBAR_RECHAZAR - Aprobar o rechazar (el rechazo lleva una observación para el registrador)
router.patch('/:id/revision', requierePermiso('aprobar'), async function (req, res, next) {
  try {
    const revision = req.body.revision;
    if (revision !== 'pendiente' && revision !== 'aprobado' && revision !== 'rechazado') {
      return res.status(400).json({ error: 'Revisión no válida.' });
    }

    const resultado = await pool.query(
      'UPDATE hospedajes SET revision = $1, observacion = $2, actualizado_en = NOW() WHERE id = $3',
      [revision, limpiar(req.body.observacion), Number(req.params.id) || 0]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// #ACTIVAR_DESACTIVAR - Activar o desactivar (desactivar lo oculta del catálogo sin borrarlo)
router.patch('/:id/estado', requierePermiso('estado'), async function (req, res, next) {
  try {
    const estado = req.body.estado;
    if (estado !== 'activo' && estado !== 'inactivo') {
      return res.status(400).json({ error: 'Estado no válido.' });
    }

    const resultado = await pool.query(
      'UPDATE hospedajes SET estado = $1, actualizado_en = NOW() WHERE id = $2',
      [estado, Number(req.params.id) || 0]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
