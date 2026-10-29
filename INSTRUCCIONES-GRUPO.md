# Cómo instalar y abrir el proyecto (Grupo 4 - Hospedajes Antigua)

## 1. Instalar los programas (solo la primera vez)

1. **Node.js** — https://nodejs.org → descarga la versión **LTS** e instálala (siguiente, siguiente...).
2. **PostgreSQL** — https://www.postgresql.org/download/ → instálalo.
   - Durante la instalación te pide una **contraseña para el usuario `postgres`**. **Anótala**, la vas a necesitar.
   - Deja el puerto en **5432**.
3. **Visual Studio Code** — https://code.visualstudio.com

## 2. Abrir el proyecto

1. Descomprime la carpeta `proyecto programacion 2` (por ejemplo en el Escritorio).
2. Abre Visual Studio Code → **Archivo → Abrir carpeta** → elige `proyecto programacion 2`.
3. Abre la terminal: menú **Terminal → Nueva terminal**.

## 3. Instalar las librerías (solo la primera vez)

En la terminal escribe:

```
npm install
```

## 4. Poner tu contraseña de PostgreSQL (solo la primera vez)

1. En la carpeta del proyecto, haz una **copia** del archivo `.env.example` y llámala **`.env`**
   (o en la terminal escribe: `copy .env.example .env`).
2. Abre `.env` y en esta línea cambia `TU_PASSWORD` por **tu** contraseña de PostgreSQL:
   ```
   DATABASE_URL=postgres://postgres:TU_PASSWORD@localhost:5432/hoteles_antigua
   ```
3. Guarda el archivo (Ctrl + S).

## 5. Crear la base de datos (solo la primera vez)

```
npm run db:init
```

Debe decir: `Tablas creadas con 11 hospedajes de ejemplo.`

⚠️ Este comando **borra y vuelve a crear** las tablas. Úsalo solo la primera vez.

## 6. Encender el programa (cada vez que lo quieras usar)

```
npm start
```

Cuando diga `Servidor listo en http://localhost:3000`, abre esa dirección en el navegador.
Para apagarlo: **Ctrl + C** en la terminal.

## Usuarios para entrar

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | Administrador |
| `registrador1`, `registrador2`, `registrador3` | `registro123` | Registrador |
| `cliente1` | `cliente123` | Cliente |

## Si algo falla

| Error | Solución |
|---|---|
| `npm no se reconoce como un comando` | Cierra y vuelve a abrir Visual Studio Code después de instalar Node.js. |
| `la ejecución de scripts está deshabilitada en este sistema` | En la terminal, en la flechita junto al **+**, elige **Command Prompt** y vuelve a escribir el comando. |
| `La contraseña de PostgreSQL en el archivo .env es incorrecta` | Revisa la contraseña en `.env` (sin espacios). Si tiene símbolos como `@`, `#` o `/`, cámbialos así: `@` → `%40`, `#` → `%23`, `/` → `%2F`. |
| `No se pudo conectar a PostgreSQL` | PostgreSQL no está encendido: busca "Servicios" en Windows y enciende `postgresql`. |
| `Las tablas no existen` | Ejecuta `npm run db:init`. |
| `EADDRINUSE` (puerto 3000 ocupado) | Ya tienes el programa abierto en otra terminal: ciérrala o usa esa. |

## Importante

- Cada quien tiene **su propia base de datos** en su computadora: lo que registre uno **no** lo ve el otro.
- Para encontrar cualquier parte del código, lee `GUIA-DEL-CODIGO.md` y busca la etiqueta con **Ctrl + Shift + F**.
- **No compartas tu archivo `.env`**: tiene tu contraseña.
