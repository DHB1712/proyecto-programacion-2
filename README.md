# Hoteles y hospedajes de Antigua Guatemala — Grupo 4

Aplicación web para registrar, organizar y consultar los **hoteles y hospedajes** de Antigua Guatemala, con sus coordenadas (latitud y longitud) y enlace a Google Maps. Proyecto de Programación 2, categoría asignada al Grupo 4.

**Tecnologías:** HTML, CSS, JavaScript, Bootstrap 5, Node.js + Express, PostgreSQL y Google Maps (enlaces y mapa incrustado gratuito, sin API de pago).

📌 **Para encontrar rápido cualquier parte del código, lee [GUIA-DEL-CODIGO.md](GUIA-DEL-CODIGO.md)**: cada parte tiene una etiqueta (ej. `#INICIO_SESION`) que se busca en Visual Studio Code con **Ctrl + Shift + F**.

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- [PostgreSQL](https://www.postgresql.org/) (local o en Render)

## Instalación

1. Instalar dependencias:
   ```
   npm install
   ```
2. Copiar `.env.example` como `.env` y poner la contraseña de tu usuario `postgres` en `DATABASE_URL`.
3. Crear la base de datos `hoteles_antigua`, las tablas y los datos iniciales (**borra y vuelve a crear las tablas**, úsalo solo la primera vez):
   ```
   npm run db:init
   ```
4. Iniciar el servidor:
   ```
   npm start
   ```
5. Abrir <http://localhost:3000>

**Si ya tenías la base creada de una versión anterior**, no uses `db:init` (borra todo). Actualízala sin perder datos con:
```
npm run db:migrate
npm run db:ejemplos
```

## Usuarios de prueba

| Usuario | Contraseña | Perfil |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `registrador1`, `registrador2`, `registrador3` | `registro123` | Registrador (integrantes del grupo) |
| `cliente1` | `cliente123` | Cliente (solo en instalaciones nuevas con `db:init`) |

Cambien estas contraseñas antes de publicar la aplicación: cada quien puede cambiar la suya en **Mi cuenta**, y desde Administración → Usuarios se crean los usuarios reales de cada integrante y se desactivan los de prueba.

## Inicio de sesión y cuentas

- La página `login.html` tiene dos pestañas: **Iniciar sesión** y **Crear cuenta**.
- Administrador, registradores y clientes entran por el mismo formulario, con su usuario **o** su correo.
- Cualquier persona puede **crear su cuenta de cliente** (nombre, usuario, correo opcional y contraseña de al menos 6 caracteres).
- Las cuentas de registrador y de administrador solo las crea el administrador, o cambia el rol de una cuenta existente en Administración → Usuarios. Los cambios de rol y las desactivaciones se aplican de inmediato.

## Datos de cada hospedaje

Código (`HOT-0001`), nombre, tipo de hospedaje, descripción, departamento, municipio, dirección o referencia, latitud y longitud, enlace a Google Maps, precio por noche desde (Q), servicios (wifi, parqueo, desayuno, piscina, etc.), teléfono, correo, sitio web, redes sociales, fotografía (con autorización) y estado activo/inactivo.

Tipos de hospedaje iniciales: Hotel, Hotel boutique, Hostal, Posada, Casa de huéspedes y Apartamento turístico. El administrador puede agregar o desactivar tipos.

## Perfiles y permisos

- **Usuario de consulta** (sin cuenta): busca hospedajes, ve el detalle, los abre en Google Maps y ve cómo llegar.
- **Cliente** (crea su propia cuenta): todo lo anterior, más guardar hospedajes en **Mis favoritos** y administrar **Mi cuenta**. No puede crear, editar ni eliminar hospedajes.
- **Registrador** (integrante del grupo): crea registros y puede editar **los suyos** mientras estén *pendientes* o *rechazados*; al corregir un rechazado vuelve a *pendiente*.
- **Administrador**: aprueba o rechaza registros (con observación), edita cualquier registro, activa/desactiva registros y administra tipos de hospedaje y usuarios. Lo que él registra queda aprobado directamente.

Solo los registros **aprobados y activos** aparecen en el catálogo público.

## Pantallas

| Página | Archivo |
|---|---|
| Página principal | `public/index.html` |
| Consulta general (nombre, tipo, departamento, municipio, servicios y precio máximo) | `public/hospedajes.html` |
| Detalle del hospedaje (mapa, coordenadas, servicios, enlace a Google Maps) | `public/hospedaje.html` |
| Iniciar sesión / Crear cuenta | `public/login.html` |
| Mi cuenta (datos y contraseña) | `public/cuenta.html` |
| Mis favoritos | `public/favoritos.html` |
| Formulario de registro / edición | `public/registro.html` |
| Mis registros / Todos los registros (revisión) | `public/mis-registros.html` |
| Administración (resumen, tipos de hospedaje, usuarios) | `public/admin.html` |

## Cómo registrar un hospedaje

1. Buscar el hotel en Google Maps y confirmar que es el correcto.
2. Hacer clic derecho sobre el punto exacto: aparecen las coordenadas (ej. `14.5594, -90.7290`); al hacer clic en ellas se copian.
3. En el formulario, pegarlas en **"Pega aquí el enlace de Google Maps o las coordenadas"** y presionar **Usar** (también acepta el enlace completo de Google Maps).
4. Revisar la vista previa del mapa y completar los demás datos.
5. Guardar y comprobar con el botón **Abrir en Google Maps** del detalle.

El sistema valida que la latitud esté entre -90 y 90 y la longitud entre -180 y 180, y avisa si ya existe un hospedaje con el mismo nombre o casi la misma ubicación.

## Hospedajes de ejemplo

La aplicación trae 11 hoteles reales de Antigua Guatemala como ejemplo, definidos en `db/ejemplos.js`, con precio y servicios.

- **No guardamos fotos.** Cada hotel tiene el botón **"Ver en Google Maps"**, que abre su página real en Google Maps con fotos, opiniones, horario y teléfono.
- Si al registrar un hotel se pega su enlace de Google Maps (botón "Compartir"), se guarda en el campo `enlace_maps`. Si se deja vacío, la página busca el hotel en Google Maps por su nombre.
- Se cargan con `npm run db:init` (instalación nueva) o con `npm run db:ejemplos` (base existente, **sin borrar** nada; se puede ejecutar varias veces).
- Tienen la marca **es_ejemplo**: la tarjeta muestra la etiqueta "Ejemplo" y el detalle avisa que la ubicación es aproximada y que el precio y los servicios no están verificados.
- Cuando el grupo confirme los datos de un hotel en Google Maps, debe editarlo, poner la información real y **desmarcar "Datos de ejemplo"**.

## API

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/hospedajes?q=&tipo=&departamento=&municipio=&servicios=wifi,parqueo&precio_max=&orden=precio` | Público |
| GET | `/api/hospedajes/filtros` | Público |
| GET | `/api/hospedajes/:id` | Público (aprobados) |
| GET | `/api/hospedajes/gestion` | Registrador (los suyos) / Admin (todos) |
| POST | `/api/hospedajes` | Registrador / Admin |
| PUT | `/api/hospedajes/:id` | Registrador (los suyos, pendiente/rechazado) / Admin |
| PATCH | `/api/hospedajes/:id/revision` | Admin |
| PATCH | `/api/hospedajes/:id/estado` | Admin |
| GET/POST/PUT | `/api/tipos` | GET público, el resto Admin |
| GET | `/api/servicios` | Público |
| DELETE | `/api/hospedajes/:id` | Registrador (los suyos, sin aprobar) / Admin |
| POST | `/api/auth/login` | Público (usuario o correo) |
| POST | `/api/auth/registro` | Público (crea cuenta de cliente) |
| GET/PUT | `/api/auth/yo` | Con sesión (ver y editar mis datos) |
| PUT | `/api/auth/password` | Con sesión |
| GET | `/api/favoritos`, `/api/favoritos/ids` | Con sesión |
| POST/DELETE | `/api/favoritos/:id` | Con sesión |
| GET/POST/PATCH | `/api/usuarios` | Admin (crear, activar/desactivar, cambiar rol) |

## Despliegue en Render

1. Subir el proyecto a GitHub (el archivo `.env` no se sube).
2. En Render crear una base de datos **PostgreSQL** y copiar su *External Database URL*.
3. Crear un **Web Service** desde el repositorio: Build command `npm install`, Start command `npm start`.
4. Variables de entorno: `DATABASE_URL` (la URL interna de la base), `DB_SSL=true`, `JWT_SECRET` (un texto largo y secreto).
5. Desde tu computadora, inicializar la base una sola vez con la URL externa (en PowerShell):
   ```
   $env:DATABASE_URL="<url externa>"; $env:DB_SSL="true"; npm run db:init
   ```

## Estructura

```
├── server.js                 Servidor Express
├── db/schema.sql             Tablas: tipos_hospedaje, usuarios, hospedajes
├── scripts/init-db.js        Crea la base, tablas y datos iniciales
├── src/
│   ├── db.js                 Conexión a PostgreSQL
│   ├── auth.js               Tokens y permisos
│   ├── servicios.js          Lista de servicios (wifi, parqueo, ...)
│   └── routes/               hospedajes, tipos, usuarios
└── public/                   Frontend (HTML, CSS, JS con Bootstrap)
```
