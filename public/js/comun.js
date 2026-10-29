// ==========================================================
// FUNCIONES QUE USAN TODAS LAS PÁGINAS
// Todas las páginas cargan este archivo con:
//   <script src="js/comun.js"></script>
// ==========================================================


// ==========================================================
// 1. SESIÓN   #SESION_NAVEGADOR
// Cuando el usuario inicia sesión guardamos su token y sus datos
// en el navegador (localStorage), para que no tenga que entrar
// otra vez al cambiar de página.
// ==========================================================

// #INICIO_SESION - Guarda el token y el usuario después de iniciar sesión
function guardarSesion(token, usuario) {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

// Devuelve el usuario que inició sesión, o null si no hay nadie
function usuarioActual() {
  const texto = localStorage.getItem('usuario');
  if (!texto) {
    return null;
  }
  return JSON.parse(texto);
}

// #CERRAR_SESION - Borra la sesión del navegador y vuelve al inicio
function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  location.href = 'index.html';
}

// ¿Es administrador o registrador? (los que pueden registrar hospedajes)
function esEditor(usuario) {
  return usuario !== null && (usuario.rol === 'admin' || usuario.rol === 'registrador');
}

const NOMBRE_ROL = {
  admin: 'Administrador',
  registrador: 'Registrador',
  cliente: 'Cliente',
};


// ==========================================================
// 2. COMUNICACIÓN CON EL SERVIDOR   #API_FETCH
// api('/hospedajes')  -> pide datos (GET)
// api('/hospedajes', { method: 'POST', body: datos })  -> envía datos
// Si el servidor responde con error, se lanza una excepción
// con el mensaje del servidor (se atrapa con try/catch).
// ==========================================================

async function api(ruta, opciones) {
  opciones = opciones || {};

  const encabezados = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token) {
    encabezados.Authorization = 'Bearer ' + token;
  }

  let cuerpo = undefined;
  if (opciones.body) {
    cuerpo = JSON.stringify(opciones.body);
  }

  const respuesta = await fetch('/api' + ruta, {
    method: opciones.method || 'GET',
    headers: encabezados,
    body: cuerpo,
  });

  let datos = {};
  try {
    datos = await respuesta.json();
  } catch (e) {
    datos = {};
  }

  if (!respuesta.ok) {
    const error = new Error(datos.error || 'Ocurrió un error.');
    error.status = respuesta.status;  // ej: 401, 403, 404, 409
    error.datos = datos;
    throw error;
  }
  return datos;
}


// ==========================================================
// 3. UTILIDADES PEQUEÑAS
// ==========================================================

