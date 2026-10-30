// ==========================================================
// #IDIOMA
// CAMBIO DE IDIOMA: ESPAÑOL / INGLÉS (solo páginas públicas)
//
// Las páginas están escritas en español. Si el visitante elige
// inglés, este archivo busca cada texto de la página en el
// diccionario de abajo y lo cambia por su traducción. También
// traduce lo que JavaScript dibuja después (tarjetas, mapa,
// mensajes y errores del servidor), porque "vigila" la página.
//
// Lo cargan solo las páginas públicas, ANTES de comun.js:
//   index, hospedajes, hospedaje, login, favoritos y cuenta.
// Las páginas internas (registro, mis registros y administración)
// no lo cargan, así que siempre están en español.
//
// Para traducir un texto nuevo: agrégalo a TEXTOS_EN
// (el texto en español, exactamente como aparece, y su traducción).
// Los nombres de hoteles, direcciones y descripciones no se traducen.
//
// PARA AGREGAR OTRO IDIOMA (ej. francés):
//   1. Agrega una línea en IDIOMAS: { clave: 'fr', nombre: 'Français', bandera: 'fr' }
//      (la bandera es el código del país: https://flagicons.lipis.dev)
//   2. Crea TEXTOS_FR y PATRONES_FR como los de inglés y súmalos en DICCIONARIOS.
// ==========================================================

// ----- Idiomas disponibles -----
// "nombre" va en su propio idioma (así cada quien reconoce el suyo).
const IDIOMAS = [
  { clave: 'es', nombre: 'Español', bandera: 'gt' },   // bandera de Guatemala
  { clave: 'en', nombre: 'English', bandera: 'us' },
];

