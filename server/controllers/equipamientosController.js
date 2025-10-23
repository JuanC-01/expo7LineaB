const pool = require('../config/db'); 

exports.getEquipamientos = async (req, res) => {
  try {
    let query = 'SELECT gid, nombre, tipo, ST_AsGeoJSON(geom) AS geometry FROM equipamientos WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (req.query.tipo) {
      const tipos = req.query.tipo.split(',');
      query += ` AND tipo = ANY($${paramIndex++})`;
      params.push(tipos);
    }
    if (req.query.nombre) {
      query += ` AND nombre ILIKE $${paramIndex++}`;
      params.push(`%${req.query.nombre}%`); 
    }

    const { rows } = await pool.query(query, params);

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
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
};

// Crear un nuevo equipamiento
exports.createEquipamiento = async (req, res) => {
  const { nombre, tipo, geometry } = req.body; 

  if (!nombre || !tipo || !geometry || geometry.type !== 'Point' || !geometry.coordinates) {
    return res.status(400).json({ msg: 'Faltan datos o la geometría no es un punto válido' });
  }

  try {
    const geomText = `ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'), 4326)`;

    const query = `
      INSERT INTO equipamientos (nombre, tipo, geom) 
      VALUES ($1, $2, ${geomText}) 
      RETURNING gid, nombre, tipo, ST_AsGeoJSON(geom) AS geometry`;
      
    const params = [nombre, tipo];
    
    const { rows } = await pool.query(query, params);

    const newFeature = {
        type: 'Feature',
        properties: {
            gid: rows[0].gid,
            nombre: rows[0].nombre,
            tipo: rows[0].tipo,
        },
        geometry: JSON.parse(rows[0].geometry),
    };

    res.status(201).json(newFeature); 
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor al crear equipamiento');
  }
};

exports.updateEquipamiento = async (req, res) => {
  const { gid } = req.params;
  const { nombre, tipo, geometry } = req.body; 

  if (!nombre && !tipo && !geometry) {
     return res.status(400).json({ msg: 'No hay datos para actualizar' });
  }

  try {
    let updateFields = [];
    const params = [];
    let paramIndex = 1;

    if (nombre) {
      updateFields.push(`nombre = $${paramIndex++}`);
      params.push(nombre);
    }
    if (tipo) {
      updateFields.push(`tipo = $${paramIndex++}`);
      params.push(tipo);
    }
    if (geometry && geometry.type === 'Point' && geometry.coordinates) {
       const geomText = `ST_SetSRID(ST_GeomFromGeoJSON('${JSON.stringify(geometry)}'), 4326)`;
      updateFields.push(`geom = ${geomText}`);
    }

    if (updateFields.length === 0) {
        return res.status(400).json({ msg: 'Datos de geometría inválidos para actualizar' });
    }

    params.push(gid); 

    const query = `
      UPDATE equipamientos 
      SET ${updateFields.join(', ')} 
      WHERE gid = $${paramIndex}
      RETURNING gid, nombre, tipo, ST_AsGeoJSON(geom) AS geometry`;

    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Equipamiento no encontrado' });
    }

    const updatedFeature = {
        type: 'Feature',
        properties: {
            gid: rows[0].gid,
            nombre: rows[0].nombre,
            tipo: rows[0].tipo,
        },
        geometry: JSON.parse(rows[0].geometry),
    };

    res.json(updatedFeature);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor al actualizar equipamiento');
  }
};

// Eliminar un equipamiento
exports.deleteEquipamiento = async (req, res) => {
  const { gid } = req.params;

  try {
    const query = 'DELETE FROM equipamientos WHERE gid = $1 RETURNING gid';
    const params = [gid];
    
    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Equipamiento no encontrado' });
    }

    res.json({ msg: `Equipamiento con gid ${gid} eliminado` });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor al eliminar equipamiento');
  }
};