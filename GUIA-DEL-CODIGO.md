# Guía del código — Hospedajes Antigua (Grupo 4)

Cada parte importante del código tiene una **etiqueta** que empieza con `#`, por ejemplo `#INICIO_SESION`.
Sirve para encontrar rápido el código cuando la profesora pregunte "¿dónde hacen tal cosa?".

## Cómo buscar en Visual Studio Code

| Atajo | Qué hace |
|---|---|
| **Ctrl + Shift + F** | Busca en **todos los archivos** del proyecto (el más útil) |
| **Ctrl + F** | Busca solo en el archivo que tienes abierto |
| **Ctrl + P** | Abre un archivo escribiendo su nombre (ej. `db.js`) |

1. Presiona **Ctrl + Shift + F**.
2. Escribe la etiqueta, por ejemplo `#CONEXION_POSTGRES`.
3. Haz clic en el resultado y te lleva directo a esa línea.

> Cuidado: **Ctrl + H** es "buscar y **reemplazar**". Si escribes algo en la segunda casilla puedes cambiar el código sin querer. Para solo buscar usa **Ctrl + F** o **Ctrl + Shift + F**.

---

## Base de datos (PostgreSQL)

| Etiqueta | Qué es / para qué sirve | Dónde está |
|---|---|---|
| `#CONEXION_POSTGRES` | Conexión del servidor con la base de datos (usa la contraseña del archivo `.env`) | `src/db.js` |
| `#TABLAS` | Todas las tablas de la base de datos | `db/schema.sql` |
| `#TABLA_HOSPEDAJES` | Tabla principal: un registro por cada hotel | `db/schema.sql` |
| `#TABLA_USUARIOS` | Personas que pueden iniciar sesión y su rol | `db/schema.sql` |
| `#TABLA_TIPOS` | Tipos de hospedaje (Hotel, Hostal, Posada...) | `db/schema.sql` |
| `#TABLA_FAVORITOS` | Qué hoteles guardó cada usuario | `db/schema.sql` |
| `#CREAR_BASE` | Crea la base y las tablas desde cero (`npm run db:init`) | `scripts/init-db.js` |
| `#ACTUALIZAR_BASE` | Agrega columnas nuevas sin borrar datos (`npm run db:migrate`) | `scripts/migrate.js` |
| `#EJEMPLOS` | Hoteles de ejemplo y el script que los carga (`npm run db:ejemplos`) | `db/ejemplos.js`, `scripts/ejemplos.js` |

## Servidor (Node.js + Express)

| Etiqueta | Qué es / para qué sirve | Dónde está |
|---|---|---|
| `#SERVIDOR` | Archivo principal: se ejecuta con `npm start` | `server.js` |
| `#RUTAS_API` | Lista de direcciones de la API (`/api/hospedajes`, `/api/tipos`...) | `server.js` |
| `#ERRORES` | Mensajes claros cuando falla algo (ej. contraseña de PostgreSQL mala) | `server.js` |
| `#PUERTO` | En qué puerto se enciende el servidor (3000) | `server.js` |
| `#API_HOSPEDAJES` | Todas las rutas de hoteles | `src/routes/hospedajes.js` |
| `#API_USUARIOS` | Todas las rutas de usuarios y sesión | `src/routes/usuarios.js` |

## Inicio de sesión, cuentas y permisos

| Etiqueta | Qué es / para qué sirve | Dónde está |
|---|---|---|
| `#PAGINA_LOGIN` | Página de Iniciar sesión / Crear cuenta | `public/login.html` |
| `#INICIO_SESION` | Revisar usuario y contraseña, y guardar la sesión | `src/routes/usuarios.js`, `public/login.html`, `public/js/comun.js` |
| `#CREAR_CUENTA` | Crear una cuenta de cliente | `src/routes/usuarios.js`, `public/login.html` |
| `#CONTRASENA_CIFRADA` | Las contraseñas se guardan cifradas con bcrypt | `src/routes/usuarios.js` |
| `#SEGURIDAD_CONTRASENA` | Barra que dice si la contraseña es débil o segura | `public/login.html` |
| `#TOKEN` | El "pase" que recibe el usuario al iniciar sesión | `src/auth.js` |
| `#SESION_NAVEGADOR` | Cómo el navegador recuerda la sesión (localStorage) | `public/js/comun.js` |
| `#CERRAR_SESION` | Botón "Cerrar sesión" | `public/js/comun.js` |
| `#ROLES` | Qué puede hacer cada rol (admin, registrador, cliente) | `src/auth.js`, `src/routes/usuarios.js`, `public/login.html`, `public/admin.html` |
| `#PERMISOS` | Filtros que protegen las rutas y ocultan botones | `src/auth.js`, `public/js/comun.js` |
| `#MI_CUENTA` | Ver y cambiar mis datos | `src/routes/usuarios.js`, `public/cuenta.html` |
| `#CAMBIAR_CONTRASENA` | Cambiar mi contraseña | `src/routes/usuarios.js`, `public/cuenta.html` |
| `#ADMIN_USUARIOS` | El administrador crea usuarios y los activa o desactiva | `src/routes/usuarios.js`, `public/admin.html` |

