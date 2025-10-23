import { initMap, editableLayers } from './map.js';
import {
  layerLineas, cargarLineas,
  layerBarrio, addLegend, toggleLabels, filtrarBarrios,
  layerPoligonos, cargarPoligonos,
  layerHidrografia, cargarHidrografia,
  layerSitios, cargarSitios,
  layerEquipamientos, cargarEquipamientos, setupEquipamientoEventHandlers,
  mostrarResultadosConsulta, limpiarResultadosConsulta
} from './layers.js';
import {
  createLinea, updateLinea, deleteLinea,
  createPoligono, updatePoligono, deletePoligono,
  createSitio, updateSitio, deleteSitio, createEquipamiento,
  ejecutarInterseccion, ejecutarBuffer
} from './api.js';
import { showForm, showConfirm } from './ui.js';
import { escapeHtml } from './utils.js';

(async () => {
  const map = initMap();

  // === Capas base ===
  layerBarrio.addTo(map);
  layerLineas.addTo(map);
  layerPoligonos.addTo(map);
  layerHidrografia.addTo(map);
  layerSitios.addTo(map);
  layerEquipamientos.addTo(map);
  editableLayers.addTo(map);
  setupEquipamientoEventHandlers(map);
  addLegend(map);

  // === Cargar datos ===
  const API_BASE = 'http://localhost:3000';
  async function cargarTodosLosBarrios() {
    try {
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
  await cargarTodosLosBarrios();
  await cargarLineas();
  await cargarPoligonos();
  await cargarHidrografia();
  await cargarSitios();
  await cargarEquipamientos();

  // === Etiquetas ===
  const chkLabelsCtl = L.control({ position: 'topleft' });
  chkLabelsCtl.onAdd = () => {
    const div = L.DomUtil.create('div', 'info');
    div.innerHTML = `
      <label style="display:flex;gap:6px;align-items:center;">
        <input type="checkbox" id="chk-labels" />
        Mostrar etiquetas
      </label>`;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  chkLabelsCtl.addTo(map);

  document.addEventListener('change', e => {
    if (e.target?.id === 'chk-labels') {
      toggleLabels(e.target.checked, {
        barrios: layerBarrio,
        lineas: layerLineas,
        poligonos: layerPoligonos
      });
    }
  });

  // === Panel de filtros ===
  const filterCtl = L.control({ position: 'topleft' });
  filterCtl.onAdd = () => {
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

  // === Routing entre barrios ===
  let routingControl = null;
  const routeCtl = L.control({ position: 'topright' });
  routeCtl.onAdd = () => {
    const div = L.DomUtil.create('div', 'route-control');
    div.innerHTML = `
      <div class="route-box">
        <h4>Ruta entre barrios</h4>
        <label>Inicio:</label>
        <select id="sel-inicio"></select>
        <label>Destino:</label>
        <select id="sel-destino"></select>
        <button id="btn-ruta">Calcular ruta</button>
      </div>`;
    L.DomEvent.disableClickPropagation(div);
    return div;
  };
  routeCtl.addTo(map);

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

  document.addEventListener('click', async e => {
    if (e.target?.id === 'btn-ruta') {
      const inicioNombre = document.getElementById('sel-inicio').value;
      const destinoNombre = document.getElementById('sel-destino').value;
      const inicio = layerBarrio.toGeoJSON().features.find(f => f.properties.nombre === inicioNombre);
      const destino = layerBarrio.toGeoJSON().features.find(f => f.properties.nombre === destinoNombre);
      if (!inicio || !destino) return Swal.fire('⚠️', 'Selecciona barrios válidos', 'warning');
      const inicioCenter = L.geoJSON(inicio).getBounds().getCenter();
      const destinoCenter = L.geoJSON(destino).getBounds().getCenter();
      if (routingControl) map.removeControl(routingControl);
      routingControl = L.Routing.control({
        waypoints: [inicioCenter, destinoCenter],
        router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', profile: 'driving' }),
        lineOptions: { styles: [{ color: 'red', weight: 5 }] },
        language: 'es'
      }).addTo(map);
    }
  });

  // === Eventos de dibujo CRUD ===
  map.on(L.Draw.Event.CREATED, async e => {
    const layer = e.layer;
    const feature = layer.toGeoJSON();
    let tipo;
    if (feature.geometry.type === 'Polygon') tipo = 'polígono';
    else if (feature.geometry.type === 'LineString') tipo = 'línea';
    else if (feature.geometry.type === 'Point') {
      const { value: tipoPunto } = await Swal.fire({
        title: 'Nuevo punto',
        text: '¿Qué tipo de punto deseas registrar?',
        input: 'select',
        inputOptions: { sitio: 'Sitio de interés', equipamiento: 'Equipamiento' },
        inputPlaceholder: 'Selecciona tipo',
        showCancelButton: true
      });
      if (!tipoPunto) return;
      tipo = tipoPunto;
    }
    feature.properties = await showForm({}, tipo);
    try {
      if (tipo === 'polígono') await createPoligono(feature);
      else if (tipo === 'línea') await createLinea(feature);
      else if (tipo === 'sitio') await createSitio(feature);
      else if (tipo === 'equipamiento') await createEquipamiento(feature);
      await Promise.all([cargarPoligonos(), cargarLineas(), cargarSitios(), cargarEquipamientos()]);
      Swal.fire('Éxito', 'Elemento creado correctamente', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo crear el elemento', 'error');
    }
  });

  // === Edición y eliminación ===
  map.on(L.Draw.Event.EDITED, async e => {
    for (const id in e.layers._layers) {
      const layer = e.layers._layers[id];
      const feature = layer.toGeoJSON();
      const fid = feature.properties?.id;
      if (!fid) continue;
      if (feature.geometry.type === 'Polygon') await updatePoligono(fid, feature);
      else if (feature.geometry.type === 'LineString') await updateLinea(fid, feature);
      else if (feature.geometry.type === 'Point') await updateSitio(fid, feature);
    }
    await Promise.all([cargarPoligonos(), cargarLineas(), cargarSitios(), cargarEquipamientos()]);
  });

  map.on(L.Draw.Event.DELETED, async e => {
    for (const id in e.layers._layers) {
      const layer = e.layers._layers[id];
      const fid = layer.feature?.properties?.id;
      if (!fid) continue;
      if (layer.feature.geometry.type === 'Polygon') {
        if (await showConfirm('¿Eliminar polígono?')) await deletePoligono(fid);
      } else if (layer.feature.geometry.type === 'LineString') {
        if (await showConfirm('¿Eliminar línea?')) await deleteLinea(fid);
      } else if (layer.feature.geometry.type === 'Point') {
        if (await showConfirm('¿Eliminar punto?')) await deleteSitio(fid);
      }
    }
    await Promise.all([cargarPoligonos(), cargarLineas(), cargarSitios(), cargarEquipamientos()]);
  });

  // === Checkboxes de capas ===
  const layerResultados = L.geoJSON(null, { color: 'orange' }).addTo(map);
  function toggleLayer(visible, layer) { visible ? map.addLayer(layer) : map.removeLayer(layer); }
  document.getElementById('chkBarrios').onchange = e => toggleLayer(e.target.checked, layerBarrio);
  document.getElementById('chkHidrografia').onchange = e => toggleLayer(e.target.checked, layerHidrografia);
  document.getElementById('chkEquipamientos').onchange = e => toggleLayer(e.target.checked, layerEquipamientos);
  document.getElementById('chkSitios').onchange = e => toggleLayer(e.target.checked, layerSitios);
  document.getElementById('chkResultados').onchange = e => toggleLayer(e.target.checked, layerResultados);

  // === CONSULTAS ESPACIALES ===
  const btnBuffer = document.getElementById('btn-activar-buffer');
  const radiusInput = document.getElementById('buffer-radius');
  const statusText = document.getElementById('buffer-status');
  let bufferActivo = false;

  btnBuffer.addEventListener('click', () => {
    bufferActivo = !bufferActivo;
    btnBuffer.textContent = bufferActivo ? 'Cancelar' : 'Activar Buffer';
    statusText.textContent = bufferActivo ? 'Haz clic en el mapa para generar buffer.' : '';
    if (bufferActivo) {
      map.once('click', async e => {
        bufferActivo = false;
        btnBuffer.textContent = 'Activar Buffer';
        statusText.textContent = '';
        const radio = parseFloat(radiusInput.value) || 200;
        const centro = [e.latlng.lng, e.latlng.lat];
        try {
          const result = await ejecutarBuffer(centro, radio);
          mostrarResultadosConsulta(map, layerResultados, result.features, 'Buffer', { centro, radio });
          actualizarPanelReportes(result.features);
        } catch (err) {
          Swal.fire('Error', 'No se pudo ejecutar la consulta buffer', 'error');
        }
      });
    }
  });

  // === INTERSECCIÓN (dibujar polígono) ===
  map.on(L.Draw.Event.CREATED, async e => {
    if (e.layerType === 'polygon' && e.layer.options.color === 'blue') {
      const feature = e.layer.toGeoJSON();
      try {
        const result = await ejecutarInterseccion(feature.geometry);
        mostrarResultadosConsulta(map, layerResultados, result.features, 'Intersección');
        actualizarPanelReportes(result.features);
      } catch (err) {
        Swal.fire('Error', 'No se pudo ejecutar la intersección', 'error');
      }
    }
  });

  // === PANEL DE REPORTES ===
  window.actualizarPanelReportes = function (features = []) {
    const tbody = document.querySelector('#tabla-equipamientos tbody');
    const listaResumen = document.getElementById('lista-resumen');
    if (!features.length) {
      tbody.innerHTML = '<tr><td colspan="4">Sin resultados</td></tr>';
      listaResumen.innerHTML = '<li>Sin datos</li>';
      return;
    }
    tbody.innerHTML = features.map(f => {
      const p = f.properties || {};
      return `<tr>
        <td>${escapeHtml(p.nombre || 'N/A')}</td>
        <td>${escapeHtml(p.tipo || 'N/A')}</td>
        <td>${escapeHtml(p.barrio || 'N/A')}</td>
        <td>${p.distancia ? p.distancia.toFixed(1) : '-'}</td>
      </tr>`;
    }).join('');
    const resumen = {};
    features.forEach(f => {
      const tipo = f.properties?.tipo || 'Otros';
      resumen[tipo] = (resumen[tipo] || 0) + 1;
    });
    listaResumen.innerHTML = Object.entries(resumen).map(([k, v]) => `<li>${escapeHtml(k)}: ${v}</li>`).join('');
  };

// === BUSCADOR (por nombre) ===
const searchInput = document.getElementById('search-input');
const btnBuscar = document.getElementById('btn-buscar');
const listResultados = document.getElementById('search-results');
const tablaEquipamientos = document.querySelector('#tabla-equipamientos tbody');

function mostrarDatosEnReporte(resultado) {
  tablaEquipamientos.innerHTML = '';

  const { nombre, tipo, barrio, distancia } = resultado.props;
  const fila = `
    <tr>
      <td>${nombre || '—'}</td>
      <td>${tipo || resultado.tipo}</td>
      <td>${barrio || '—'}</td>
      <td>${distancia ? distancia.toFixed(2) : '—'}</td>
    </tr>`;
  tablaEquipamientos.innerHTML = fila;
}

function buscarPorNombre(nombre) {
  if (!nombre) {
    listResultados.innerHTML = '<li>Ingresa un nombre</li>';
    return;
  }

  nombre = nombre.toLowerCase();
  const capas = [
    { nombre: 'Barrios', layer: layerBarrio },
    { nombre: 'Sitios de Interés', layer: layerSitios },
    { nombre: 'Equipamientos', layer: layerEquipamientos }
  ];

  let encontrados = [];

  capas.forEach(({ nombre: tipo, layer }) => {
    layer.eachLayer(l => {
      const props = l.feature?.properties || {};
      if (props.nombre?.toLowerCase().includes(nombre)) {
        encontrados.push({ tipo, layer: l, props });
      }
    });
  });

  if (encontrados.length === 0) {
    listResultados.innerHTML = '<li>Sin coincidencias</li>';
    tablaEquipamientos.innerHTML = '';
    return;
  }


  listResultados.innerHTML = encontrados.map((r, i) =>
    `<li data-i="${i}" style="cursor:pointer;">${r.props.nombre} <em>(${r.tipo})</em></li>`
  ).join('');

  listResultados.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const r = encontrados[li.dataset.i];
      const bounds = r.layer.getBounds?.() || L.latLngBounds(r.layer.getLatLng(), r.layer.getLatLng());
      map.fitBounds(bounds.pad(1.5));

      if (r.layer.getPopup()) r.layer.openPopup();
      else r.layer.bindPopup(`<b>${r.props.nombre}</b><br>${r.tipo}`).openPopup();

      mostrarDatosEnReporte(r);
    });
  });

  if (encontrados.length === 1) {
    const r = encontrados[0];
    const bounds = r.layer.getBounds?.() || L.latLngBounds(r.layer.getLatLng(), r.layer.getLatLng());
    map.fitBounds(bounds.pad(1.5));
    if (r.layer.getPopup()) r.layer.openPopup();
    else r.layer.bindPopup(`<b>${r.props.nombre}</b><br>${r.tipo}`).openPopup();

    mostrarDatosEnReporte(r);
  }
}

btnBuscar.addEventListener('click', () => buscarPorNombre(searchInput.value));
searchInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') buscarPorNombre(searchInput.value);
});

})();
