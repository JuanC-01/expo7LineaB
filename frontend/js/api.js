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
