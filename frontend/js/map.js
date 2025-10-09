import 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';

export const editableLayers = new L.FeatureGroup();

export function initMap() {
  const map = L.map('map').setView([1.6133, -75.6061], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  editableLayers.addTo(map);

  // Permitir dibujar líneas
  const drawControl = new L.Control.Draw({
    draw: {
      polygon: false,
      rectangle: false,
      circle: false,
      marker: false,
      polyline: true
    },
    edit: { featureGroup: editableLayers }
  });

  map.addControl(drawControl);

  return map;
}
