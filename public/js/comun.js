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

// #PERMISOS - Permisos de la cuenta (los manda el servidor al iniciar sesión).
// Si la sesión es de antes de que existieran los permisos, usamos los de su rol.
function permisosDe(usuario) {
  if (!usuario) return [];
  if (Array.isArray(usuario.permisos)) return usuario.permisos;
  if (usuario.rol === 'admin') return ['registrar', 'propios', 'editar_todos', 'eliminar_todos', 'aprobar', 'publicar', 'estado', 'tipos', 'usuarios'];
  if (usuario.rol === 'registrador') return ['registrar', 'propios', 'editar_todos', 'publicar'];
  return [];
}

// ¿Tiene este permiso? Ej.: tienePermiso(usuarioActual(), 'aprobar')
function tienePermiso(usuario, permiso) {
  return permisosDe(usuario).includes(permiso);
}

// ¿Maneja hospedajes? (tiene al menos un permiso: administradores y registradores)
function esEditor(usuario) {
  return permisosDe(usuario).length > 0;
}

// ¿Puede ver y manejar los registros de todos (no solo los suyos)?
function veTodos(usuario) {
  return ['editar_todos', 'eliminar_todos', 'aprobar', 'estado'].some(function (p) {
    return tienePermiso(usuario, p);
  });
}

// ¿Puede entrar a Administración?
function esAdministrador(usuario) {
  return tienePermiso(usuario, 'usuarios') || tienePermiso(usuario, 'tipos');
}

