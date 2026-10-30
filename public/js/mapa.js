// ==========================================================
// #MAPA_OSM
// MAPAS CON OPENSTREETMAP (gratis, sin clave de API)
// OpenStreetMap es un mapa que hace la comunidad (como la
// Wikipedia de los mapas). Leaflet es la librería que lo
// dibuja en la página y pone los marcadores.
//
// Las páginas que usan mapas cargan, en este orden:
//   leaflet.css, leaflet.js, js/comun.js y js/mapa.js
//
// Google Maps se sigue usando para "Cómo llegar" y para ver
// fotos y opiniones del hotel (enlaces gratis).
// ==========================================================

// Centro de Antigua Guatemala (Parque Central)
const CENTRO_ANTIGUA = [14.5566, -90.7337];

// Crea un mapa dentro del elemento con ese id
function crearMapa(idElemento, zoom) {
  const mapa = L.map(idElemento).setView(CENTRO_ANTIGUA, zoom || 15);

  // Las "baldosas" (imágenes) del mapa vienen de OpenStreetMap.
  // Es obligatorio mostrar el crédito a sus colaboradores.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  }).addTo(mapa);

  return mapa;
}

// Marcador redondo con el ícono del tipo de hospedaje (Bootstrap Icons)
function iconoMarcador(iconoBootstrap) {
  return L.divIcon({
    className: 'marcador',
    html: `<span><i class="bi ${esc(iconoBootstrap || 'bi-building')}"></i></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],     // la punta de abajo señala el lugar exacto
    popupAnchor: [0, -32],
  });
}

// #VENTANA_MARCADOR - Lo que se ve al hacer clic en un marcador
function ventanaMarcador(h) {
  let textoPrecio = '';
  if (h.precio_desde !== null) {
    textoPrecio = `<div class="fw-semibold mb-2">desde ${precio(h.precio_desde)}</div>`;
  }
  return `
    <div class="ventana-mapa">
      <div class="small text-muted"><i class="bi ${esc(h.icono)}"></i> ${esc(h.tipo)}</div>
      <div class="fw-bold mb-1">${esc(h.nombre)}</div>
      <div class="small text-muted mb-1">${esc(h.direccion || h.municipio)}</div>
      ${textoPrecio}
      <div class="d-flex gap-1">
        <a href="hospedaje.html?id=${h.id}" class="btn btn-primary btn-sm">Ver detalle</a>
        <a href="${urlComoLlegar(h.latitud, h.longitud)}" target="_blank" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-sign-turn-right"></i> Cómo llegar
        </a>
      </div>
    </div>`;
}
