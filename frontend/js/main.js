import { initMap, editableLayers } from './map.js';
import {
  layerLineas, cargarLineas,
  layerBarrio, addLegend, toggleLabels, filtrarBarrios,
  layerPoligonos, cargarPoligonos,
  layerHidrografia, cargarHidrografia,
  layerSitios, cargarSitios,
  layerEquipamientos, cargarEquipamientos, setupEquipamientoEventHandlers 
} from './layers.js';
import {
  createLinea, updateLinea, deleteLinea,
  createPoligono, updatePoligono, deletePoligono,
  createSitio, updateSitio, deleteSitio, createEquipamiento 
} from './api.js';
import { showForm, showConfirm } from './ui.js';

(async () => {
  const map = initMap();

  // === Añadir capas al mapa ===
  layerBarrio.addTo(map);
  layerLineas.addTo(map);
  layerPoligonos.addTo(map);
  layerHidrografia.addTo(map);
  layerSitios.addTo(map);
  layerEquipamientos.addTo(map);   
  editableLayers.addTo(map);

  setupEquipamientoEventHandlers(map);  

  // === Cargar TODOS los barrios ===
  async function cargarTodosLosBarrios() {
    try {
      const API_BASE = 'http://localhost:3000';
      const response = await fetch(`${API_BASE}/api/barrios/all`);
      if (!response.ok) throw new Error('Error al cargar todos los barrios');
      const data = await response.json();

      layerBarrio.clearLayers().addData(data);
      if (layerBarrio.getLayers().length)
        map.fitBounds(layerBarrio.getBounds());
    } catch (err) {
      console.error('Error al cargar todos los barrios:', err);
    }
  }

  // === Cargar capas ===
  await cargarTodosLosBarrios();
  await cargarLineas();
  await cargarPoligonos();
  await cargarHidrografia();
  await cargarSitios();
  await cargarEquipamientos();      
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
        <label>Área mínima (m²)</label>
        <input id="f-min" type="number" placeholder="0" />
        <label>Área máxima (m²)</label>
        <input id="f-max" type="number" placeholder="1000000" />
        <button id="btn-clear">Limpiar filtros</button>
      </div>`;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  filterCtl.addTo(map);

  const fName = document.getElementById('f-name');
  const fMin = document.getElementById('f-min');
  const fMax = document.getElementById('f-max');
  const btnClear = document.getElementById('btn-clear');

  [fName, fMin, fMax].forEach(input => {
    input.addEventListener('input', () => {
      const nombre = fName.value;
      const min = Number(fMin.value) || 0;
      const max = Number(fMax.value) || Infinity;
      filtrarBarrios(nombre, { min, max });
    });
  });

  btnClear.addEventListener('click', () => {
    fName.value = '';
    fMin.value = '';
    fMax.value = '';
    filtrarBarrios('', { min: 0, max: Infinity });
  });

  // === Control de ruta entre barrios ===
  let routingControl = null;
  const routeCtl = L.control({ position: 'topright' });
  routeCtl.onAdd = function () {
    const div = L.DomUtil.create('div', 'route-control');
    div.innerHTML = `
      <div class="route-box">
        <h4>Ruta entre barrios</h4>
        <label>Inicio:</label>
        <select id="sel-inicio">
          <option value="TORASSO ALTO">TORASSO ALTO</option>
        </select>
        <label>Destino:</label>
        <select id="sel-destino">
          <option value="NUEVA COLOMBIA">NUEVA COLOMBIA</option>
        </select>
        <button id="btn-ruta">Calcular ruta</button>
      </div>`;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  routeCtl.addTo(map);

  // === Llenar selects con nombres de barrios ===
  function llenarSelectsBarrios() {
    const barrios = layerBarrio.toGeoJSON().features;
    const inicioSel = document.getElementById('sel-inicio');
    const destinoSel = document.getElementById('sel-destino');
    barrios.forEach(f => {
      const nombre = f.properties.nombre;
      inicioSel.add(new Option(nombre, nombre));
      destinoSel.add(new Option(nombre, nombre));
    });
  }
  llenarSelectsBarrios();

  // === Calcular ruta ===
  document.addEventListener('click', async e => {
    if (e.target?.id === 'btn-ruta') {
      const inicioNombre = document.getElementById('sel-inicio').value;
      const destinoNombre = document.getElementById('sel-destino').value;
      if (!inicioNombre || !destinoNombre) {
        Swal.fire('⚠️', 'Debes seleccionar un barrio de inicio y uno de destino', 'warning');
        return;
      }

      const inicio = layerBarrio.toGeoJSON().features.find(f => f.properties.nombre === inicioNombre);
      const destino = layerBarrio.toGeoJSON().features.find(f => f.properties.nombre === destinoNombre);
      if (!inicio || !destino) {
        Swal.fire('No se pudieron encontrar los barrios seleccionados', 'error');
        return;
      }

      const inicioCenter = L.geoJSON(inicio).getBounds().getCenter();
      const destinoCenter = L.geoJSON(destino).getBounds().getCenter();

      if (routingControl) map.removeControl(routingControl);

      routingControl = L.Routing.control({
        waypoints: [inicioCenter, destinoCenter],
        router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', profile: 'driving' }),
        language: 'es',
        lineOptions: { styles: [{ color: 'red', weight: 5 }] },
        createMarker: (i, wp) => L.marker(wp.latLng, { draggable: false })
          .bindPopup(i === 0 ? 'Inicio: ' + inicioNombre : 'Destino: ' + destinoNombre)
          .openPopup()
      }).addTo(map);
    }
  });

  // === Eventos de dibujo ===
  map.on(L.Draw.Event.CREATED, async e => {
  const layer = e.layer;
  const feature = layer.toGeoJSON();

  let tipo;

  if (feature.geometry.type === 'Polygon') {
    tipo = 'polígono';
  } else if (feature.geometry.type === 'LineString') {
    tipo = 'línea';
  } else if (feature.geometry.type === 'Point') {
    const { value: tipoPunto } = await Swal.fire({
      title: 'Nuevo punto',
      text: '¿Qué tipo de punto deseas registrar?',
      input: 'select',
      inputOptions: {
        sitio: 'Sitio de interés',
        equipamiento: 'Equipamiento'
      },
      inputPlaceholder: 'Selecciona tipo',
      showCancelButton: true,
      confirmButtonText: 'Continuar',
      cancelButtonText: 'Cancelar'
    });

    if (!tipoPunto) return; 
    tipo = tipoPunto;
  }

  feature.properties = await showForm({}, tipo);

  try {
    if (tipo === 'polígono') {
      await createPoligono(feature);
      await cargarPoligonos();
    } else if (tipo === 'línea') {
      await createLinea(feature);
      await cargarLineas();
    } else if (tipo === 'sitio') {
      await createSitio(feature);
      await cargarSitios();
    } else if (tipo === 'equipamiento') {  
      await createEquipamiento(feature);
      await cargarEquipamientos();
    }

    Swal.fire( 'Elemento creado correctamente', 'success');
  } catch (err) {
    console.error('Error al crear elemento:', err);
    Swal.fire('Error al crear el elemento', 'error');
  }
});


  map.on(L.Draw.Event.EDITED, async e => {
    try {
      for (const id in e.layers._layers) {
        const layer = e.layers._layers[id];
        const feature = layer.toGeoJSON();
        const fid = feature.properties?.id;
        if (!fid) continue;

        if (feature.geometry.type === 'Polygon') {
          await updatePoligono(fid, feature);
        } else if (feature.geometry.type === 'LineString') {
          await updateLinea(fid, feature);
        } else if (feature.geometry.type === 'Point') {
          await updateSitio(fid, feature);
        }
      }

      await Promise.all([
        cargarPoligonos(),
        cargarLineas(),
        cargarSitios(),
        cargarEquipamientos()   
      ]);
    } catch (err) {
      console.error('Error al editar elemento:', err);
      Swal.fire('Error al editar el elemento', 'error');
    }
  });

  map.on(L.Draw.Event.DELETED, async e => {
    try {
      for (const id in e.layers._layers) {
        const layer = e.layers._layers[id];
        const fid = layer.feature?.properties?.id;
        if (!fid) continue;

        if (layer.feature.geometry.type === 'Polygon') {
          if (await showConfirm('¿Eliminar este polígono?')) await deletePoligono(fid);
        } else if (layer.feature.geometry.type === 'LineString') {
          if (await showConfirm('¿Eliminar esta línea?')) await deleteLinea(fid);
        } else if (layer.feature.geometry.type === 'Point') {
          if (await showConfirm('¿Eliminar este sitio de interés?')) await deleteSitio(fid);
        }
      }

      await Promise.all([
        cargarPoligonos(),
        cargarLineas(),
        cargarSitios(),
        cargarEquipamientos()  
      ]);
    } catch (err) {
      console.error('Error al eliminar elemento:', err);
      Swal.fire('', 'Error al eliminar el elemento', 'error');
    }
  });

  let layerResultados = L.geoJSON(null, { color: 'orange' }); //
map.addLayer(layerResultados); 

// Asocia cada checkbox a una capa
document.getElementById('chkBarrios').addEventListener('change', (e) => {
  toggleLayer(e.target.checked, layerBarrio);
});

document.getElementById('chkHidrografia').addEventListener('change', (e) => {
  toggleLayer(e.target.checked, layerHidrografia);
});

document.getElementById('chkEquipamientos').addEventListener('change', (e) => {
  toggleLayer(e.target.checked, layerEquipamientos);
});

document.getElementById('chkSitios').addEventListener('change', (e) => {
  toggleLayer(e.target.checked, layerSitios);
});

document.getElementById('chkResultados').addEventListener('change', (e) => {
  toggleLayer(e.target.checked, layerResultados);
});

// Función genérica para mostrar/ocultar
function toggleLayer(visible, layer) {
  if (visible) {
    map.addLayer(layer);
  } else {
    map.removeLayer(layer);
  }
}
})();
