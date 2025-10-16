
const pool = require('../config/db');

const getSitios = async (req, res) => {
  try {
    const query = `
      SELECT COALESCE(json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'id', id,
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object('id', id, 'nombre', nombre)
          )
        ), '[]'::json)
      ), '{"type": "FeatureCollection", "features": []}'::json) AS geojson
      FROM sitios_interes;
    `;
    const result = await pool.query(query);
    res.json(result.rows[0].geojson);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los sitios de interés.' });
  }
};

// CREATE: Crear un nuevo sitio de interés
const createSitio = async (req, res) => {
    try {
        const { geometry, properties } = req.body;
        const { nombre } = properties;
        const [lon, lat] = geometry.coordinates; 

        if (!nombre || !lon || !lat) {
            return res.status(400).json({ error: 'Faltan datos (nombre, latitud o longitud).' });
        }

        const query = `
            INSERT INTO sitios_interes (nombre, geom)
            VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326))
            RETURNING id;
        `;
        const result = await pool.query(query, [nombre, lon, lat]);
        res.status(201).json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el sitio de interés.' });
    }
};

// UPDATE: Actualizar un sitio de interés existente
const updateSitio = async (req, res) => {
    try {
        const { id } = req.params;
        const { geometry, properties } = req.body;
        const { nombre } = properties;
        const [lon, lat] = geometry.coordinates;

        if (!nombre || !lon || !lat) {
            return res.status(400).json({ error: 'Faltan datos (nombre, latitud o longitud).' });
        }

        const query = `
            UPDATE sitios_interes
            SET nombre = $1, geom = ST_SetSRID(ST_MakePoint($2, $3), 4326)
            WHERE id = $4;
        `;
        await pool.query(query, [nombre, lon, lat, id]);
        res.status(200).json({ success: true, message: 'Sitio actualizado correctamente.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el sitio de interés.' });
    }
};

// DELETE: Eliminar un sitio de interés
const deleteSitio = async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'DELETE FROM sitios_interes WHERE id = $1;';
        await pool.query(query, [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar el sitio de interés.' });
    }
};

module.exports = {
    getSitios,
    createSitio,
    updateSitio,
    deleteSitio
};