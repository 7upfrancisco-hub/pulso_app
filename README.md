# PULSO

Identidad de salud para eventos deportivos. Cada participante declara su
propia información de salud y obtiene un **Código PULSO** (ej. `PU-8F42K`)
y un **QR** que un rescatista puede escanear para verla en una emergencia.

**PULSO no es una ficha médica, no es una historia clínica y no certifica
información médica.** Toda la información mostrada es declarada por el
propio participante.

El QR nunca contiene datos médicos: codifica únicamente una URL de
resolución (`/r/{UUID}`). Los datos se consultan al backend en el momento,
así que actualizar el perfil no requiere reimprimir el QR.

## Estado actual — MVP funcional de punta a punta

- Registro de participante con declaración jurada obligatoria.
- Generación automática de UUID (identificador interno) y Código PULSO
  (identificador público, no secuencial).
- Generación de QR (solo token, sin datos de salud).
- Búsqueda de participante por QR, DNI o Código PULSO (rol RESCATISTA).
- Vista de rescate: solo la información de salud declarada, sin datos
  innecesarios (nunca se muestra el DNI).
- Registro de auditoría de cada acceso (`access_logs`): quién fue
  consultado, por qué vía, cuándo. Sin sistema de permisos todavía, pero
  la estructura está lista para roles reales.
- Dashboard de ADMIN de prueba: métricas y tabla con búsqueda.
- Datos ficticios de prueba (seed).

Pendiente para la próxima etapa: autenticación/roles reales, eventos,
organizaciones, edición de perfil desde la propia vista del participante,
pagos, NFC, app móvil, API pública.

## Stack

- Node.js + Express
- Postgres vía [Supabase](https://supabase.com) (`@supabase/supabase-js` en
  runtime; `pg` solo para correr migraciones)
- `qrcode` para generar el QR (imagen PNG en base64, sin dependencias
  nativas)
- HTML / CSS / JavaScript puro (sin frameworks de frontend)
- Deploy: Vercel (función serverless que envuelve la app de Express)

## Estructura del proyecto

```
EmergencyPass/
├── app.js                        # Entry point local: arranque del server (npm start / npm run dev)
├── api/index.js                  # Entry point en Vercel: exporta la misma app de Express
├── vercel.json                   # Config de deploy (rewrites + archivos estáticos incluidos)
├── package.json
├── .env.example
├── public/                       # Frontend estático
│   ├── index.html                # Hub de navegación (Participante / Rescatista / Admin)
│   ├── css/pulso.css             # Identidad visual PULSO (rojo/negro/blanco, mobile-first)
│   ├── js/
│   │   ├── api.js                # Helper de fetch compartido
│   │   ├── registro.js           # Alta de participante + declaración jurada
│   │   ├── perfil.js             # Vista propia (nombre, Código PULSO, QR, estado)
│   │   ├── rescueView.js         # Render compartido de la vista de rescate
│   │   ├── rescate.js            # Resolución de /r/:id (QR)
│   │   ├── rescatista.js         # Búsqueda: cámara (BarcodeDetector) + DNI/Código
│   │   └── admin.js              # Dashboard: métricas + tabla + búsqueda
│   └── pages/                    # HTML servido en las URLs "lindas" (ver views.routes.js)
│       ├── registro.html
│       ├── perfil.html
│       ├── rescatista.html
│       ├── rescate.html
│       └── admin.html
└── src/
    ├── app.js                    # Configuración de Express (middlewares, rutas, errores)
    ├── config/
    │   ├── env.js                 # Variables de entorno
    │   └── declaration.js         # Texto + versión de la declaración jurada (fuente única)
    ├── db/
    │   ├── connection.js            # Cliente Supabase (service role key)
    │   ├── migrate.js               # Corredor de migraciones standalone (npm run migrate, usa DATABASE_URL)
    │   ├── seed.js                 # Datos ficticios de prueba (npm run seed)
    │   └── migrations/
    │       ├── 0001_create_participants.sql
    │       ├── 0002_participants_pulso.sql   # DNI único, nombre/apellido, edad, grupo/Rh, Código PULSO, declaración
    │       └── 0003_access_logs.sql          # Auditoría de accesos
    ├── utils/
    │   ├── pulsoCode.js            # Generador del Código PULSO (no secuencial)
    │   └── qr.js                   # Generación del QR (solo token, vía qrcode)
    ├── controllers/
    │   ├── participant.controller.js   # CRUD + búsqueda de rescate + QR
    │   ├── admin.controller.js         # Métricas y tabla del dashboard
    │   ├── declaration.controller.js   # Texto vigente de la declaración jurada
    │   └── health.controller.js
    ├── models/
    │   ├── participant.model.js        # Toda la SQL de participants
    │   └── accessLog.model.js          # Toda la SQL de access_logs
    ├── routes/
    │   ├── participant.routes.js       # /api/participants
    │   ├── admin.routes.js             # /api/admin
    │   ├── declaration.routes.js       # /api/declaration
    │   ├── health.routes.js            # /health
    │   └── views.routes.js             # URLs lindas → HTML estático
    └── middlewares/                    # (vacío por ahora)
```

