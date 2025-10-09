const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Ruta para obtener el barrio asignado (por nombre)
router.get('/:nombre', async (req, res) => {
  try {
    const nombre = decodeURIComponent(req.params.nombre);
    const q = `
      SELECT 
        gid, 
        nombre, 
        ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geojson
      FROM barrios
      WHERE TRIM(UPPER(nombre)) = TRIM(UPPER($1))
    `;
    const result = await pool.query(q, [nombre]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Barrio no encontrado' });

    const featureCollection = {
      type: "FeatureCollection",
      features: result.rows.map(r => ({
        type: "Feature",
        geometry: JSON.parse(r.geojson),
        properties: { id: r.gid, nombre: r.nombre }
      }))
    };

    res.json(featureCollection);
  } catch (err) {
    console.error('Error en /api/barrios/:nombre →', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
