// ==========================================================
// #PERMISOS_LISTA
// LISTA DE PERMISOS (funciones que se pueden dar o quitar)
//
// Cada rol tiene sus permisos:
//   admin       -> TODOS, siempre (no se pueden quitar)
//   registrador -> los que marque el administrador en "Roles";
//                  y a cada cuenta se le pueden ajustar aparte
//   cliente     -> ninguno (solo favoritos y "Mi cuenta")
//
// soloAdmin: true -> ese permiso es solo del administrador y no se
// le puede dar a un registrador (así nadie se da más poder solo).
// ==========================================================
const PERMISOS = [
  { clave: 'registrar', nombre: 'Registrar hospedajes', descripcion: 'Agregar hoteles nuevos.' },
  { clave: 'propios', nombre: 'Editar sus propios registros y pedir eliminarlos', descripcion: 'Corregir los hoteles que registró. Para eliminarlos envía una solicitud que aprueba un administrador.' },
  { clave: 'editar_todos', nombre: 'Ver y editar todos los registros', descripcion: 'Ver y corregir los hoteles de cualquier integrante, y pedir que se eliminen (lo aprueba un administrador).' },
  { clave: 'eliminar_todos', nombre: 'Eliminar registros y aprobar eliminaciones', descripcion: 'Borrar cualquier hotel directamente y aprobar o rechazar las solicitudes de eliminación.' },
  { clave: 'aprobar', nombre: 'Aprobar y rechazar', descripcion: 'Revisar los registros pendientes.' },
  { clave: 'publicar', nombre: 'Publicar sin revisión', descripcion: 'Lo que registra se publica al instante, sin esperar aprobación.' },
  { clave: 'estado', nombre: 'Activar y desactivar', descripcion: 'Ocultar o mostrar hoteles en el catálogo sin borrarlos.' },
  { clave: 'tipos', nombre: 'Administrar tipos de hospedaje', descripcion: 'Crear, editar y desactivar tipos (Hotel, Posada...).' },
  { clave: 'usuarios', nombre: 'Administrar usuarios y roles', descripcion: 'Crear cuentas, cambiar roles y permisos.', soloAdmin: true },
];

const CLAVES = PERMISOS.map(function (p) { return p.clave; });

// Permisos que trae un registrador si nadie los ha cambiado:
// registra y publica al instante, ve y corrige todos los registros y, para eliminar, pide aprobación.
const PERMISOS_REGISTRADOR = ['registrar', 'propios', 'editar_todos', 'publicar'];

// Deja solo claves válidas que se le puedan dar a un registrador
function limpiarPermisos(lista) {
  if (!Array.isArray(lista)) {
    return [];
  }
  return CLAVES.filter(function (clave) {
    const permiso = PERMISOS.find(function (p) { return p.clave === clave; });
    return lista.includes(clave) && !permiso.soloAdmin;
  });
}

// #PERMISOS_EFECTIVOS - Los permisos que de verdad tiene una cuenta
//   permisosCuenta: los ajustados a esa cuenta (null = usa los de su rol)
//   permisosRol: los del rol registrador guardados en la tabla roles
function permisosDe(rol, permisosCuenta, permisosRol) {
  if (rol === 'admin') {
    return CLAVES.slice();
  }
  if (rol === 'registrador') {
    if (Array.isArray(permisosCuenta)) {
      return limpiarPermisos(permisosCuenta);
    }
    if (Array.isArray(permisosRol)) {
      return limpiarPermisos(permisosRol);
    }
    return PERMISOS_REGISTRADOR.slice();
  }
  return [];
}

module.exports = { PERMISOS, CLAVES, PERMISOS_REGISTRADOR, limpiarPermisos, permisosDe };
