const pool = require('../config/db');


const getHidrografia = async (req, res) => {
    try {

        const query = `
            SELECT json_build_object(
                'type', 'FeatureCollection',
                'features', json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'geometry', ST_AsGeoJSON(geom)::json,
                        'properties', to_jsonb(row) - 'geom'
                    )
                )
            ) AS geojson
            FROM (SELECT * FROM hidrografia) AS row;
        `;
        
        const result = await pool.query(query);

        if (result.rows.length > 0 && result.rows[0].geojson) {
            res.json(result.rows[0].geojson);
        } else {
            res.json({
                type: 'FeatureCollection',
                features: []
            });
        }
    } catch (err) {
        console.error('Error al obtener la hidrografía:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = {
    getHidrografia
};