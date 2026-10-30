// ==========================================================
// #TIPOS_HOSPEDAJE
// RUTAS DE TIPOS DE HOSPEDAJE   (/api/tipos)
// Hotel, Hotel boutique, Hostal, Posada...
//   GET  /api/tipos     -> lista de tipos (todos pueden verla)
//   POST /api/tipos     -> crear un tipo (permiso "tipos")
//   PUT  /api/tipos/3   -> editar un tipo (permiso "tipos")
// ==========================================================
const express = require('express');
const pool = require('../db');
const { requierePermiso, tienePermiso } = require('../auth');
const requiereTipos = requierePermiso('tipos');   // permiso "Administrar tipos de hospedaje"

const router = express.Router();

// Lista de tipos con cuántos hospedajes aprobados tiene cada uno.
// Quien administra tipos puede pedir también los desactivados con ?todos=1
router.get('/', async function (req, res, next) {
  try {
    let soloActivos = 'WHERE t.activo';
    if (tienePermiso(req.usuario, 'tipos') && req.query.todos === '1') {
      soloActivos = '';
    }

    const resultado = await pool.query(
      `SELECT t.*, COUNT(h.id)::int AS total
       FROM tipos_hospedaje t
       LEFT JOIN hospedajes h ON h.tipo_id = t.id AND h.estado = 'activo' AND h.revision = 'aprobado'
       ${soloActivos}
       GROUP BY t.id
       ORDER BY t.id`
    );
    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

// Toma los datos del formulario. Devuelve null si falta algo.
function leerTipo(body) {
  const nombre = String(body.nombre || '').trim();
  // El identificador (slug) es el nombre corto para la URL, ej: 'hotel-boutique'
  const slug = String(body.slug || '').trim().toLowerCase();

  if (nombre === '' || slug === '' || slug.includes(' ')) {
    return null;
  }

  return {
    nombre: nombre,
    slug: slug,
    descripcion: String(body.descripcion || '').trim() || null,
    icono: String(body.icono || '').trim() || 'bi-building',
    activo: body.activo !== false,
  };
}

const MENSAJE_FALTAN_DATOS = 'El nombre y el identificador (sin espacios) son obligatorios.';
const MENSAJE_REPETIDO = 'Ya existe un tipo con ese nombre o identificador.';

// Crear un tipo
router.post('/', requiereTipos, async function (req, res, next) {
  try {
    const tipo = leerTipo(req.body);
    if (!tipo) {
      return res.status(400).json({ error: MENSAJE_FALTAN_DATOS });
    }

    const resultado = await pool.query(
      `INSERT INTO tipos_hospedaje (nombre, slug, descripcion, icono, activo)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [tipo.nombre, tipo.slug, tipo.descripcion, tipo.icono, tipo.activo]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    // 23505 = valor repetido (nombre o slug ya existen)
    if (error.code === '23505') {
      return res.status(409).json({ error: MENSAJE_REPETIDO });
    }
    next(error);
  }
});

// Editar un tipo (también sirve para activarlo o desactivarlo)
router.put('/:id', requiereTipos, async function (req, res, next) {
  try {
    const tipo = leerTipo(req.body);
    if (!tipo) {
      return res.status(400).json({ error: MENSAJE_FALTAN_DATOS });
    }

    const resultado = await pool.query(
      `UPDATE tipos_hospedaje SET nombre = $1, slug = $2, descripcion = $3, icono = $4, activo = $5
       WHERE id = $6 RETURNING *`,
      [tipo.nombre, tipo.slug, tipo.descripcion, tipo.icono, tipo.activo, Number(req.params.id) || 0]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Tipo no encontrado.' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: MENSAJE_REPETIDO });
    }
    next(error);
  }
});

module.exports = router;
