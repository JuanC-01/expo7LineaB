import { initMap, editableLayers } from './map.js';
import { layerLineas, cargarLineas, layerBarrio, cargarBarrio } from './layers.js';
import { createLinea, updateLinea, deleteLinea } from './api.js';
import { showForm, showConfirm } from './ui.js';

(async () => {
  const map = initMap();


  layerBarrio.addTo(map);
  layerLineas.addTo(map);
  editableLayers.addTo(map);


  const miBarrio = 'TORASSO ALTO';

  await cargarBarrio(miBarrio);
  await cargarLineas();

if (layerBarrio.getLayers().length) {
  const bounds = layerBarrio.getBounds();
  const center = bounds.getCenter();
  map.setView(center, 16); 
}
  console.log(' Mapa, barrio y líneas cargados correctamente');


  map.on(L.Draw.Event.CREATED, async (e) => {
    const layer = e.layer;
    const feature = layer.toGeoJSON();

    const datos = await showForm({ barrio: miBarrio });
    feature.properties = datos;


    await createLinea(feature);
    await cargarLineas();
  });


  map.on(L.Draw.Event.EDITED, async (e) => {
    for (const id in e.layers._layers) {
      const layer = e.layers._layers[id];
      const feature = layer.toGeoJSON();
      const lineaId = feature.properties?.id;
      if (lineaId) {
        await updateLinea(lineaId, feature);
      }
    }
    await cargarLineas();
  });


  map.on(L.Draw.Event.DELETED, async (e) => {
    for (const id in e.layers._layers) {
      const layer = e.layers._layers[id];
      const lineaId = layer.feature?.properties?.id;
      if (lineaId && await showConfirm('¿Eliminar esta línea?')) {
        await deleteLinea(lineaId);
      }
    }
    await cargarLineas();
  });
})();