## Hoteles

| Etiqueta | Qué es / para qué sirve | Dónde está |
|---|---|---|
| `#CATALOGO` | Lista pública de hoteles | `src/routes/hospedajes.js`, `public/hospedajes.html` |
| `#FILTROS` | Buscar por nombre, tipo, lugar, precio y servicios | `src/routes/hospedajes.js`, `public/hospedajes.html` |
| `#DETALLE` | Información completa de un hotel | `src/routes/hospedajes.js` |
| `#CREAR_HOSPEDAJE` | Registrar un hotel nuevo | `src/routes/hospedajes.js`, `public/registro.html` |
| `#EDITAR_HOSPEDAJE` | Modificar un hotel | `src/routes/hospedajes.js`, `public/registro.html` |
| `#ELIMINAR_HOSPEDAJE` | Borrar un hotel (pide confirmación) | `src/routes/hospedajes.js`, `public/js/comun.js`, `public/mis-registros.html` |
| `#VALIDACION` | Revisar que los datos estén bien antes de guardar | `src/routes/hospedajes.js` |
| `#DUPLICADOS` | Avisar si el hotel ya está registrado | `src/routes/hospedajes.js` |
| `#APROBAR_RECHAZAR` | El administrador aprueba o rechaza registros | `src/routes/hospedajes.js`, `public/mis-registros.html` |
| `#ACTIVAR_DESACTIVAR` | Ocultar un hotel del catálogo sin borrarlo | `src/routes/hospedajes.js`, `public/mis-registros.html` |
| `#MIS_REGISTROS` | Lista de registros para admin y registradores | `src/routes/hospedajes.js` |
| `#TIPOS_HOSPEDAJE` | Crear y editar los tipos (Hotel, Hostal...) | `src/routes/tipos.js`, `public/admin.html` |
| `#SERVICIOS` | Lista de servicios (wifi, parqueo, desayuno...) | `src/servicios.js` |
| `#FAVORITOS` | Guardar hoteles con el corazón ❤ | `src/routes/favoritos.js`, `public/js/comun.js`, `public/favoritos.html` |

## Google Maps y ubicación

| Etiqueta | Qué es / para qué sirve | Dónde está |
|---|---|---|
| `#COORDENADAS` | Latitud y longitud: cómo se guardan, se validan y se leen de Google Maps | `db/schema.sql`, `src/routes/hospedajes.js`, `public/registro.html` |
| `#GOOGLE_MAPS` | Enlace a la página del hotel en Google Maps (fotos, opiniones, horario) | `public/js/comun.js`, `public/hospedaje.html`, `public/registro.html`, `src/routes/hospedajes.js`, `db/schema.sql` |
| `#COMO_LLEGAR` | Botón que abre la ruta en Google Maps desde donde está la persona | `public/js/comun.js`, `public/hospedaje.html`, `public/js/mapa.js` |
| `#MAPA` | Mapa de Google Maps dentro del detalle del hotel (gratis, sin API) | `public/hospedaje.html` |
| `#MAPA_OSM` | Mapas de OpenStreetMap con Leaflet (gratis, los hace la comunidad): crear mapa, marcadores y su ventanita | `public/js/mapa.js` |
| `#MAPA_GENERAL` | Vista "Mapa" del catálogo: todos los hospedajes en el mapa con su directorio al lado | `public/hospedajes.html` |
| `#ADMIN_PRINCIPAL` | Administrador principal (José Diego): nadie le puede quitar el rol, desactivarlo ni borrarlo, ni desde la app ni desde la base | `db/schema.sql`, `scripts/migrate.js`, `scripts/init-db.js`, `src/routes/usuarios.js`, `public/admin.html` |
| `#SOLICITUD_ELIMINACION` | El registrador pide eliminar un hotel suyo y un administrador aprueba o rechaza | `db/schema.sql`, `src/routes/hospedajes.js`, `public/js/comun.js`, `public/mis-registros.html`, `public/hospedaje.html` |
| `#PERMISOS_LISTA` | Lista de permisos que se pueden dar o quitar, y los del registrador por defecto | `src/permisos.js` |
| `#PERMISOS_EFECTIVOS` | Cómo se calculan los permisos reales de una cuenta (rol + ajustes de la cuenta) | `src/permisos.js`, `src/routes/usuarios.js` |
| `#TABLA_ROLES` | Tabla `roles` con los permisos de cada rol | `db/schema.sql`, `scripts/migrate.js` |
| `#IDIOMA` | Traducción de las páginas públicas: lista `IDIOMAS` y un diccionario por idioma (las internas siguen en español) | `public/js/idioma.js`, `public/js/comun.js` |
| `#MENU_IDIOMA` | Menú desplegable de idioma con banderas en la barra de arriba | `public/js/idioma.js`, `public/css/estilos.css` |
| `#PROTEGER_BORRADO` | Candado en la base: solo la aplicación puede borrar hospedajes; los intentos de otros programas se anotan en `intentos_borrado` | `db/schema.sql`, `scripts/migrate.js`, `src/routes/hospedajes.js`, `scripts/ejemplos.js` |
| `#SEGURIDAD_SUPABASE` | Seguridad por filas (RLS) para bloquear la API pública de Supabase | `db/schema.sql`, `scripts/migrate.js` |
| `#SELECCIONAR_PUNTO` | En el registro, un clic en el mapa llena la latitud y la longitud (el marcador se puede arrastrar) | `public/registro.html` |