## API

| Método | Ruta                                          | Rol         | Descripción |
|--------|------------------------------------------------|-------------|-------------|
| GET    | `/health`                                       | —           | Estado del server y la DB |
| GET    | `/api/declaration`                              | Participante| Texto y versión vigente de la declaración jurada |
| POST   | `/api/participants`                             | Participante| Alta (requiere `declaration_accepted: true`); 409 si el DNI ya existe |
| GET    | `/api/participants`                             | Admin       | Listado completo |
| GET    | `/api/participants/:id`                         | Participante/Admin | Perfil completo por UUID |
| PUT    | `/api/participants/:id`                         | Participante| Actualización parcial |
| DELETE | `/api/participants/:id`                         | Admin       | Baja |
| GET    | `/api/participants/:id/qr`                      | Participante| QR (data URL) que codifica `/r/:id` |
| GET    | `/api/participants/rescue?token=`               | Rescatista  | Búsqueda por QR — registra acceso tipo `QR` |
| GET    | `/api/participants/rescue?dni=`                 | Rescatista  | Búsqueda por DNI — registra acceso tipo `DNI` |
| GET    | `/api/participants/rescue?pulso_code=`          | Rescatista  | Búsqueda por Código PULSO — registra acceso tipo `CODIGO_PULSO` |
| GET    | `/api/admin/stats`                              | Admin       | Totales, recientes, con alergias/medicación/enfermedades declaradas |
| GET    | `/api/admin/participants?search=`               | Admin       | Tabla: nombre, DNI, Código PULSO, grupo, última actualización |

`GET /api/participants/rescue` devuelve solo lo necesario para una
emergencia (nombre, grupo+Rh, alergias, antecedentes, medicación, contacto
de emergencia, última actualización) — nunca el DNI.

## Páginas

| URL                | Rol          | Contenido |
|---------------------|--------------|-----------|
| `/`                 | —            | Hub de navegación |
| `/registro`         | Participante | Alta + declaración jurada |
| `/perfil/:id`       | Participante | Nombre, Código PULSO, QR, estado |
| `/rescatista`       | Rescatista   | Escanear QR o buscar por DNI/Código PULSO |
| `/r/:id`            | Rescatista   | Resolución directa del QR (misma pantalla de rescate) |
| `/admin`            | Admin        | Métricas + tabla + búsqueda |

## Instalación

```bash
npm install
cp .env.example .env
```