// Evita que un texto escrito por un usuario se convierta en código HTML.
// Siempre que mostremos datos de la base dentro de HTML usamos esc().
function esc(texto) {
  if (texto === null || texto === undefined) {
    return '';
  }
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// #GOOGLE_MAPS - Enlace para ver el punto en Google Maps
function urlMaps(lat, lng) {
  return 'https://www.google.com/maps?q=' + lat + ',' + lng;
}

// #GOOGLE_MAPS - Enlace a la página del hotel en Google Maps (ahí están sus fotos, opiniones y horario).
// Si guardamos el enlace del hotel lo usamos; si no, buscamos el hotel por su nombre.
function paginaGoogleMaps(h) {
  if (h.enlace_maps) {
    return h.enlace_maps;
  }
  const busqueda = h.nombre + ', ' + h.municipio;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(busqueda);
}

// #COMO_LLEGAR - Enlace para que Google Maps dé la ruta desde donde está la persona
function urlComoLlegar(lat, lng) {
  return 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng;
}

// Lee un valor de la dirección. Ej: en hospedaje.html?id=5, parametro('id') da '5'
function parametro(nombre) {
  return new URLSearchParams(location.search).get(nombre);
}

// Muestra un mensaje de Bootstrap dentro de un contenedor.
// tipo: 'danger' (rojo), 'success' (verde), 'warning' (amarillo), 'info' (azul)
function alerta(contenedor, mensaje, tipo) {
  tipo = tipo || 'danger';
  contenedor.innerHTML = `
    <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
      ${mensaje}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>`;
}

// 350 -> 'Q350'
function precio(valor) {
  if (valor === null || valor === undefined) {
    return '';
  }
  return 'Q' + Number(valor).toLocaleString('es-GT');
}

// Etiqueta de color según la revisión
function etiquetaRevision(revision) {
  if (revision === 'aprobado') return '<span class="badge text-bg-success">Aprobado</span>';
  if (revision === 'rechazado') return '<span class="badge text-bg-danger">Rechazado</span>';
  return '<span class="badge text-bg-warning">Pendiente</span>';
}

// Lista de servicios (wifi, parqueo...). La pedimos al servidor una sola vez.
let listaServicios = null;
async function cargarServicios() {
  if (listaServicios === null) {
    listaServicios = await api('/servicios');
  }
  return listaServicios;
}


// ==========================================================
// 4. MENÚ DE ARRIBA   #MENU
// Cambia según quién esté usando la página:
//   - sin sesión: botones "Iniciar sesión" y "Crear cuenta"
//   - con sesión: el nombre del usuario con su menú
// "activa" es la página donde estamos, para resaltarla.
// ==========================================================

function pintarMenu(activa) {
  const usuario = usuarioActual();

  // Crea un enlace del menú
  function enlace(pagina, texto, clave) {
    let clase = 'nav-link';
    if (activa === clave) {
      clase += ' active';
    }
    return `<li class="nav-item"><a class="${clase}" href="${pagina}">${texto}</a></li>`;
  }

  // Enlaces de la izquierda
  let enlaces = enlace('index.html', 'Inicio', 'inicio') + enlace('hospedajes.html', 'Catálogo', 'hospedajes');
  if (usuario) {
    enlaces += enlace('favoritos.html', 'Mis favoritos', 'favoritos');
  }
  if (esEditor(usuario)) {
    enlaces += enlace('registro.html', 'Registrar hospedaje', 'registro');
    if (usuario.rol === 'admin') {
      enlaces += enlace('mis-registros.html', 'Todos los registros', 'mis');
      enlaces += enlace('admin.html', 'Administración', 'admin');
    } else {
      enlaces += enlace('mis-registros.html', 'Mis registros', 'mis');
    }
  }

  // Parte de la derecha
  let derecha = '';
  if (!usuario) {
    derecha = `
      <a class="btn btn-outline-light btn-sm" href="login.html"><i class="bi bi-box-arrow-in-right"></i> Iniciar sesión</a>
      <a class="btn btn-warning btn-sm" href="login.html?modo=crear">Crear cuenta</a>`;
  } else {
    const inicial = usuario.nombre.trim().charAt(0).toUpperCase();

    let opcionesExtra = '';
    if (esEditor(usuario)) {
      opcionesExtra += '<li><a class="dropdown-item" href="mis-registros.html"><i class="bi bi-list-check"></i> Registros</a></li>';
    }
    if (usuario.rol === 'admin') {
      opcionesExtra += '<li><a class="dropdown-item" href="admin.html"><i class="bi bi-speedometer2"></i> Administración</a></li>';
    }

    derecha = `
      <div class="dropdown">
        <button class="btn btn-outline-light btn-sm dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown">
          <span class="avatar">${esc(inicial)}</span>
          <span class="text-start lh-sm">
            <span class="d-block">${esc(usuario.nombre)}</span>
            <span class="d-block small opacity-75">${NOMBRE_ROL[usuario.rol]}</span>
          </span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="cuenta.html"><i class="bi bi-person-gear"></i> Mi cuenta</a></li>
          <li><a class="dropdown-item" href="favoritos.html"><i class="bi bi-heart"></i> Mis favoritos</a></li>
          ${opcionesExtra}
          <li><hr class="dropdown-divider"></li>
          <li><button class="dropdown-item text-danger" onclick="cerrarSesion()"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</button></li>
        </ul>
      </div>`;
  }

  document.getElementById('menu').innerHTML = `
    <nav class="navbar navbar-expand-xl navbar-dark barra">
      <div class="container">
        <a class="navbar-brand fw-semibold" href="index.html"><i class="bi bi-building"></i> Hospedajes Antigua</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Menú">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="nav">
          <ul class="navbar-nav me-auto">${enlaces}</ul>
          <div class="d-flex align-items-center gap-2">${derecha}</div>
        </div>
      </div>
    </nav>`;
}


// ==========================================================
// 5. PERMISOS EN LAS PÁGINAS   #PERMISOS
// (El servidor también revisa los permisos; esto es para que
// la página no muestre botones que el usuario no puede usar.)
// ==========================================================

// Si la página necesita sesión (o un rol), manda al login cuando no se cumple.
// Ejemplo: exigirSesion(['admin']) -> solo el administrador
function exigirSesion(rolesPermitidos) {
  rolesPermitidos = rolesPermitidos || [];
  const usuario = usuarioActual();
  const paginaActual = location.pathname.substring(1) + location.search;

  if (!usuario) {
    location.href = 'login.html?volver=' + encodeURIComponent(paginaActual);
    return null;
  }
  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario.rol)) {
    location.href = 'login.html?motivo=permiso&volver=' + encodeURIComponent(paginaActual);
    return null;
  }
  return usuario;
}

