// ==========================================================
// #EJEMPLOS
// HOSPEDAJES DE EJEMPLO
// Son hoteles reales de Antigua Guatemala para que la página
// se vea funcionando. No guardamos fotos: cada hotel tiene el
// botón "Ver en Google Maps" que abre su página con fotos,
// opiniones y horarios.
//
// OJO: las coordenadas son aproximadas y el precio y los
// servicios son de ejemplo (por eso tienen es_ejemplo = TRUE).
// El grupo debe revisarlos en Google Maps y corregirlos.
// ==========================================================

const tipos = [
  { slug: 'hotel', nombre: 'Hotel', icono: 'bi-building', descripcion: 'Establecimiento con habitaciones privadas y servicios de recepción.' },
  { slug: 'hotel-boutique', nombre: 'Hotel boutique', icono: 'bi-gem', descripcion: 'Hotel pequeño con diseño o ambiente particular.' },
  { slug: 'hostal', nombre: 'Hostal', icono: 'bi-backpack', descripcion: 'Hospedaje económico, con dormitorios compartidos o habitaciones sencillas.' },
  { slug: 'posada', nombre: 'Posada', icono: 'bi-house-door', descripcion: 'Hospedaje familiar de pocas habitaciones.' },
  { slug: 'casa-huespedes', nombre: 'Casa de huéspedes', icono: 'bi-house-heart', descripcion: 'Vivienda que ofrece habitaciones a huéspedes.' },
  { slug: 'apartamento', nombre: 'Apartamento turístico', icono: 'bi-door-open', descripcion: 'Apartamento o casa completa para alquiler por noches.' },
];

const hospedajes = [
  {
    tipo: 'hotel', nombre: 'Hotel Museo Casa Santo Domingo', direccion: '3a. Calle Oriente #28',
    latitud: 14.559400, longitud: -90.729000, precio_desde: 1500,
    servicios: ['wifi', 'parqueo', 'restaurante', 'piscina', 'agua_caliente', 'tarjeta', 'accesible'],
    descripcion: 'Hotel instalado en el antiguo convento de Santo Domingo, con museos, jardines y ruinas coloniales dentro del complejo.',
  },
  {
    tipo: 'hotel', nombre: 'Porta Hotel Antigua', direccion: '8a. Calle Poniente #1',
    latitud: 14.553600, longitud: -90.735600, precio_desde: 900,
    servicios: ['wifi', 'parqueo', 'restaurante', 'piscina', 'agua_caliente', 'tarjeta'],
    descripcion: 'Hotel con piscina y jardines, a pocas cuadras del Parque Central.',
  },
  {
    tipo: 'hotel', nombre: 'Hotel Camino Real Antigua', direccion: '7a. Calle Poniente #33 B',
    latitud: 14.554500, longitud: -90.738300, precio_desde: 850,
    servicios: ['wifi', 'parqueo', 'restaurante', 'piscina', 'agua_caliente', 'tarjeta', 'desayuno'],
    descripcion: 'Hotel en el sector poniente del centro histórico, con piscina y restaurante.',
  },
  {
    tipo: 'hotel-boutique', nombre: 'El Convento Boutique Hotel', direccion: '2a. Avenida Norte #11',
    latitud: 14.560000, longitud: -90.730600, precio_desde: 1400,
    servicios: ['wifi', 'restaurante', 'piscina', 'agua_caliente', 'tarjeta', 'desayuno'],
    descripcion: 'Hotel boutique de estilo colonial, con habitaciones amplias y decoración artesanal.',
  },
  {
    tipo: 'hotel', nombre: 'Hotel Posada de Don Rodrigo', direccion: '5a. Avenida Norte #17',
    latitud: 14.559500, longitud: -90.734500, precio_desde: 700,
    servicios: ['wifi', 'restaurante', 'agua_caliente', 'tarjeta'],
    descripcion: 'Casona colonial junto al Arco de Santa Catalina, con patios, fuentes y marimba.',
  },
  {
    tipo: 'hotel', nombre: 'Hotel Aurora', direccion: '4a. Calle Oriente #16',
    latitud: 14.557900, longitud: -90.731800, precio_desde: 450,
    servicios: ['wifi', 'desayuno', 'agua_caliente'],
    descripcion: 'Hotel tradicional alrededor de un patio colonial, a dos cuadras del Parque Central.',
  },
  {
    tipo: 'hotel-boutique', nombre: 'Mesón Panza Verde', direccion: '5a. Avenida Sur #19',
    latitud: 14.553000, longitud: -90.734200, precio_desde: 1100,
    servicios: ['wifi', 'restaurante', 'piscina', 'agua_caliente', 'tarjeta'],
    descripcion: 'Hotel boutique con suites amplias, galería de arte y restaurante.',
  },
  {
    tipo: 'hotel-boutique', nombre: 'Hotel Palacio de Doña Leonor', direccion: '4a. Calle Oriente #8',
    latitud: 14.557700, longitud: -90.732500, precio_desde: 1000,
    servicios: ['wifi', 'restaurante', 'desayuno', 'agua_caliente', 'tarjeta'],
    descripcion: 'Hotel en una casa histórica del siglo XVI, a media cuadra de la Catedral.',
  },
  {
    tipo: 'hotel-boutique', nombre: 'Posada del Ángel', direccion: '4a. Avenida Sur #24 A',
    latitud: 14.554500, longitud: -90.733000, precio_desde: 1200,
    servicios: ['wifi', 'desayuno', 'agua_caliente', 'tarjeta', 'piscina'],
    descripcion: 'Pequeño hotel boutique con chimeneas en las habitaciones y jardín interior.',
  },
  {
    tipo: 'hostal', nombre: 'Tropicana Hostel', direccion: '6a. Calle Poniente #2',
    latitud: 14.555000, longitud: -90.735000, precio_desde: 90,
    servicios: ['wifi', 'piscina', 'cocina', 'agua_caliente', 'traslados'],
    descripcion: 'Hostal con dormitorios compartidos, piscina y ambiente para viajeros de mochila.',
  },
  {
    tipo: 'posada', nombre: 'Posada Juma Ocag', direccion: 'Alameda Santa Lucía Norte #13',
    latitud: 14.560000, longitud: -90.739800, precio_desde: 200,
    servicios: ['wifi', 'agua_caliente'],
    descripcion: 'Posada familiar sencilla y económica, cerca del mercado y la terminal de buses.',
  },
];

module.exports = { tipos, hospedajes };
