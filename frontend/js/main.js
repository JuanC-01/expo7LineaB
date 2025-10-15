import { initMap, editableLayers } from './map.js';
import {
  layerLineas, cargarLineas,
  layerBarrio, addLegend, toggleLabels, filtrarBarrios,
  layerPoligonos, cargarPoligonos
} from './layers.js';
import {
  createLinea, updateLinea, deleteLinea,
  createPoligono, updatePoligono, deletePoligono
} from './api.js';
import { showForm, showConfirm } from './ui.js';

(async () => {
  const map = initMap();

  // === Agregar capas al mapa ===
  layerBarrio.addTo(map);
  layerLineas.addTo(map);
  layerPoligonos.addTo(map);
  editableLayers.addTo(map);

  // === Barrios base (varios a la vez) ===
  const misBarrios = ['TORASSO ALTO', 'VILLA CAROLINA', 'JUAN XXIII', 'PABLO VI'];

  async function cargarVariosBarrios(nombres) {
    try {
      const API_BASE = 'http://localhost:3000';
      const param = nombres.map(n => encodeURIComponent(n)).join(',');
      const response = await fetch(`${API_BASE}/api/barrios?names=${param}`);
      if (!response.ok) throw new Error('Error al cargar barrios');
      const data = await response.json();

      layerBarrio.clearLayers();

      L.geoJSON(data, {
        style: f => ({
          color: '#3388ff',
          weight: 2,
          fillOpacity: 0.35,
          fillColor: getColorByArea(f.properties.shape_area)
        }),
        onEachFeature: (feature, layer) => {
          const nombre = feature.properties.nombre;
          const area = Number(feature.properties.shape_area || 0).toLocaleString('es-CO');
          layer.bindPopup(`<b>${nombre}</b><br><small>Área: ${area} m²</small>`);
        }
      }).addTo(layerBarrio);
    } catch (err) {
      console.error('Error al cargar barrios:', err);
    }
  }

  // === Paleta de colores por área ===
  function getColorByArea(a) {
    a = Number(a) || 0;
    return a >= 30000 ? '#ffcc00' :
           a >= 15000 ? '#ff6600' :
           a >= 5000  ? '#66cc00' : '#0099ff';
  }

  // === Cargar datos iniciales ===
  await cargarVariosBarrios(misBarrios);
  await cargarLineas();
  await cargarPoligonos();

  if (layerBarrio.getLayers().length) map.fitBounds(layerBarrio.getBounds());

  // === Agregar leyenda ===
  addLegend(map);

  // === Control de etiquetas ===
  const labelsCtl = L.control({ position: 'topleft' });
  labelsCtl.onAdd = function () {
    const div = L.DomUtil.create('div', 'info');
    div.innerHTML = `
      <label style="display:flex;gap:6px;align-items:center;">
        <input type="checkbox" id="chk-labels" />
        Mostrar etiquetas
      </label>`;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  labelsCtl.addTo(map);

  // ✅ Afecta barrios, líneas y polígonos
  document.addEventListener('change', e => {
    if (e.target?.id === 'chk-labels') {
      const checked = e.target.checked;
      toggleLabels(checked, {
        barrios: layerBarrio,
        lineas: layerLineas,
        poligonos: layerPoligonos
      });
    }
  });

  // === Panel de filtros ===
  const filterCtl = L.control({ position: 'topleft' });
  filterCtl.onAdd = function () {
    const div = L.DomUtil.create('div', 'filter-control');
    div.innerHTML = `
      <div class="filter-box">
        <h4>Filtros</h4>
        <label>Buscar por nombre</label>
        <input id="f-name" type="text" placeholder="Ej: Obrero" />
        <label>Rango de área</label>
        <select id="f-range">
          <option value="all">Todos</option>
          <option value="small">≤ 5.000</option>
          <option value="mid">5.001–15.000</option>
          <option value="large">15.001–30.000</option>
          <option value="huge">≥ 30.000</option>
        </select>
      </div>
    `;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  filterCtl.addTo(map);

  // === CONTROL DE RUTAS ENTRE BARRIOS ===
let routingControl = null;

// Crear control de selección de barrios
const routeCtl = L.control({ position: 'topright' });
routeCtl.onAdd = function () {
  const div = L.DomUtil.create('div', 'route-control');
  div.innerHTML = `
    <div class="route-box">
      <h4>Ruta entre barrios</h4>
      <label>Inicio:</label>
      <select id="sel-inicio"><option value="">Seleccionar...</option></select>
      <label>Destino:</label>
      <select id="sel-destino"><option value="">Seleccionar...</option></select>
      <button id="btn-ruta">Calcular ruta</button>
    </div>
  `;
  L.DomEvent.disableClickPropagation(div);
  return div;
};
routeCtl.addTo(map);

// === Poblar selects con nombres de barrios cargados ===
function llenarSelectsBarrios() {
  const barrios = layerBarrio.toGeoJSON().features;
  const inicioSel = document.getElementById('sel-inicio');
  const destinoSel = document.getElementById('sel-destino');
  barrios.forEach(f => {
    const nombre = f.properties.nombre;
    const opt1 = new Option(nombre, nombre);
    const opt2 = new Option(nombre, nombre);
    inicioSel.add(opt1);
    destinoSel.add(opt2);
  });
}
llenarSelectsBarrios();

// === Calcular ruta cuando se presione el botón ===
document.addEventListener('click', async e => {
  if (e.target?.id === 'btn-ruta') {
    const inicioNombre = document.getElementById('sel-inicio').value;
    const destinoNombre = document.getElementById('sel-destino').value;
    if (!inicioNombre || !destinoNombre) {
      Swal.fire('⚠️', 'Debes seleccionar un barrio de inicio y uno de destino', 'warning');
      return;
    }

    // Buscar los barrios en la capa
    const inicio = layerBarrio.toGeoJSON().features.find(f => f.properties.nombre === inicioNombre);
    const destino = layerBarrio.toGeoJSON().features.find(f => f.properties.nombre === destinoNombre);
    if (!inicio || !destino) {
      Swal.fire('❌', 'No se pudieron encontrar los barrios seleccionados', 'error');
      return;
    }

    // Calcular el centro (lat, lon) de cada barrio
    const inicioCenter = L.geoJSON(inicio).getBounds().getCenter();
    const destinoCenter = L.geoJSON(destino).getBounds().getCenter();

    // Si ya existe una ruta, eliminarla
    if (routingControl) {
      map.removeControl(routingControl);
    }

    // Crear la nueva ruta
    routingControl = L.Routing.control({
      waypoints: [inicioCenter, destinoCenter],
      router: L.Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'driving' // puede ser driving, walking o cycling
      }),
      language: 'es',
      lineOptions: { styles: [{ color: 'red', weight: 5 }] },
      createMarker: function (i, wp) {
        return L.marker(wp.latLng, { draggable: false })
          .bindPopup(i === 0 ? 'Inicio: ' + inicioNombre : 'Destino: ' + destinoNombre)
          .openPopup();
      }
    }).addTo(map);
  }
});


  document.addEventListener('input', e => {
    if (e.target?.id === 'f-name') {
      const rango = document.getElementById('f-range').value;
      filtrarBarrios(e.target.value, rango);
    }
  });
  document.addEventListener('change', e => {
    if (e.target?.id === 'f-range') {
      const nombre = document.getElementById('f-name').value;
      filtrarBarrios(nombre, e.target.value);
    }
  });

  // === Eventos de dibujo ===
  map.on(L.Draw.Event.CREATED, async e => {
    const layer = e.layer;
    const feature = layer.toGeoJSON();
    const tipo = feature.geometry.type === 'Polygon' ? 'polígono' : 'línea';
    const datos = await showForm({}, tipo);
    feature.properties = datos;
    if (tipo === 'polígono') {
      await createPoligono(feature);
      await cargarPoligonos();
    } else {
      await createLinea(feature);
      await cargarLineas();
    }
  });

  map.on(L.Draw.Event.EDITED, async e => {
    for (const id in e.layers._layers) {
      const layer = e.layers._layers[id];
      const feature = layer.toGeoJSON();
      const fid = feature.properties?.id;
      if (feature.geometry.type === 'Polygon' && fid) await updatePoligono(fid, feature);
      else if (feature.geometry.type === 'LineString' && fid) await updateLinea(fid, feature);
    }
    await cargarPoligonos();
    await cargarLineas();
  });

  map.on(L.Draw.Event.DELETED, async e => {
    for (const id in e.layers._layers) {
      const layer = e.layers._layers[id];
      const fid = layer.feature?.properties?.id;
      if (!fid) continue;
      if (layer.feature.geometry.type === 'Polygon') {
        if (await showConfirm('¿Eliminar este polígono?')) await deletePoligono(fid);
      } else if (layer.feature.geometry.type === 'LineString') {
        if (await showConfirm('¿Eliminar esta línea?')) await deleteLinea(fid);
      }
    }
    await cargarPoligonos();
    await cargarLineas();
  });
})();