// ¿Puede editar o eliminar este hospedaje?
// El admin siempre; el registrador solo los suyos que no estén aprobados.
function puedeModificar(hospedaje) {
  const usuario = usuarioActual();
  if (!usuario) return false;
  if (usuario.rol === 'admin') return true;
  return usuario.rol === 'registrador'
    && usuario.id === hospedaje.creado_por_id
    && hospedaje.revision !== 'aprobado';
}

// #ELIMINAR_HOSPEDAJE - Pregunta antes de eliminar. Devuelve true si se eliminó.
async function eliminarHospedaje(id, nombre) {
  const seguro = confirm('¿Eliminar "' + nombre + '"? Esta acción no se puede deshacer.');
  if (!seguro) {
    return false;
  }
  await api('/hospedajes/' + id, { method: 'DELETE' });
  return true;
}

// Para el botón "Eliminar" de las tarjetas del catálogo
async function eliminarDesdeTarjeta(boton) {
  try {
    const eliminado = await eliminarHospedaje(boton.dataset.id, boton.dataset.nombre);
    if (eliminado) {
      location.reload();  // recargamos para que desaparezca la tarjeta
    }
  } catch (error) {
    alert(error.message);
  }
}


// ==========================================================
// 6. FAVORITOS (el corazón ❤)   #FAVORITOS
// ==========================================================

// Lista con los id de mis hospedajes favoritos
let misFavoritos = [];

async function cargarFavoritos() {
  misFavoritos = [];
  if (usuarioActual()) {
    try {
      misFavoritos = await api('/favoritos/ids');
    } catch (error) {
      misFavoritos = [];
    }
  }
}

// Crea el botón del corazón. "grande" es para la página de detalle.
function botonFavorito(id, grande) {
  const esFavorito = misFavoritos.includes(id);

  let clase = 'btn-fav';
  if (grande) clase += ' btn-fav-grande';
  if (esFavorito) clase += ' activo';

  let icono = 'bi-heart';
  let titulo = 'Guardar en favoritos';
  if (esFavorito) {
    icono = 'bi-heart-fill';
    titulo = 'Quitar de favoritos';
  }

  return `<button type="button" class="${clase}" data-id="${id}" title="${titulo}" onclick="alternarFavorito(this)">
            <i class="bi ${icono}"></i>
          </button>`;
}

// Al tocar el corazón: si no está en favoritos lo agrega, si ya está lo quita
async function alternarFavorito(boton) {
  // Sin sesión, lo mandamos a crear cuenta
  if (!usuarioActual()) {
    const paginaActual = location.pathname.substring(1) + location.search;
    location.href = 'login.html?modo=crear&motivo=favoritos&volver=' + encodeURIComponent(paginaActual);
    return;
  }

  const id = Number(boton.dataset.id);
  const yaEsFavorito = misFavoritos.includes(id);

  try {
    if (yaEsFavorito) {
      await api('/favoritos/' + id, { method: 'DELETE' });
      misFavoritos = misFavoritos.filter(function (f) { return f !== id; });
    } else {
      await api('/favoritos/' + id, { method: 'POST' });
      misFavoritos.push(id);
    }
  } catch (error) {
    alert(error.message);
    return;
  }

  // Cambiamos el dibujo del corazón
  boton.classList.toggle('activo', !yaEsFavorito);
  boton.querySelector('i').className = yaEsFavorito ? 'bi bi-heart' : 'bi bi-heart-fill';
  boton.title = yaEsFavorito ? 'Guardar en favoritos' : 'Quitar de favoritos';

  // Si la página tiene la función alQuitarFavorito (la de favoritos), la avisamos
  if (yaEsFavorito && typeof alQuitarFavorito === 'function') {
    alQuitarFavorito(id);
  }
}


