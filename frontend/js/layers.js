import {
  getLineas,
  createLinea,
  deleteLinea,
  updateLinea,
  getBarrio,
  getPoligonos,
  createPoligono,
  deletePoligono,
  updatePoligono,
  getHidrografia,
  getSitios, createSitio, updateSitio, deleteSitio
} from './api.js';
import { editableLayers, sitiosCluster } from './map.js';
import { escapeHtml } from './utils.js';
import { showForm, showConfirm } from './ui.js';

// ========= PALETA DE COLORES POR ÁREA =========
function getColor(a) {
  a = Number(a) || 0;
  return a >= 100000 ? '#1d4ed8' :
    a >= 80000 ? '#3b82f6' :
      a >= 60000 ? '#60a5fa' :
        a >= 40000 ? '#93c5fd' :
          '#dbeafe';
}

let showLabels = false;

// ========= LÍNEAS =========
export const layerLineas = L.geoJSON(null, {
  style: { color: 'red', weight: 3 },
  onEachFeature: (feature, layer) => attachPopupLinea(layer)
});

export async function cargarLineas() {
  const data = await getLineas();
  layerLineas.clearLayers().addData(data);
  layerLineas.eachLayer(l => editableLayers.addLayer(l));
  if (showLabels) toggleLabels(true, { lineas: layerLineas });
}

// ========= BARRIOS =========
export const layerBarrio = L.geoJSON(null, {
  style: f => ({
    color: '#666',
    weight: 2,
    fillColor: getColor(Number(f.properties?.shape_area) || 0),
    fillOpacity: 0.45
  }),
  onEachFeature: (feature, layer) => {
    const props = feature.properties || {};
    const nombre = props.nombre ?? 'Barrio';
    const area = Number(props.shape_area) || 0;
    const grupo =
      area >= 50000 ? 'Grande' :
        area > 20000 ? 'Mediano' :
          'Pequeño';

    layer.bindPopup(`
      <h3>${escapeHtml(nombre)}</h3>
      <hr/>
      <div><b>Área:</b> ${area.toLocaleString('es-CO', { maximumFractionDigits: 2 })} m² (${grupo})</div>
    `);
    layer.on({
      mouseover: e => e.target.setStyle({ weight: 3, color: '#333', fillOpacity: 0.6 }),
      mouseout: e => layerBarrio.resetStyle(e.target)
    });

    layer.feature = feature;
    if (showLabels) {
      layer.bindTooltip(nombre, {
        permanent: true,
        direction: 'center',
        className: 'label-barrio'
      }).openTooltip();
    }
  }
});

export async function cargarBarrio(nombre) {
  try {
    const feature = await getBarrio(nombre);
    layerBarrio.clearLayers().addData(feature);
    if (showLabels) toggleLabels(true, { barrios: layerBarrio });
  } catch (err) {
    console.error('Error al cargar el barrio:', err);
  }
}

// ========= POLÍGONOS =========
export const layerPoligonos = L.geoJSON(null, {
  style: { color: 'green', weight: 2, fillOpacity: 0.3 },
  onEachFeature: (feature, layer) => attachPopupPoligono(layer)
});

export async function cargarPoligonos() {
  const data = await getPoligonos();
  layerPoligonos.clearLayers().addData(data);
  layerPoligonos.eachLayer(l => editableLayers.addLayer(l));
  if (showLabels) toggleLabels(true, { poligonos: layerPoligonos });
}

// ========= HIDROGRAFÍA =========
export const layerHidrografia = L.geoJSON(null, {
  style: {
    color: '#1d4ed8',
    weight: 2,
    dashArray: '4,6'
  },
  onEachFeature: (f, layer) => {
    layer.bindPopup(`<b>Hidrografía:</b> ${f.properties.nombre || 'Sin nombre'}`);
  }
});

export async function cargarHidrografia() {
  const API_BASE = 'http://localhost:3000';
  const response = await fetch(`${API_BASE}/api/hidrografia`);
  if (!response.ok) throw new Error('Error al cargar la hidrografía');
  const data = await response.json();
  layerHidrografia.clearLayers().addData(data);
}

// ========= MOSTRAR/OCULTAR ETIQUETAS =========
export function toggleLabels(visible, capas = {}) {
  showLabels = visible;
  const { barrios = layerBarrio, lineas = layerLineas, poligonos = layerPoligonos } = capas;
  const grupos = [barrios, lineas, poligonos];

  grupos.forEach(group => {
    if (!group) return;

    group.eachLayer(layer => {
      const nombre = layer.feature?.properties?.nombre || '';

      if (layer.getTooltip()) layer.unbindTooltip();
      if (visible && nombre.toUpperCase() === 'TORASSO ALTO') {
        let clase = 'map-label';
        if (group === layerBarrio) clase = 'label-barrio';
        if (group === layerLineas) clase = 'label-linea';
        if (group === layerPoligonos) clase = 'label-poligono';

        layer.bindTooltip(nombre, {
          permanent: true,
          direction: group === layerLineas ? 'auto' : 'center',
          className: clase
        }).openTooltip();
      }
    });
  });
}