## Páginas (carpeta `public`)

| Etiqueta | Página |
|---|---|
| `#PAGINA_INICIO` | `index.html` — Inicio (tiene el resumen de cómo funciona todo) |
| `#PAGINA_CATALOGO` | `hospedajes.html` — Catálogo con filtros |
| `#PAGINA_DETALLE` | `hospedaje.html` — Detalle de un hotel |
| `#PAGINA_LOGIN` | `login.html` — Iniciar sesión y crear cuenta |
| `#PAGINA_REGISTRO` | `registro.html` — Registrar o editar un hotel |
| `#PAGINA_MIS_REGISTROS` | `mis-registros.html` — Tabla de registros |
| `#PAGINA_ADMIN` | `admin.html` — Panel del administrador |
| `#PAGINA_MI_CUENTA` | `cuenta.html` — Mi cuenta |
| `#PAGINA_FAVORITOS` | `favoritos.html` — Mis favoritos |
| `#MENU` | Menú de arriba, que cambia según el usuario (`js/comun.js`) |
| `#TARJETAS` | Tarjetas de hotel del catálogo (`js/comun.js`) |
| `#API_FETCH` | Función `api()` con la que las páginas piden datos al servidor (`js/comun.js`) |
| `#ESTILOS` | Colores y diseño propios (`css/estilos.css`) |

---

## Preguntas que podría hacer la profesora

| Pregunta | Busca |
|---|---|
| ¿Cómo se conectan a PostgreSQL? | `#CONEXION_POSTGRES` |
| ¿Dónde están las tablas? | `#TABLAS` |
| ¿Cómo funciona el inicio de sesión? | `#INICIO_SESION` y `#TOKEN` |
| ¿Cómo guardan las contraseñas? | `#CONTRASENA_CIFRADA` |
| ¿Cómo sabe qué puede hacer cada usuario? | `#ROLES` y `#PERMISOS` |
| ¿Cómo validan las coordenadas? | `#VALIDACION` y `#COORDENADAS` |
| ¿Cómo usan Google Maps sin pagar? | `#GOOGLE_MAPS`, `#COMO_LLEGAR` y `#MAPA` |
| ¿Cómo hicieron el mapa con todos los hoteles? | `#MAPA_OSM` y `#MAPA_GENERAL` (OpenStreetMap: gratis, sin clave de API) |
| ¿Cómo se marca el hotel en el mapa al registrarlo? | `#SELECCIONAR_PUNTO` |
| ¿Por qué nadie puede quitarle el rol a José Diego? | `#ADMIN_PRINCIPAL` |
| ¿Cómo funciona pedir que se elimine un hotel? | `#SOLICITUD_ELIMINACION` |
| ¿Cómo se dan o quitan permisos? ¿Dónde está la pestaña Roles? | `#ROLES`, `#PERMISOS` y `#PERMISOS_LISTA` (`public/admin.html`, `src/routes/usuarios.js`, `src/permisos.js`) |
| ¿Cómo funciona el botón de inglés? ¿Dónde agrego una traducción? | `#IDIOMA` (diccionario `TRADUCCIONES` en `public/js/idioma.js`) |
| ¿Por qué otro programa no puede borrar hospedajes? | `#PROTEGER_BORRADO` |
| ¿De dónde salen las fotos de los hoteles? | `#GOOGLE_MAPS`: no guardamos fotos, cada hotel enlaza a su página en Google Maps |
| ¿Cómo piden los datos las páginas? | `#API_FETCH` |
| ¿Cómo evitan hoteles repetidos? | `#DUPLICADOS` |
