// ==========================================================
// #SERVICIOS
// LISTA DE SERVICIOS
// Servicios que puede tener un hospedaje.
// En la base de datos solo guardamos la "clave" (ej: 'wifi').
// El nombre y el ícono son para mostrarlos en las páginas.
// Para agregar un servicio nuevo, solo agrega una línea aquí.
// ==========================================================
module.exports = [
  { clave: 'wifi', nombre: 'Wifi', icono: 'bi-wifi' },
  { clave: 'parqueo', nombre: 'Parqueo', icono: 'bi-p-square' },
  { clave: 'desayuno', nombre: 'Desayuno incluido', icono: 'bi-egg-fried' },
  { clave: 'restaurante', nombre: 'Restaurante', icono: 'bi-cup-hot' },
  { clave: 'piscina', nombre: 'Piscina', icono: 'bi-water' },
  { clave: 'aire', nombre: 'Aire acondicionado', icono: 'bi-snow' },
  { clave: 'agua_caliente', nombre: 'Agua caliente', icono: 'bi-droplet-half' },
  { clave: 'mascotas', nombre: 'Acepta mascotas', icono: 'bi-heart' },
  { clave: 'accesible', nombre: 'Accesible (silla de ruedas)', icono: 'bi-person-wheelchair' },
  { clave: 'tarjeta', nombre: 'Acepta tarjeta', icono: 'bi-credit-card' },
  { clave: 'traslados', nombre: 'Traslados / tours', icono: 'bi-bus-front' },
  { clave: 'cocina', nombre: 'Cocina compartida', icono: 'bi-fire' },
];