// ==========================================================
// 7. TARJETAS DE HOSPEDAJE (catálogo y favoritos)   #TARJETAS
// ==========================================================

// Íconos de los servicios. "maximo" limita cuántos se muestran.
function iconosServicios(clavesDelHospedaje, servicios, maximo) {
  let html = '';
  let cantidad = 0;
  for (const servicio of servicios) {
    if (clavesDelHospedaje.includes(servicio.clave)) {
      cantidad++;
      if (cantidad <= maximo) {
        html += `<i class="bi ${servicio.icono} servicio" title="${servicio.nombre}"></i>`;
      }
    }
  }
  if (cantidad > maximo) {
    html += `<span class="small text-muted">+${cantidad - maximo}</span>`;
  }
  return html;
}

// Si una foto no carga, ponemos un recuadro con un ícono
function fotoFallida(imagen) {
  const recuadro = document.createElement('div');
  recuadro.className = 'foto-vacia';
  recuadro.innerHTML = '<i class="bi bi-image"></i>';
  imagen.replaceWith(recuadro);
}

// Crea el HTML de la tarjeta de un hospedaje
function tarjetaHospedaje(h, servicios) {
  // Foto, o un ícono si no tiene foto
  let foto = `<div class="foto-vacia"><i class="bi ${esc(h.icono)}"></i></div>`;
  if (h.foto_url) {
    foto = `<img src="${esc(h.foto_url)}" class="card-img-top" alt="${esc(h.nombre)}" loading="lazy" onerror="fotoFallida(this)">`;
  }

  let etiquetaEjemplo = '';
  if (h.es_ejemplo) {
    etiquetaEjemplo = '<span class="badge rounded-pill etiqueta-ejemplo" title="Datos de ejemplo sin verificar">Ejemplo</span>';
  }

  let textoPrecio = '';
  if (h.precio_desde !== null) {
    textoPrecio = `<span class="small fw-semibold">desde ${precio(h.precio_desde)}</span>`;
  }

  // Botones Editar y Eliminar (solo si tiene permiso)
  let botonesAdmin = '';
  if (puedeModificar(h)) {
    botonesAdmin = `
      <div class="card-footer bg-transparent d-flex gap-2">
        <a href="registro.html?id=${h.id}" class="btn btn-outline-secondary btn-sm flex-fill"><i class="bi bi-pencil"></i> Editar</a>
        <button type="button" class="btn btn-outline-danger btn-sm flex-fill"
                data-id="${h.id}" data-nombre="${esc(h.nombre)}" onclick="eliminarDesdeTarjeta(this)">
          <i class="bi bi-trash"></i> Eliminar
        </button>
      </div>`;
  }

  return `
    <div class="col-sm-6 col-lg-4">
      <div class="card h-100 tarjeta-lugar shadow-sm position-relative">
        ${botonFavorito(h.id, false)}
        ${foto}
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span>
              <span class="badge rounded-pill text-bg-light border"><i class="bi ${esc(h.icono)}"></i> ${esc(h.tipo)}</span>
              ${etiquetaEjemplo}
            </span>
            ${textoPrecio}
          </div>
          <h5 class="card-title mb-1">${esc(h.nombre)}</h5>
          <p class="text-muted small mb-2"><i class="bi bi-pin-map"></i> ${esc(h.direccion || h.municipio)}</p>
          <p class="card-text small texto-corto">${esc(h.descripcion)}</p>
          <div>${iconosServicios(h.servicios, servicios, 6)}</div>
        </div>
        <div class="card-footer bg-transparent border-0 d-flex gap-2 pb-3">
          <a href="hospedaje.html?id=${h.id}" class="btn btn-primary btn-sm flex-fill">Ver detalle</a>
          <a href="${paginaGoogleMaps(h)}" target="_blank" class="btn btn-outline-secondary btn-sm" title="Fotos y opiniones en Google Maps">
            <i class="bi bi-google"></i> Ver en Google Maps
          </a>
        </div>
        ${botonesAdmin}
      </div>
    </div>`;
}
