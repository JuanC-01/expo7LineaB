import 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';

export const editableLayers = new L.FeatureGroup();

export function initMap() {
  const map = L.map('map').setView([1.6133, -75.6061], 14);

  // Capa base
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  editableLayers.addTo(map);

  // ✅ Configurar herramientas de dibujo
  const drawControl = new L.Control.Draw({
    draw: {
      // === Polígonos ===
      polygon: {
        allowIntersection: true,        // permite cruzar líneas
        showArea: true,                 // muestra el área mientras dibuja
        repeatMode: false,              // no dibuja múltiples seguidos
        shapeOptions: {
          color: 'green',
          fillOpacity: 0.4,
          weight: 2
        },
        guidelineDistance: 8,
        metric: true,
        zIndexOffset: 2000
      },

      // === Líneas ===
      polyline: {
        metric: true,
        shapeOptions: {
          color: 'red',
          weight: 3
        }
      },

      rectangle: false,
      circle: false,
      marker: false,
      circlemarker: false
    },

    edit: {
      featureGroup: editableLayers,
      remove: true
    }
  });

  // Localización de los textos
  L.drawLocal.draw.toolbar.buttons.polyline = 'Dibujar línea';
  L.drawLocal.draw.toolbar.buttons.polygon = 'Dibujar polígono';
  L.drawLocal.edit.toolbar.buttons.edit = 'Editar geometrías';
  L.drawLocal.edit.toolbar.buttons.remove = 'Eliminar geometrías';

  map.addControl(drawControl);

  // 🔹 Tooltip para avisar al usuario que puede seguir dibujando
  map.on(L.Draw.Event.DRAWSTART, (e) => {
    if (e.layerType === 'polygon') {
      console.log('Modo polígono: haga clic para agregar vértices, y clic en el primero para cerrar.');
    }
  });

  return map;
}
