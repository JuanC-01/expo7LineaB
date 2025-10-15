import {
  getLineas,
  createLinea,
  deleteLinea,
  updateLinea,
  getBarrio,
  getPoligonos,
  createPoligono,
  deletePoligono,
  updatePoligono
} from './api.js';
import { editableLayers } from './map.js';
import { escapeHtml } from './utils.js';
import { showForm, showConfirm } from './ui.js';

// ========= PALETA DE COLORES POR ÁREA =========
function getColor(a) {
  a = Number(a) || 0;
  return a >= 50000 ? '#FFE100' : a > 20000 ? '#9112BC' : '#08CB00';
}

// ========= ESTADO DE ETIQUETAS =========
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

  // Si las etiquetas están activas, mostrarlas al recargar
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

    // Popup con info del barrio
    layer.bindPopup(`
      <h3>${escapeHtml(nombre)}</h3>
      <hr/>
      <div><b>Área:</b> ${area.toLocaleString('es-CO', { maximumFractionDigits: 2 })} m² (${grupo})</div>
    `);

    // Hover visual
    layer.on({
      mouseover: e => e.target.setStyle({ weight: 3, color: '#333', fillOpacity: 0.6 }),
      mouseout: e => layerBarrio.resetStyle(e.target)
    });

    layer.feature = feature;

    // Mostrar etiqueta si están activadas
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

  // Si las etiquetas están activas, mostrarlas al recargar
  if (showLabels) toggleLabels(true, { poligonos: layerPoligonos });
}

// ========= MOSTRAR / OCULTAR ETIQUETAS =========
export function toggleLabels(visible, capas = {}) {
  showLabels = visible;

  const { barrios = layerBarrio, lineas = layerLineas, poligonos = layerPoligonos } = capas;
  const grupos = [barrios, lineas, poligonos];

  grupos.forEach(group => {
    if (!group) return;

    group.eachLayer(layer => {
      const nombre = layer.feature?.properties?.nombre || '';

      // eliminar tooltip previo
      if (layer.getTooltip()) layer.unbindTooltip();

      if (visible && nombre) {
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
    const grades = [0, 20001, 50000];
    div.innerHTML = '<h4>Área (m²)</h4>';
    for (let i = 0; i < grades.length; i++) {
      const from = grades[i], to = grades[i + 1];
      const label = to
        ? `${from.toLocaleString()} – ${(to - 1).toLocaleString()}`
        : `≥ ${from.toLocaleString()}`;
      div.innerHTML += `<i style="background:${getColor(from)}"></i> ${label}<br>`;
    }
    return div;
  };
  legend.addTo(map);
}

// ========= FILTRO POR NOMBRE Y ÁREA =========
export function filtrarBarrios(nombreFiltro = '', rango = 'all') {
  nombreFiltro = nombreFiltro.toLowerCase();

  layerBarrio.eachLayer(l => {
    const nombre = (l.feature?.properties?.nombre || '').toLowerCase();
    const area = Number(l.feature?.properties?.shape_area) || 0;

    let rangoOK = true;
    if (rango === 'small') rangoOK = area <= 20000;
    if (rango === 'mid') rangoOK = area > 20000 && area <= 50000;
    if (rango === 'large') rangoOK = area > 50000;

    const nombreOK = nombre.includes(nombreFiltro);
    const visible = nombreOK && rangoOK;

    l.setStyle({
      opacity: visible ? 1 : 0,
      fillOpacity: visible ? 0.45 : 0
    });
  });
}

// ========= POPUPS (LÍNEAS Y POLÍGONOS) =========
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