// ========= LEYENDA =========
export function addLegend(map) {
  const legend = L.control({ position: 'topleft' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    const grades = [0, 40000, 60000, 80000, 100000];
    const colors = grades.map(g => getColor(g));

    div.innerHTML = '<h4>Área (m²)</h4>';
    for (let i = 0; i < grades.length; i++) {
      const from = grades[i];
      const to = grades[i + 1];
      const label = to
        ? `${from.toLocaleString()} – ${(to - 1).toLocaleString()}`
        : `≥ ${from.toLocaleString()}`;
      div.innerHTML += `<i style="background:${colors[i]}"></i> ${label}<br>`;
    }

    div.innerHTML += `
      <hr>
      <i style="border-top: 3px dashed #1d4ed8; background: none; width: 20px; height: 0; display: inline-block; margin-right: 5px;"></i>
      Hidrografía<br>
    `;
    div.innerHTML += `
      <i style="border-top: 3px solid red; background: none; width: 20px; height: 0; display: inline-block; margin-right: 5px;"></i>
      Ruta entre barrios
    `;
    return div;
  };

  legend.addTo(map);
}

// ========= FILTRO POR NOMBRE Y ÁREA =========
export function filtrarBarrios(nombreFiltro = '', rango = { min: 0, max: Infinity }) {
  nombreFiltro = nombreFiltro.toLowerCase();
  const { min, max } = rango;

  layerBarrio.eachLayer(l => {
    const nombre = (l.feature?.properties?.nombre || '').toLowerCase();
    const area = Number(l.feature?.properties?.shape_area) || 0;

    const rangoOK = area >= min && area <= max;
    const nombreOK = nombre.includes(nombreFiltro);
    const visible = nombreOK && rangoOK;

    l.setStyle({
      opacity: visible ? 1 : 0,
      fillOpacity: visible ? 0.45 : 0
    });
  });
}

// ========= POPUPS  =========
function attachPopupLinea(layer) {
  const props = layer.feature.properties;
  const id = props.id || props.ID;
  const html = `
    <b>${escapeHtml(props.nombre || 'Sin nombre')}</b><br>
    <small>${escapeHtml(props.barrio || '')}</small>
    <hr>
    <button class="btn-edit">Editar</button>
    <button class="btn-delete">Eliminar</button>
  `;

  layer.bindPopup(html);
  layer.on('popupopen', e => {
    const node = e.popup._contentNode;

    node.querySelector('.btn-delete').onclick = async () => {
      if (await showConfirm('¿Eliminar esta línea?')) {
        await deleteLinea(id);
        await cargarLineas();
      }
    };

    node.querySelector('.btn-edit').onclick = async () => {
      const nuevo = await showForm(props, 'línea');
      const feature = layer.toGeoJSON();
      feature.properties = nuevo;
      await updateLinea(id, feature);
      await cargarLineas();
    };
  });
}

function attachPopupPoligono(layer) {
  const props = layer.feature.properties;
  const id = props.id || props.ID;
  const html = `
    <b>${escapeHtml(props.nombre || 'Sin nombre')}</b><br>
    <small>${escapeHtml(props.barrio || '')}</small>
    <hr>
    <button class="btn-edit">Editar</button>
    <button class="btn-delete">Eliminar</button>
  `;

  layer.bindPopup(html);
  layer.on('popupopen', e => {
    const node = e.popup._contentNode;

    node.querySelector('.btn-delete').onclick = async () => {
      if (await showConfirm('¿Eliminar este polígono?')) {
        await deletePoligono(id);
        await cargarPoligonos();
      }
    };

    node.querySelector('.btn-edit').onclick = async () => {
      const nuevo = await showForm(props, 'polígono');
      const feature = layer.toGeoJSON();
      feature.properties = nuevo;
      await updatePoligono(id, feature);
      await cargarPoligonos();
    };
  });
}

// ========= SITIOS DE INTERÉS  =========
export async function cargarSitios() {
  try {
    const data = await getSitios();
    sitiosCluster.clearLayers();

    if (!data || !data.features) return;

    const puntos = L.geoJSON(data, {
      pointToLayer: (feature, latlng) =>
        L.marker(latlng, {
          icon: L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854878.png',
            iconSize: [25, 25],
            iconAnchor: [12, 25]
          })
        }),
      onEachFeature: (feature, layer) => attachPopupSitio(layer)
    });

    sitiosCluster.addLayer(puntos);
  } catch (err) {
    console.error('Error al cargar los sitios:', err);
  }
}

function attachPopupSitio(layer) {
  const props = layer.feature.properties;
  const id = props.id;

  const html = `
    <b>${escapeHtml(props.nombre || 'Sitio sin nombre')}</b><br>
    <hr>
    <button class="btn-edit">Editar</button>
    <button class="btn-delete">Eliminar</button>
  `;

  layer.bindPopup(html);
  layer.on('popupopen', e => {
    const node = e.popup._contentNode;

    node.querySelector('.btn-delete').onclick = async () => {
      if (await showConfirm('¿Eliminar este sitio?')) {
        await deleteSitio(id);
        await cargarSitios();
      }
    };

    node.querySelector('.btn-edit').onclick = async () => {
      const nuevo = await showForm(props, 'sitio');
      const feature = layer.toGeoJSON();
      feature.properties = nuevo;
      await updateSitio(id, feature);
      await cargarSitios();
    };
  });
}

export const layerSitios = sitiosCluster;