// Pide al servidor los datos y permisos actuales de la cuenta y los guarda.
// Así, si el administrador cambia los permisos, la página se entera sin volver a entrar.
async function refrescarSesion() {
  const usuario = usuarioActual();
  if (!usuario) return null;
  try {
    const yo = await api('/auth/yo');
    const actualizado = Object.assign({}, usuario, {
      nombre: yo.nombre, correo: yo.correo, rol: yo.rol, permisos: yo.permisos,
    });
    localStorage.setItem('usuario', JSON.stringify(actualizado));
    return actualizado;
  } catch (error) {
    return usuario;
  }
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

let menuActivo = null;   // la página marcada en el menú (para volver a dibujarlo)

function pintarMenu(activa) {
  // La primera vez, revisamos con el servidor si cambiaron los permisos y redibujamos el menú
  if (menuActivo === null && usuarioActual()) {
    refrescarSesion().then(function () { pintarMenu(menuActivo); });
  }
  menuActivo = activa;
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
  // Cada enlace aparece solo si la cuenta tiene el permiso (#PERMISOS)
  if (tienePermiso(usuario, 'registrar')) {
    enlaces += enlace('registro.html', 'Registrar hospedaje', 'registro');
  }
  if (esEditor(usuario)) {
    enlaces += enlace('mis-registros.html', veTodos(usuario) ? 'Todos los registros' : 'Mis registros', 'mis');
  }
  if (esAdministrador(usuario)) {
    enlaces += enlace('admin.html', 'Administración', 'admin');
  }

  // Parte de la derecha
  let derecha = '';
  if (!usuario) {
    derecha = `
      <a class="btn btn-outline-secondary btn-sm" href="login.html">Iniciar sesión</a>
      <a class="btn btn-primary btn-sm" href="login.html?modo=crear">Crear cuenta</a>`;
  } else {
    const inicial = usuario.nombre.trim().charAt(0).toUpperCase();

    let opcionesExtra = '';
    if (esEditor(usuario)) {
      opcionesExtra += '<li><a class="dropdown-item" href="mis-registros.html"><i class="bi bi-list-check"></i> Registros</a></li>';
    }
    if (esAdministrador(usuario)) {
      opcionesExtra += '<li><a class="dropdown-item" href="admin.html"><i class="bi bi-speedometer2"></i> Administración</a></li>';
    }

    derecha = `
      <div class="dropdown">
        <button class="btn btn-sm boton-usuario dropdown-toggle d-flex align-items-center gap-2" data-bs-toggle="dropdown">
          <span class="avatar">${esc(inicial)}</span>
          <span class="text-start lh-sm">
            <span class="d-block">${esc(usuario.nombre)}</span>
            <span class="d-block small text-muted">${NOMBRE_ROL[usuario.rol]}</span>
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

  // #IDIOMA - Botón ES | EN (solo en las páginas públicas, que cargan js/idioma.js)
  if (typeof botonIdioma === 'function') {
    derecha = botonIdioma() + derecha;
  }

  document.getElementById('menu').innerHTML = `
    <nav class="navbar navbar-expand-xl navbar-light barra">
      <div class="container">
        <a class="navbar-brand" href="index.html"><span class="logo"><i class="bi bi-building"></i></span> Hospedajes Antigua</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav" aria-label="Menú">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="nav">
          <ul class="navbar-nav ms-xl-3 me-auto gap-xl-1">${enlaces}</ul>
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

// ¿Es suyo y tiene el permiso "propios"?
function esPropio(usuario, hospedaje) {
  return tienePermiso(usuario, 'propios') && usuario.id === hospedaje.creado_por_id;
}

// ¿Puede editar este hospedaje? (permiso "editar_todos", o "propios" si es suyo)
function puedeModificar(hospedaje) {
  const usuario = usuarioActual();
  if (!usuario) return false;
  return tienePermiso(usuario, 'editar_todos') || esPropio(usuario, hospedaje);
}

// ¿Puede eliminarlo directamente? (permiso "eliminar_todos")
function puedeEliminar(hospedaje) {
  return tienePermiso(usuarioActual(), 'eliminar_todos');
}

// #SOLICITUD_ELIMINACION - ¿Puede pedir que se elimine? (puede editarlo, no puede borrar directo y aún no se pidió)
function puedeSolicitarEliminar(hospedaje) {
  if (!usuarioActual() || puedeEliminar(hospedaje)) return false;
  return puedeModificar(hospedaje) && !hospedaje.eliminacion_solicitada;
}

// Pide el motivo y envía la solicitud. Devuelve true si se envió.
async function solicitarEliminacion(id, nombre) {
  const motivo = prompt('¿Por qué quieres eliminar "' + nombre + '"?\nUn administrador revisará la solicitud.');
  if (motivo === null) {
    return false;   // canceló
  }
  if (motivo.trim() === '') {
    alert('Escribe el motivo para pedir la eliminación.');
    return false;
  }
  await api('/hospedajes/' + id + '/solicitar-eliminacion', { method: 'POST', body: { motivo: motivo } });
  alert('Solicitud enviada. El hospedaje se eliminará cuando un administrador lo apruebe.');
  return true;
}

// Para el botón "Pedir eliminación" de las tarjetas del catálogo
async function solicitarDesdeTarjeta(boton) {
  try {
    const enviada = await solicitarEliminacion(boton.dataset.id, boton.dataset.nombre);
    if (enviada) location.reload();
  } catch (error) {
    alert(error.message);
  }
}

// Si no tiene ninguno de esos permisos, lo manda al login. (null = cualquier permiso de gestión)
// Ejemplo: exigirPermiso(['usuarios', 'tipos'])
function exigirPermiso(permisos) {
  const usuario = exigirSesion();
  if (!usuario) return null;
  const tiene = permisos === null
    ? esEditor(usuario)
    : permisos.some(function (p) { return tienePermiso(usuario, p); });
  if (!tiene) {
    const paginaActual = location.pathname.substring(1) + location.search;
    location.href = 'login.html?motivo=permiso&volver=' + encodeURIComponent(paginaActual);
    return null;
  }
  return usuario;
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

  let textoPrecio = '<span class="small text-muted">Precio no disponible</span>';
  if (h.precio_desde !== null) {
    textoPrecio = `<span class="precio-tarjeta">${precio(h.precio_desde)} <small>/ noche</small></span>`;
  }

  // Botones Editar y Eliminar (cada uno solo si tiene el permiso)
  let botonesAdmin = '';
  if (puedeModificar(h)) {
    botonesAdmin += `<a href="registro.html?id=${h.id}" class="btn btn-outline-secondary btn-sm flex-fill"><i class="bi bi-pencil"></i> Editar</a>`;
  }
  if (puedeEliminar(h)) {
    botonesAdmin += `
        <button type="button" class="btn btn-outline-danger btn-sm flex-fill"
                data-id="${h.id}" data-nombre="${esc(h.nombre)}" onclick="eliminarDesdeTarjeta(this)">
          <i class="bi bi-trash"></i> Eliminar
        </button>`;
  } else if (puedeSolicitarEliminar(h)) {
    botonesAdmin += `
        <button type="button" class="btn btn-outline-danger btn-sm flex-fill"
                data-id="${h.id}" data-nombre="${esc(h.nombre)}" onclick="solicitarDesdeTarjeta(this)">
          <i class="bi bi-trash"></i> Pedir eliminación
        </button>`;
  } else if (h.eliminacion_solicitada && puedeModificar(h)) {
    botonesAdmin += '<span class="small text-muted align-self-center"><i class="bi bi-hourglass-split"></i> Eliminación pedida</span>';
  }
  if (botonesAdmin !== '') {
    botonesAdmin = `<div class="card-footer bg-transparent d-flex gap-2">${botonesAdmin}</div>`;
  }

  return `
    <div class="col-sm-6 col-lg-4">
      <div class="card h-100 tarjeta-lugar shadow-sm position-relative">
        ${botonFavorito(h.id, false)}
        ${foto}
        <div class="card-body pb-2">
          <div class="mb-2">
            <span class="badge text-bg-light border"><i class="bi ${esc(h.icono)}"></i> ${esc(h.tipo)}</span>
            ${etiquetaEjemplo}
          </div>
          <h5 class="card-title mb-1">${esc(h.nombre)}</h5>
          <p class="text-muted small mb-2"><i class="bi bi-geo-alt"></i> ${esc(h.direccion || h.municipio)}</p>
          <p class="card-text small texto-corto mb-2">${esc(h.descripcion)}</p>
          <div>${iconosServicios(h.servicios, servicios, 6)}</div>
        </div>
        <div class="card-footer bg-transparent border-0 d-flex align-items-center gap-2 pt-0 pb-3">
          <div class="me-auto">${textoPrecio}</div>
          <a href="${paginaGoogleMaps(h)}" target="_blank" class="btn btn-outline-secondary btn-sm btn-icono"
             title="Fotos y opiniones en Google Maps" aria-label="Ver en Google Maps"><i class="bi bi-google"></i></a>
          <a href="hospedaje.html?id=${h.id}" class="btn btn-primary btn-sm">Ver detalle</a>
        </div>
        ${botonesAdmin}
      </div>
    </div>`;
}
