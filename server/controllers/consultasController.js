const pool = require('../config/db');

const buildFilterClause = (filtros, startIndex = 2) => {
    let filterClause = '';
    const params = [];
    let paramIndex = startIndex;

    if (filtros.tipo) {
        const tipos = Array.isArray(filtros.tipo) ? filtros.tipo : filtros.tipo.split(',');
        if (tipos.length > 0) {
            filterClause += ` AND tipo = ANY($${paramIndex++})`;
            params.push(tipos);
        }
    }

    if (filtros.nombre) {
        filterClause += ` AND nombre ILIKE $${paramIndex++}`;
        params.push(`%${filtros.nombre}%`);
    }

    return { filterClause, params, nextIndex: paramIndex };
};


// Controlador para Intersección
exports.findEquipamientosByIntersection = async (req, res) => {
    const { geometry } = req.body; 
    const queryFilters = req.query;

    if (!geometry) {
        return res.status(400).json({ msg: 'Geometría no proporcionada' });
    }

    try {
        const geomText = `ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)`;

        const { filterClause, params: filterParams, nextIndex } = buildFilterClause(queryFilters, 2);

        const query = `
            SELECT
                gid, nombre, tipo,
                ST_AsGeoJSON(geom) AS geometry
                -- Añade otros campos que necesites, como 'barrio'
                -- , barrio -- Ejemplo
            FROM equipamientos
            WHERE ST_Intersects(geom, ${geomText})
            ${filterClause}
            ORDER BY nombre;
        `;

        const allParams = [JSON.stringify(geometry), ...filterParams]; 

        console.log('Executing Intersection Query:', query);
        console.log('Params:', allParams);

        const { rows } = await pool.query(query, allParams);

        // Formatear como GeoJSON FeatureCollection
        const features = rows.map(row => ({
            type: 'Feature',
            properties: {
                gid: row.gid,
                nombre: row.nombre,
                tipo: row.tipo,

            },
            geometry: JSON.parse(row.geometry),
        }));

        res.json({
            type: 'FeatureCollection',
            features: features,
        });

    } catch (err) {
        console.error('Error en consulta de intersección:', err.message);
        res.status(500).send('Error en el servidor');
    }
};


// Controlador para Buffer
exports.findEquipamientosByBuffer = async (req, res) => {
    const { centro, radio } = req.body; 
    const queryFilters = req.query; 

    if (!centro || !Array.isArray(centro) || centro.length !== 2 || !radio || isNaN(radio) || radio <= 0) {
        return res.status(400).json({ msg: 'Centro o radio inválido' });
    }

    const [lon, lat] = centro;
    const radioMetros = parseFloat(radio);

    try {

        const centroGeography = `ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography`;

        const { filterClause, params: filterParams, nextIndex } = buildFilterClause(queryFilters, 3);

        const query = `
            SELECT
                gid, nombre, tipo,
                ST_AsGeoJSON(geom) AS geometry,
                -- Calcula la distancia usando geography para precisión en metros
                ST_Distance(geom::geography, ${centroGeography}) AS distancia
                -- Añade otros campos que necesites, como 'barrio'
                -- , barrio -- Ejemplo
            FROM equipamientos
            WHERE ST_DWithin(geom::geography, ${centroGeography}, $${nextIndex}) -- $nextIndex será el radio
            ${filterClause}
            ORDER BY distancia; -- Ordenar por distancia
        `;

        const allParams = [lon, lat, ...filterParams, radioMetros]; 

        console.log('Executing Buffer Query:', query);
        console.log('Params:', allParams);

        const { rows } = await pool.query(query, allParams);

        const features = rows.map(row => ({
            type: 'Feature',
            properties: {
                gid: row.gid,
                nombre: row.nombre,
                tipo: row.tipo,
                distancia: row.distancia, 
            },
            geometry: JSON.parse(row.geometry),
        }));

        res.json({
            type: 'FeatureCollection',
            features: features,
        });

    } catch (err) {
        console.error('Error en consulta de buffer:', err.message);
        res.status(500).send('Error en el servidor');
    }
};