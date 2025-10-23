const API_BASE = 'http://localhost:3000/api';

export async function getLineas() {
  const res = await fetch(`${API_BASE}/lineas`);
  if (!res.ok) throw new Error('Error al cargar líneas');
  return await res.json();
}

export async function createLinea(feature) {
  return await fetch(`${API_BASE}/lineas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feature)
  });
}

export async function updateLinea(id, feature) {
  return await fetch(`${API_BASE}/lineas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feature)
  });
}

export async function deleteLinea(id) {
  return await fetch(`${API_BASE}/lineas/${id}`, { method: 'DELETE' });
}

export async function getBarrio(nombre) {
  const res = await fetch(`${API_BASE}/barrios/${encodeURIComponent(nombre)}`);
  if (!res.ok) throw new Error('Error al cargar el barrio');
  return await res.json();
}


// === Polígonos ===
export async function getPoligonos() {
  const res = await fetch(`${API_BASE}/poligonos`);
  if (!res.ok) throw new Error('Error al cargar polígonos');
  return await res.json();
}

export async function createPoligono(feature) {
  return await fetch(`${API_BASE}/poligonos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feature)
  });
}

export async function updatePoligono(id, feature) {
  return await fetch(`${API_BASE}/poligonos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feature)
  });
}

export async function deletePoligono(id) {
  return await fetch(`${API_BASE}/poligonos/${id}`, { method: 'DELETE' });
}

export async function getHidrografia() {
    const res = await fetch(`${API_BASE}/hidrografia`);
    if (!res.ok) throw new Error('Error al cargar la hidrografía');
    return await res.json();
}


// === SITIOS DE INTERÉS ===
export async function getSitios() {
  const res = await fetch(`${API_BASE}/sitios/all`);
  if (!res.ok) throw new Error('Error al cargar los sitios de interés');
  return await res.json();
}

export async function createSitio(feature) {
  return await fetch(`${API_BASE}/sitios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feature)
  });
}

export async function updateSitio(id, feature) {
  return await fetch(`${API_BASE}/sitios/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(feature)
  });
}

export async function deleteSitio(id) {
  return await fetch(`${API_BASE}/sitios/${id}`, { method: 'DELETE' });
}

// === API EQUIPAMIENTOS ===
export async function getEquipamientos(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros.tipo) params.append('tipo', Array.isArray(filtros.tipo) ? filtros.tipo.join(',') : filtros.tipo);
  if (filtros.nombre) params.append('nombre', filtros.nombre);

  const url = `${API_BASE}/equipamientos?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error al obtener equipamientos: ${response.statusText}`);
  return await response.json();
}

export async function createEquipamiento(feature) {
  const dataToSend = {
    ...feature.properties,
    geometry: feature.geometry
  };

  const response = await fetch(`${API_BASE}/equipamientos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dataToSend)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Respuesta del servidor:", errText);
    throw new Error(`Error al crear equipamiento: ${response.statusText}`);
  }

  return await response.json();
}


export async function updateEquipamiento(gid, feature) {
    const dataToSend = { ...feature.properties, geometry: feature.geometry };
    const response = await fetch(`${API_BASE}/equipamientos/${gid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend) 
    });
    if (!response.ok) throw new Error(`Error al actualizar equipamiento ${gid}: ${response.statusText}`);
    return await response.json();
}


export async function deleteEquipamiento(gid) {
  const response = await fetch(`${API_BASE}/equipamientos/${gid}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error(`Error al eliminar equipamiento ${gid}: ${response.statusText}`);
  return await response.json();
}

// === CONSULTAS ESPACIALES ===
export async function ejecutarInterseccion(geometry, filtros = {}) {
  const params = new URLSearchParams();
  // Construye los parámetros de filtro (tipo, nombre, etc.) si existen
  if (filtros.tipo && filtros.tipo.length > 0) params.append('tipo', filtros.tipo.join(','));
  if (filtros.nombre) params.append('nombre', filtros.nombre); // Si tienes filtro de nombre para equip

  const url = `${API_BASE}/consultas/interseccion?${params.toString()}`;
  const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ geometry }) // Enviar la geometría en el cuerpo
  });
  if (!response.ok) throw new Error(`Error en consulta de intersección: ${response.statusText}`);
  return await response.json(); // Espera FeatureCollection
}

export async function ejecutarBuffer(centro, radio, filtros = {}) {
    const params = new URLSearchParams();
    // Construye los parámetros de filtro
    if (filtros.tipo && filtros.tipo.length > 0) params.append('tipo', filtros.tipo.join(','));
    if (filtros.nombre) params.append('nombre', filtros.nombre);

    const url = `${API_BASE}/consultas/buffer?${params.toString()}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ centro, radio }) // Enviar centro [lon, lat] y radio
    });
    if (!response.ok) throw new Error(`Error en consulta de buffer: ${response.statusText}`);
    // Espera FeatureCollection con propiedad 'distancia' en properties
    return await response.json();
}