// ==========================================================
// #FAVORITOS
// RUTAS DE FAVORITOS   (/api/favoritos)
// Cada usuario con sesión puede guardar hospedajes con el corazón ❤.
//   GET    /api/favoritos       -> mis hospedajes favoritos
//   GET    /api/favoritos/ids   -> solo los números (id) de mis favoritos
//   POST   /api/favoritos/5     -> guardar el hospedaje 5
//   DELETE /api/favoritos/5     -> quitar el hospedaje 5
// ==========================================================
const express = require('express');
const pool = require('../db');
const { requiereSesion } = require('../auth');

const router = express.Router();

// Todas estas rutas necesitan sesión
router.use(requiereSesion);

// Mis favoritos (solo los que siguen publicados)
router.get('/', async function (req, res, next) {
  try {
    const resultado = await pool.query(
      `SELECT h.*,
              h.latitud::float AS latitud,
              h.longitud::float AS longitud,
              h.precio_desde::float AS precio_desde,
              h.creado_por AS creado_por_id,
              t.nombre AS tipo, t.slug AS tipo_slug, t.icono
       FROM favoritos f
       JOIN hospedajes h ON h.id = f.hospedaje_id
       JOIN tipos_hospedaje t ON t.id = h.tipo_id
       WHERE f.usuario_id = $1 AND h.estado = 'activo' AND h.revision = 'aprobado' AND t.activo
       ORDER BY f.creado_en DESC`,
      [req.usuario.id]
    );
    res.json(resultado.rows);
  } catch (error) {
    next(error);
  }
});

// Solo los id, para pintar los corazones llenos en el catálogo
router.get('/ids', async function (req, res, next) {
  try {
    const resultado = await pool.query('SELECT hospedaje_id FROM favoritos WHERE usuario_id = $1', [req.usuario.id]);
    const ids = resultado.rows.map(function (fila) { return fila.hospedaje_id; });
    res.json(ids);
  } catch (error) {
    next(error);
  }
});

// Guardar en favoritos
router.post('/:id', async function (req, res, next) {
  try {
    const id = Number(req.params.id);

    // Revisamos que el hospedaje exista y esté publicado
    const existe = await pool.query(
      `SELECT h.id FROM hospedajes h
       JOIN tipos_hospedaje t ON t.id = h.tipo_id
       WHERE h.id = $1 AND h.estado = 'activo' AND h.revision = 'aprobado' AND t.activo`, [id || 0]
    );
    if (existe.rowCount === 0) {
      return res.status(404).json({ error: 'Hospedaje no encontrado.' });
    }

    // ON CONFLICT DO NOTHING: si ya estaba guardado, no hace nada (no da error)
    await pool.query(
      'INSERT INTO favoritos (usuario_id, hospedaje_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.usuario.id, id]
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

// Quitar de favoritos
router.delete('/:id', async function (req, res, next) {
  try {
    await pool.query(
      'DELETE FROM favoritos WHERE usuario_id = $1 AND hospedaje_id = $2',
      [req.usuario.id, Number(req.params.id) || 0]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
