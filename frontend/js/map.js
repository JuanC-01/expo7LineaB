import 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';

export const editableLayers = new L.FeatureGroup();
export const sitiosCluster = L.markerClusterGroup(); 

export function initMap() {
  const map = L.map('map').setView([1.6133, -75.6061], 14);

  // === Capa base ===
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // === Agregar capas al mapa ===
  editableLayers.addTo(map);
  sitiosCluster.addTo(map); 

  // === Herramientas de dibujo ===
  const drawControl = new L.Control.Draw({
    draw: {
      polygon: {
        allowIntersection: true,
        showArea: true,
        repeatMode: false,
        shapeOptions: { color: 'green', fillOpacity: 0.4, weight: 2 }
      },
      polyline: {
        metric: true,
        shapeOptions: { color: 'red', weight: 3 }
      },
      marker: {
        repeatMode: false,
        icon: L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
          iconSize: [25, 25],
          iconAnchor: [12, 25],
          popupAnchor: [0, -20]
        })
      },
      rectangle: false,
      circle: false,
      circlemarker: false
    },
    edit: {
      featureGroup: editableLayers,
      remove: true
    }
  });

  // === Localización de los textos ===
  L.drawLocal.draw.toolbar.buttons.polyline = 'Dibujar línea';
  L.drawLocal.draw.toolbar.buttons.polygon = 'Dibujar polígono';
  L.drawLocal.draw.toolbar.buttons.marker = 'Dibujar punto (sitio de interés)';
  L.drawLocal.edit.toolbar.buttons.edit = 'Editar geometrías';
  L.drawLocal.edit.toolbar.buttons.remove = 'Eliminar geometrías';

  map.addControl(drawControl);

  // === Tooltips ===
  map.on(L.Draw.Event.DRAWSTART, e => {
    if (e.layerType === 'polygon')
      console.log('Modo polígono: haga clic para agregar vértices.');
    else if (e.layerType === 'polyline')
      console.log('Modo línea: clic para puntos, doble clic para terminar.');
    else if (e.layerType === 'marker')
      console.log('Modo punto: clic para crear un sitio de interés.');
  });

  return map;
}
