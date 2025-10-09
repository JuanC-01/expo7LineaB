import { getLineas, createLinea, deleteLinea, updateLinea, getBarrio } from './api.js';
import { editableLayers } from './map.js';
import { escapeHtml } from './utils.js';
import { showForm, showConfirm } from './ui.js';


export const layerLineas = L.geoJSON(null, {
  style: { color: 'red', weight: 3 },
  onEachFeature: (feature, layer) => attachPopup(layer)
});

export const layerBarrio = L.geoJSON(null, {
  style: { color: 'green', weight: 2, fillOpacity: 0.1 },
  onEachFeature: (feature, layer) => {
    layer.bindPopup(`<b>Barrio:</b> ${escapeHtml(feature.properties.nombre)}`);
  }
});


export async function cargarLineas() {
  const data = await getLineas(); 
  layerLineas.clearLayers().addData(data);
  editableLayers.clearLayers();
  layerLineas.eachLayer(l => editableLayers.addLayer(l));
}


export async function cargarBarrio(nombre) {
  try {
    const feature = await getBarrio(nombre);
    layerBarrio.clearLayers().addData(feature);
  } catch (err) {
    console.error('Error al cargar el barrio:', err);
  }
}


function attachPopup(layer) {
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

  layer.on('popupopen', (e) => {
    const node = e.popup._contentNode;

    node.querySelector('.btn-delete').onclick = async () => {
      if (await showConfirm('¿Eliminar esta línea?')) {
        await deleteLinea(id);
        await cargarLineas();
      }
    };

    node.querySelector('.btn-edit').onclick = async () => {
      const nuevo = await showForm(props);
      const feature = layer.toGeoJSON();
      feature.properties = nuevo;
      await updateLinea(id, feature);
      await cargarLineas();
    };
  });
}