// Banderas en imagen (los emojis de bandera no se ven en Windows)
document.head.insertAdjacentHTML('beforeend',
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/css/flag-icons.min.css">');

// ----- Idioma elegido -----
// Se guarda en el navegador. La primera vez usamos el idioma del navegador.
function existeIdioma(clave) {
  return IDIOMAS.some(function (i) { return i.clave === clave; });
}

function leerIdioma() {
  try {
    const guardado = localStorage.getItem('idioma');
    if (existeIdioma(guardado)) {
      return guardado;
    }
  } catch (e) {
    // si el navegador no deja leer localStorage, seguimos con el idioma del navegador
  }
  const delNavegador = (navigator.language || 'es').slice(0, 2).toLowerCase();
  if (existeIdioma(delNavegador)) {
    return delNavegador;
  }
  return 'es';
}

const IDIOMA = leerIdioma();

// #MENU_IDIOMA - Menú desplegable con el idioma actual y la lista de idiomas.
// Lo usa pintarMenu() de comun.js
function botonIdioma() {
  const actual = IDIOMAS.find(function (i) { return i.clave === IDIOMA; });

  let opciones = '';
  for (const idioma of IDIOMAS) {
    const elegido = idioma.clave === IDIOMA;
    opciones += `
      <li>
        <button type="button" class="dropdown-item d-flex align-items-center gap-2 ${elegido ? 'active' : ''}"
                onclick="cambiarIdioma('${idioma.clave}')" lang="${idioma.clave}" ${elegido ? 'aria-current="true"' : ''}>
          <span class="fi fi-${idioma.bandera} bandera"></span>
          <span class="me-auto">${idioma.nombre}</span>
          ${elegido ? '<i class="bi bi-check2"></i>' : ''}
        </button>
      </li>`;
  }

  return `
    <div class="dropdown">
      <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle d-flex align-items-center gap-2"
              data-bs-toggle="dropdown" aria-expanded="false" aria-label="Idioma: ${actual.nombre}" title="Idioma">
        <span class="fi fi-${actual.bandera} bandera"></span>
        <span class="d-none d-sm-inline">${actual.nombre}</span>
        <span class="d-sm-none text-uppercase">${actual.clave}</span>
      </button>
      <ul class="dropdown-menu dropdown-menu-end menu-idioma">
        <li><h6 class="dropdown-header">Idioma</h6></li>
        ${opciones}
      </ul>
    </div>`;
}

// Cambia al idioma elegido y recarga la página para dibujarla en ese idioma
function cambiarIdioma(clave) {
  if (clave === IDIOMA || !existeIdioma(clave)) {
    return;
  }
  try {
    localStorage.setItem('idioma', clave);
  } catch (e) {
    // sin localStorage no se puede recordar el idioma
  }
  location.reload();
}

// ----- Diccionario: español -> inglés -----
const TEXTOS_EN = {
  'Idioma': 'Language',
  // Menú y partes comunes
  'Inicio': 'Home',
  'Catálogo': 'Catalog',
  'Mis favoritos': 'My favorites',
  'Registrar hospedaje': 'Add a place',
  'Todos los registros': 'All records',
  'Mis registros': 'My records',
  'Registros': 'Records',
  'Administración': 'Administration',
  'Iniciar sesión': 'Sign in',
  'Crear cuenta': 'Create account',
  'Mi cuenta': 'My account',
  'Cerrar sesión': 'Sign out',
  'Menú': 'Menu',
  'Administrador': 'Administrator',
  'Registrador': 'Registrar',
  'Cliente': 'Client',
  'Cargando...': 'Loading...',
  'Cerrar': 'Close',
  'Proyecto Programación 2 · Grupo 4 · Hoteles y hospedajes': 'Programming 2 Project · Group 4 · Hotels and lodging',
  'Proyecto Programación 2 · Grupo 4': 'Programming 2 Project · Group 4',

  // Tipos de hospedaje
  'Hotel': 'Hotel',
  'Hotel boutique': 'Boutique hotel',
  'Hostal': 'Hostel',
  'Posada': 'Inn',
  'Casa de huéspedes': 'Guest house',
  'Apartamento turístico': 'Vacation apartment',

  // Servicios
  'Wifi': 'Wi-Fi',
  'Parqueo': 'Parking',
  'Desayuno incluido': 'Breakfast included',
  'Restaurante': 'Restaurant',
  'Piscina': 'Pool',
  'Aire acondicionado': 'Air conditioning',
  'Agua caliente': 'Hot water',
  'Acepta mascotas': 'Pet friendly',
  'Accesible (silla de ruedas)': 'Wheelchair accessible',
  'Acepta tarjeta': 'Cards accepted',
  'Traslados / tours': 'Transfers / tours',
  'Cocina compartida': 'Shared kitchen',

  // Tarjetas, mapa y favoritos
  'Ejemplo': 'Sample',
  'Datos de ejemplo sin verificar': 'Unverified sample data',
  'Precio no disponible': 'Price not available',
  '/ noche': '/ night',
  'Ver detalle': 'View details',
  'Fotos y opiniones en Google Maps': 'Photos and reviews on Google Maps',
  'Ver en Google Maps': 'View on Google Maps',
  'Cómo llegar': 'Directions',
  'Editar': 'Edit',
  'Eliminar': 'Delete',
  'Guardar en favoritos': 'Save to favorites',
  'Quitar de favoritos': 'Remove from favorites',
  'Aprobado': 'Approved',
  'Rechazado': 'Rejected',
  'Pendiente': 'Pending',
  'Inactivo': 'Inactive',

  // Página de inicio
  'Hospedajes Antigua - Hoteles y hospedajes de Antigua Guatemala': 'Hospedajes Antigua - Hotels and lodging in Antigua Guatemala',
  'Hoteles y hospedajes': 'Hotels and places to stay',
  'de Antigua Guatemala': 'in Antigua Guatemala',
  'Encuentra hoteles, hostales y posadas, compara sus servicios y ábrelos en Google Maps.': 'Find hotels, hostels and inns, compare their amenities and open them in Google Maps.',
  'Nombre del hotel o dirección': 'Hotel name or address',
  'Buscar': 'Search',
  'Ver todos en el mapa': 'See them all on the map',
  'Explora por tipo de hospedaje': 'Browse by type of stay',
  'Consulta': 'Search',
  'Busca por nombre, tipo, municipio, servicios y precio sin necesidad de crear una cuenta.': 'Search by name, type, town, amenities and price without creating an account.',
  'Mapa y coordenadas': 'Map and coordinates',
  'Todos los hospedajes en un mapa, con la ruta para llegar en Google Maps.': 'Every place on one map, with directions in Google Maps.',
  'Información revisada': 'Reviewed information',
  'Los integrantes del Grupo 4 registran los hospedajes y el administrador revisa y aprueba la información.': 'Group 4 members add the places and the administrator reviews and approves the information.',
  'Integrantes del Grupo 4': 'Group 4 members',

  // Catálogo
  'Catálogo de hospedajes - Hospedajes Antigua': 'Catalog - Hospedajes Antigua',
  'Encuentra dónde quedarte en Antigua Guatemala.': 'Find where to stay in Antigua Guatemala.',
  'Agregar hospedaje': 'Add a place',
  'Tipo': 'Type',
  'Precio máximo (Q)': 'Maximum price (Q)',
  'Buscar por nombre, dirección o descripción': 'Search by name, address or description',
  'Todos los tipos': 'All types',
  'Precio máx. (Q)': 'Max. price (Q)',
  'Más filtros': 'More filters',
  'Departamento': 'Department',
  'Municipio': 'Town',
  'Todos': 'All',
  'Servicios': 'Amenities',
  'Limpiar filtros': 'Clear filters',
  'Ordenar por': 'Sort by',
  'Ordenar: nombre': 'Sort: name',
  'Ordenar: precio más bajo': 'Sort: lowest price',
  'Forma de ver los resultados': 'How to view the results',
  'Lista': 'List',
  'Mapa': 'Map',
  'No se encontraron hospedajes con esos filtros.': 'No places match those filters.',

  // Detalle de un hospedaje
  'Detalle del hospedaje - Hospedajes Antigua': 'Place details - Hospedajes Antigua',
  'Observación del administrador:': 'Administrator note:',
  'Información de ejemplo.': 'Sample information.',
  'La ubicación es aproximada y el precio y los servicios aún no han sido verificados. Revisa la información real en Google Maps.': 'The location is approximate and the price and amenities have not been verified yet. Check the real information in Google Maps.',
  'Código': 'Code',
  'Dirección o referencia': 'Address',
  'Municipio y departamento': 'Town and department',
  'Coordenadas (latitud, longitud)': 'Coordinates (latitude, longitude)',
  'Teléfono': 'Phone',
  'Correo': 'Email',
  'Sitio web': 'Website',
  'Redes sociales u otros contactos': 'Social media and other contacts',
  'Registrado por': 'Added by',
  'Copiar': 'Copy',
  'Volver al catálogo': 'Back to the catalog',

  // Iniciar sesión y crear cuenta
  'Iniciar sesión - Hospedajes Antigua': 'Sign in - Hospedajes Antigua',
  'Bienvenido a Hospedajes Antigua': 'Welcome to Hospedajes Antigua',
  'Hoteles, hostales y posadas de Antigua Guatemala en un solo lugar.': 'Hotels, hostels and inns in Antigua Guatemala, all in one place.',
  'Guarda tus favoritos': 'Save your favorites',
  'Ten a mano los hospedajes que te interesan.': 'Keep the places you like close at hand.',
  'Abre la ruta en Google Maps desde donde estés.': 'Open the route in Google Maps from wherever you are.',
  'Filtra por servicios y precio': 'Filter by amenities and price',
  'Wifi, parqueo, desayuno, piscina y más.': 'Wi-Fi, parking, breakfast, pool and more.',
  '¡Hola de nuevo!': 'Welcome back!',
  'Clientes, registradores y administrador entran aquí con su usuario.': 'Clients, registrars and the administrator sign in here with their username.',
  'Usuario o correo': 'Username or email',
  'Contraseña': 'Password',
  'Mostrar contraseña': 'Show password',
  'Entrar': 'Sign in',
  '¿No tienes cuenta?': "Don't have an account?",
  'Crea una gratis': 'Create one for free',
  'Crea tu cuenta de cliente': 'Create your client account',
  'Es gratis y te permite guardar tus hospedajes favoritos.': "It's free and lets you save your favorite places.",
  'Nombre completo': 'Full name',
  'Usuario': 'Username',
  'De 3 a 50: minúsculas, números, punto o guion.': '3 to 50 characters: lowercase letters, numbers, dot or hyphen.',
  'Correo (opcional)': 'Email (optional)',
  'Mínimo 6 caracteres.': 'At least 6 characters.',
  'Confirmar contraseña': 'Confirm password',
  'Las contraseñas no coinciden.': 'The passwords do not match.',
  '¿Ya tienes cuenta?': 'Already have an account?',
  'Inicia sesión': 'Sign in',
  'Muy corta: mínimo 6 caracteres.': 'Too short: at least 6 characters.',
  'Débil': 'Weak',
  'Regular': 'Fair',
  'Buena': 'Good',
  'Muy buena': 'Very good',
  'Escribe tu usuario y contraseña.': 'Enter your username and password.',
  'Revisa los campos marcados en rojo.': 'Check the fields marked in red.',
  'Crea una cuenta o inicia sesión para guardar hospedajes en tus favoritos.': 'Create an account or sign in to save places to your favorites.',
  'Tu cuenta no tiene permiso para ver esa página. Entra con una cuenta de administrador o registrador.': 'Your account cannot open that page. Sign in with an administrator or registrar account.',
  'Inicia sesión para continuar.': 'Sign in to continue.',

  // Favoritos
  'Mis favoritos - Hospedajes Antigua': 'My favorites - Hospedajes Antigua',
  'Todavía no tienes hospedajes guardados.': "You haven't saved any places yet.",
  'Toca el corazón de cualquier hospedaje del catálogo para guardarlo aquí.': 'Tap the heart on any place in the catalog to save it here.',
  'Ver catálogo': 'View catalog',

  // Mi cuenta
  'Mi cuenta - Hospedajes Antigua': 'My account - Hospedajes Antigua',
  'Mis datos': 'My details',
  'Nombre': 'Name',
  'También puedes iniciar sesión con tu correo.': 'You can also sign in with your email.',
  'Guardar datos': 'Save details',
  'Cambiar contraseña': 'Change password',
  'Contraseña actual': 'Current password',
  'Nueva contraseña': 'New password',
  'Confirmar nueva contraseña': 'Confirm new password',
  'Favoritos': 'Favorites',
  'Registrados': 'Added',
  'Datos guardados.': 'Details saved.',
  'Las contraseñas nuevas no coinciden.': 'The new passwords do not match.',
  'Contraseña cambiada. Úsala la próxima vez que inicies sesión.': 'Password changed. Use it the next time you sign in.',

  // Mensajes que manda el servidor
  'Usuario o contraseña incorrectos.': 'Incorrect username or password.',
  'Su cuenta está desactivada. Comuníquese con el administrador.': 'Your account is disabled. Please contact the administrator.',
  'Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo.': 'Too many failed attempts. Wait 15 minutes and try again.',
  'El nombre es obligatorio.': 'Name is required.',
  'El usuario debe tener de 3 a 50 caracteres: letras minúsculas, números, punto, guion o guion bajo.': 'The username must be 3 to 50 characters: lowercase letters, numbers, dot, hyphen or underscore.',
  'El correo no es válido.': 'The email is not valid.',
  'La contraseña debe tener al menos 6 caracteres.': 'The password must have at least 6 characters.',
  'La nueva contraseña debe tener al menos 6 caracteres.': 'The new password must have at least 6 characters.',
  'Ese nombre de usuario ya está en uso. Elija otro.': 'That username is already taken. Choose another one.',
  'Ese correo ya está registrado en otra cuenta.': 'That email is already used by another account.',
  'La contraseña actual no es correcta.': 'The current password is not correct.',
  'Debe iniciar sesión.': 'Please sign in.',
  'Hospedaje no encontrado.': 'Place not found.',
  'Error interno del servidor.': 'Internal server error.',
  'Ocurrió un error.': 'An error occurred.',
};

// Textos que llevan un número o un precio: se traducen con un patrón.
// $1 es la parte que cambia (el número, el precio o la fecha).
const PATRONES_EN = [
  [/^Idioma: (.+)$/, 'Language: $1'],
  [/^(\d+) hospedajes encontrados$/, '$1 places found'],
  [/^1 hospedaje encontrado$/, '1 place found'],
  [/^(\d+) registros$/, '$1 places'],
  [/^1 registro$/, '1 place'],
  [/^(\d+) hospedajes guardados$/, '$1 saved places'],
  [/^1 hospedaje guardado$/, '1 saved place'],
  [/^desde (Q[\d,.]+)$/, 'from $1'],
  [/^Desde (Q[\d,.]+) por noche$/, 'From $1 per night'],
  [/^Miembro desde el (.+)$/, 'Member since $1'],
  [/^Carné (.+)$/, 'Student ID $1'],
  // Descripción automática de los hospedajes cargados sin descripción propia
  [/^Establecimiento de hospedaje: (.+), ubicado en (.+)\.$/, 'Lodging in $2: $1.'],
];

// Diccionario de cada idioma (el español no necesita: es el idioma de las páginas)
const DICCIONARIOS = {
  en: { textos: TEXTOS_EN, patrones: PATRONES_EN },
};

// Traduce un texto al idioma elegido (si no está en el diccionario, se queda igual)
function t(texto) {
  const diccionario = DICCIONARIOS[IDIOMA];
  if (!diccionario || !texto) {
    return texto;
  }
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (diccionario.textos[limpio] !== undefined) {
    return diccionario.textos[limpio];
  }
  for (const [patron, traduccion] of diccionario.patrones) {
    if (patron.test(limpio)) {
      return limpio.replace(patron, traduccion);
    }
  }
  return texto;
}

// ----- Traducir la página -----
const ATRIBUTOS = ['placeholder', 'title', 'aria-label'];

// Traduce un texto de la página respetando los espacios de alrededor
function traducirNodoTexto(nodo) {
  const texto = nodo.nodeValue;
  if (!texto.trim()) {
    return;
  }
  const traducido = t(texto);
  if (traducido !== texto) {
    const inicio = texto.match(/^\s*/)[0];
    const fin = texto.match(/\s*$/)[0];
    nodo.nodeValue = inicio + traducido + fin;
  }
}

function traducirAtributos(elemento) {
  for (const atributo of ATRIBUTOS) {
    const valor = elemento.getAttribute(atributo);
    if (valor) {
      const traducido = t(valor);
      if (traducido !== valor) {
        elemento.setAttribute(atributo, traducido);
      }
    }
  }
}

// Recorre un pedazo de la página y traduce sus textos y atributos
function traducir(raiz) {
  if (raiz.nodeType === Node.TEXT_NODE) {
    traducirNodoTexto(raiz);
    return;
  }
  if (raiz.nodeType !== Node.ELEMENT_NODE || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(raiz.tagName)) {
    return;
  }
  traducirAtributos(raiz);
  for (const elemento of raiz.querySelectorAll('*')) {
    traducirAtributos(elemento);
  }
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: function (nodo) {
      const padre = nodo.parentElement;
      if (padre && ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(padre.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  while (recorrido.nextNode()) {
    traducirNodoTexto(recorrido.currentNode);
  }
}

// Al cargar: si el idioma no es español, traducimos lo que ya está y
// vigilamos la página para traducir lo que se dibuje después.
if (DICCIONARIOS[IDIOMA]) {
  document.documentElement.lang = IDIOMA;
  document.title = t(document.title);
  traducir(document.body);

  const vigilante = new MutationObserver(function (cambios) {
    for (const cambio of cambios) {
      if (cambio.type === 'attributes') {
        traducirAtributos(cambio.target);
      } else {
        for (const nodo of cambio.addedNodes) {
          traducir(nodo);
        }
      }
    }
  });
  vigilante.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ATRIBUTOS });
}