Completar en `.env` los tres valores que vienen de un proyecto de Supabase
(gratis, se crea en [supabase.com](https://supabase.com)): `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY` y `DATABASE_URL` (ver tabla de variables más abajo).

## Uso

```bash
npm run migrate    # aplica las migraciones contra Supabase (una sola vez, o cuando hay migraciones nuevas)
npm start           # producción
npm run dev          # desarrollo, con reinicio automático (node --watch)
npm run seed          # crea participantes ficticios de prueba (idempotente)
```

El servidor arranca en `http://localhost:3000` (configurable via `PORT` en
`.env`). A diferencia de la etapa anterior, las migraciones ya no corren
solas al arrancar: se corren a mano con `npm run migrate` (evita que
Vercel intente correrlas en cada cold start).

## Cómo probar cada flujo

1. `npm install && cp .env.example .env` → completar `.env` → `npm run migrate && npm run seed && npm start`
2. Abrir `http://localhost:3000` → **Participante** → completar el
   formulario → tildar la declaración jurada → enviar. Redirige a
   `/perfil/:id` con el Código PULSO y el QR generados.
3. Intentar registrar de nuevo el mismo DNI → debe rechazar con 409.
4. Desde `/rescatista`, buscar por el DNI o el Código PULSO de alguno de
   los participantes sembrados (ver `src/db/seed.js`, ej. DNI `38456123` /
   Código `PU-...`) → debe mostrar la vista de rescate (sin el DNI).
5. Abrir en el navegador la URL del QR (la que devuelve
   `GET /api/participants/:id/qr`, con forma `/r/:id`) → misma vista de
   rescate, acceso auditado como `QR`.
6. Abrir `/admin` → ver métricas y tabla; probar el buscador.

## Variables de entorno

| Variable               | Descripción                                                              | Default                    |
|------------------------|----------------------------------------------------------------------------|-----------------------------|
| `PORT`                 | Puerto HTTP del servidor                                                  | `3000`                      |
| `NODE_ENV`             | Entorno de ejecución                                                      | `development`               |
| `SUPABASE_URL`         | URL del proyecto Supabase (Project Settings → API)                       | —                            |
| `SUPABASE_SERVICE_KEY` | Service role key (Project Settings → API). Solo server-side, nunca en el frontend | —                    |
| `DATABASE_URL`         | Connection string Postgres directa, usada solo por `npm run migrate` (Project Settings → Database → Connection pooler) | — |
| `PUBLIC_BASE_URL`      | Base usada para armar la URL que codifica el QR                          | `http://localhost:<PORT>`   |

## Deploy (Vercel + Supabase)

1. **Supabase**: crear un proyecto en [supabase.com](https://supabase.com)
   (plan gratis alcanza). Copiar de *Project Settings → API* la `URL` y la
   `service_role key`, y de *Project Settings → Database → Connection
   string* (modo *Transaction pooler*, puerto `6543`) la connection string.
2. Correr `npm run migrate` localmente una vez, apuntando `.env` a ese
   proyecto, para crear las tablas.
3. **GitHub**: este repo tiene que existir en GitHub para que Vercel lo
   importe (`git init`, commit, `git remote add origin ...`, `git push`).
4. **Vercel**: *Add New → Project* → importar el repo. Como no es un
   framework conocido, Vercel usa `vercel.json` tal cual está en el repo
   (función serverless en `api/index.js` + rewrites). No hace falta tocar
   el build command.
5. En el proyecto de Vercel, cargar las variables de entorno
   (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `PUBLIC_BASE_URL` con el
   dominio que asigne Vercel; `DATABASE_URL` no hace falta en Vercel, solo
   se usa localmente para migrar) y hacer deploy.

`node:sqlite` y el archivo `data/*.sqlite` de la etapa anterior quedaron
reemplazados por Supabase; ya no hace falta persistir un archivo en disco.

## Decisiones de esta etapa

- **DNI**: se renombró la columna `document_id` a `dni` (mismo dato, nuevo
  nombre) y se agregó un índice único parcial. Se normaliza a solo dígitos
  antes de guardar y de buscar, para que puntos o espacios no rompan la
  unicidad ni la búsqueda.
- **Campos heredados** (`birth_date`, `gender`, `phone`,
  `health_insurance_*`, `event_name`, `bib_number`, `notes`) de la etapa
  anterior se mantienen en la tabla y siguen siendo editables por API, pero
  el nuevo formulario no los usa.
- **QR**: codifica `PUBLIC_BASE_URL + /r/{UUID}`. El UUID ya es el
  identificador interno (aleatorio, no adivinable), así que no se agregó un
  token separado; si más adelante se necesita poder revocar/rotar el QR sin
  tocar el `id` interno, ese es el próximo paso natural.
- **Campos obligatorios en el alta**: nombre, apellido, DNI, edad y
  contacto de emergencia. Grupo sanguíneo, Rh, alergias, antecedentes y
  medicación quedan opcionales — "no declarado" también es información
  válida en este modelo.
- **Roles**: no hay autenticación todavía. Las tres pantallas (Participante,
  Rescatista, Admin) son de acceso libre para poder probar el flujo
  completo; `access_logs` ya deja la auditoría preparada para cuando se
  agregue login real.
- **Base de datos**: se migró de SQLite (`node:sqlite`, archivo local) a
  Postgres vía Supabase, porque Vercel es serverless y no tiene filesystem
  persistente para un archivo `.sqlite`. Los modelos pasaron de sync a
  async (`@supabase/supabase-js`, que habla PostgREST por HTTP — evita
  agotar conexiones Postgres entre cold starts). Las migraciones dejaron
  de correr en el boot de la app y ahora son un script aparte
  (`npm run migrate`, vía `pg` con `DATABASE_URL`) para no reintentar DDL
  en cada cold start.
