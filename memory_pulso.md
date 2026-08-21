# Memoria del proyecto PULSO

Este documento resume todo lo que se definió y se construyó hasta ahora,
explicado en lenguaje simple para que sirva de referencia sin tener que
releer toda la conversación.

---

## 1. Qué es PULSO

PULSO es una plataforma de **identidad de salud para eventos deportivos**.
Cada participante de un evento se registra, declara sus propios datos de
salud, y recibe un **Código PULSO** (corto, tipo `PU-8F42K`) y un **código
QR**. Si el participante sufre una emergencia, un rescatista puede escanear
el QR (o buscar por DNI o Código PULSO) y ver al instante la información
que el participante declaró: grupo sanguíneo, alergias, medicación,
enfermedades y contacto de emergencia.

**Reglas de identidad del producto (importantes, no son solo detalle
técnico):**

- PULSO **no es** una ficha médica.
- PULSO **no es** una historia clínica.
- PULSO **no certifica** información médica.
- Toda la información de salud la carga el propio participante, bajo su
  responsabilidad (por eso existe la declaración jurada).

**Vocabulario que hay que usar / evitar** (esto lo pidió el usuario
explícitamente, así que se aplicó en toda la interfaz):

| Usar | No usar |
|------|---------|
| Identidad PULSO | Credencial médica |
| Perfil de salud | Ficha médica |
| Información de salud declarada | Historia clínica |
| Código PULSO | Dorsal |
| Participante | — |

**Identidad visual:** rojo (color de acción/emergencia), negro, blanco.
Diseño limpio, tipografía fuerte, alto contraste, pensado primero para
celular (mobile-first), porque las pantallas de emergencia se usan en un
teléfono, muchas veces bajo presión.

**Roles del sistema:** PARTICIPANTE, RESCATISTA, ADMIN. Por ahora **no hay
login ni contraseñas** — las tres pantallas son de acceso libre para poder
probar el flujo completo. Eso es intencional para este MVP, no un olvido:
la autenticación real queda para una etapa futura.

---

## 2. Cómo se llegó hasta acá (historia del proyecto)

El proyecto arrancó como "Emergency Pass", un sistema más genérico para
"eventos deportivos" en general, y después el usuario pivotó la marca y el
enfoque hacia **PULSO**, con reglas de negocio más específicas (declaración
jurada, Código PULSO, roles, etc.). El desarrollo se hizo en etapas, cada
una aprobada antes de seguir:

1. **Etapa 1 — Estructura base:** se creó el esqueleto del proyecto
   (Node.js + Express + SQLite), sin funcionalidades todavía.
2. **Etapa 2 — API de participantes genérica:** CRUD básico de
   participantes (crear, leer, actualizar, borrar), pensado para un evento
   deportivo cualquiera, sin el modelo PULSO todavía.
3. **Etapa 3 — Pivot a PULSO, MVP completo de punta a punta:** se reusó
   toda la base de las etapas anteriores (nada se reescribió de cero) y se
   agregó todo lo específico de PULSO: Código PULSO, declaración jurada,
   QR, búsqueda por DNI/código/QR, vista de rescate, dashboard de admin, y
   datos de prueba.
4. **Etapa 4 — Deploy en Vercel:** para poder publicar el proyecto en
   internet hubo que migrar la base de datos de SQLite (un archivo local) a
   **Supabase** (Postgres en la nube), porque Vercel no tiene disco
   persistente. Deploy terminado y confirmado en producción. Ver sección 16.
5. **Etapa 5 (la actual) — Login real por rol:** hasta acá cualquiera podía
   entrar a cualquier pantalla eligiendo un rol libremente. Se agregó login
   de verdad (DNI + contraseña) con tres roles reales (participante,
   rescatista, admin) que determinan a qué pantalla se entra, manteniendo
   sin login el link del QR (para que cualquiera que encuentre al
   participante pueda verlo en una emergencia). Ver sección 17 para el
   detalle.

---

## 3. Tecnología usada

- **Node.js + Express**: el servidor y las rutas de la API.
- **Postgres, a través de Supabase** (desde la Etapa 4). Antes era SQLite
  vía el módulo `node:sqlite`; se migró porque Vercel (donde se despliega
  el proyecto) es "serverless" y no tiene disco persistente para guardar un
  archivo `.sqlite`. El backend le habla a Supabase con la librería
  `@supabase/supabase-js` (HTTP, no una conexión de base de datos
  tradicional — más apto para funciones serverless que se prenden y
  apagan todo el tiempo).
- **`qrcode`** (librería chica, sin compilación) para generar la imagen del
  QR.
- **HTML + CSS + JavaScript puro** en el frontend. Sin React, Vue, Angular,
  Bootstrap ni TypeScript — tal como pidió el usuario desde el inicio.
- **Vercel** para publicar el proyecto en internet, conectado a GitHub: cada
  vez que se sube un cambio a la rama principal, Vercel lo redespliega
  solo.

No se usa ningún framework de frontend ni build tool: las páginas son
archivos `.html` con `<script>` normales, y el JS del navegador llama a la
API con `fetch`.

---

## 4. Cómo está organizado el proyecto (mapa mental)

Pensalo en 3 capas, cada una con una responsabilidad clara:

```
routes/       →  "qué URL existe y a quién le paso el pedido"
controllers/  →  "qué hago con el pedido: valido, decido, respondo"
models/       →  "cómo hablo con la base de datos" (acá vive todo el SQL)
```

Y aparte:

- `public/` → todo lo que el navegador descarga directo: HTML, CSS, JS del
  cliente. Estas son las pantallas que ve la gente.
- `src/db/migrations/` → cada cambio a la estructura de la base de datos
  queda guardado como un archivo numerado (`0001_...`, `0002_...`, etc.).
  Desde la Etapa 4 estos archivos **ya no se aplican solos al arrancar el
  servidor** (antes sí): ahora se corren a mano con `npm run migrate`
  (o pegando el SQL directo en el editor de Supabase). Se cambió así para
  que Vercel no intente aplicar cambios a la base cada vez que arranca una
  función, que podría pasar muchas veces por minuto.
- `api/index.js` y `vercel.json` (raíz del proyecto) → son la parte que
  entiende Vercel. `api/index.js` simplemente reexporta la misma app de
  Express (`src/app.js`), y `vercel.json` le dice a Vercel que todas las
  URLs vayan a esa función y que incluya la carpeta `public/` en el
  paquete que se sube.
- `src/db/seed.js` → un script que llena la base con participantes de
  prueba, para no tener que cargarlos a mano cada vez.
- `src/config/` → un solo lugar para las variables de configuración (puerto,
  ruta de la base de datos, etc.) y para el texto de la declaración jurada
  (para que el mismo texto se use en el formulario y en el backend, sin
  duplicarlo en dos lugares distintos).
- `src/utils/` → funciones chicas reutilizables: generar el Código PULSO,
  generar el QR.

---

## 5. Qué hace cada pantalla (lo que ve la gente)

| Pantalla (URL) | Para quién | Qué hace |
|---|---|---|
| `/` | Todos | Portada con 3 accesos: Participante, Rescatista, Admin |
| `/registro` | Participante | Formulario de alta + casilla de declaración jurada obligatoria |
| `/perfil/:id` | Participante | Ve su nombre, su Código PULSO, su QR y el estado de su perfil |
| `/rescatista` | Rescatista | Buscar a alguien escaneando un QR con la cámara, o escribiendo su DNI o Código PULSO |
| `/r/:id` | Rescatista | Es la pantalla a la que apunta el QR. La abre automáticamente el celular al escanear |
| `/admin` | Admin | Totales, métricas (cuántos declararon alergias, medicación, etc.) y una tabla buscable de todos los participantes |

---

## 6. Datos del participante: qué se pide y qué es obligatorio

**Obligatorio para registrarse:** Nombre, Apellido, DNI, Edad, nombre y
teléfono del contacto de emergencia, y haber aceptado la declaración
jurada.

**Opcional** (se puede dejar en blanco, porque "no declarado" también es
información válida): Grupo sanguíneo, Factor Rh, Alergias, Enfermedades o
antecedentes, Medicación.

**Generado automáticamente por el sistema (el participante no lo elige):**
- **UUID**: un identificador interno único y aleatorio. Es lo que usa la
  base de datos por dentro. El DNI nunca se usa como identificador técnico.
- **Código PULSO**: el identificador público y corto (`PU-XXXXX`), pensado
  para que un humano lo pueda leer, decir en voz alta o escribir a mano.
  No es un número correlativo (1, 2, 3...); se genera al azar para que no
  se pueda adivinar el de otra persona.

**El DNI es único**: no se puede registrar dos veces el mismo DNI. Si se
intenta, el sistema avisa con un error claro en vez de crear un duplicado.
Además, el DNI se guarda "limpio" (solo números, sin puntos ni espacios)
para que "38.456.123" y "38456123" se traten como el mismo dato.

---

## 7. La declaración jurada

Antes de poder registrarse, el participante tiene que tildar una casilla
obligatoria con este texto:

> "Declaro que la información proporcionada es verdadera, completa y
> actualizada según mi conocimiento. Entiendo que PULSO almacena y pone a
> disposición la información que yo mismo declaro y que PULSO no
> constituye una ficha médica, historia clínica ni certificación médica."

Si no se tilda, el registro no se puede completar (el sistema lo rechaza).
Cuando se acepta, queda guardado en la base de datos: que se aceptó, qué
versión del texto se aceptó, y la fecha y hora exacta. Esto es importante
porque si en el futuro cambia el texto de la declaración, se puede saber
qué versión aceptó cada persona.

---

## 8. El QR: qué contiene y por qué

Esto era un requisito clave desde el principio: **el QR nunca contiene
datos médicos, ni el DNI, ni el nombre**. El QR solo contiene una
dirección web (`/r/` + el UUID del participante). Cuando alguien escanea
ese QR, el celular abre esa dirección, y recién ahí la página le pide los
datos al servidor.

¿Por qué se hizo así? Dos razones:
1. **Privacidad**: si alguien mira el QR sin escanearlo, no ve nada
   sensible, porque no hay nada sensible codificado adentro.
2. **Los datos se pueden actualizar sin reimprimir el QR**: como el QR solo
   apunta a un ID, y los datos reales viven en la base, el participante
   puede actualizar su alergia o su medicación cuando quiera, y el mismo QR
   de siempre va a mostrar la información nueva.

---

## 9. Qué ve un rescatista (y qué NO ve)

Cuando un rescatista encuentra a un participante (por QR, DNI o Código
PULSO), la pantalla muestra **solo lo necesario para actuar rápido**:

- Nombre y apellido
- Grupo sanguíneo + factor Rh
- Alergias
- Enfermedades o antecedentes declarados
- Medicación declarada
- Contacto de emergencia (nombre y teléfono)
- Un aviso fijo: "Información declarada por el participante"
- Cuándo fue la última actualización del perfil

**A propósito, el rescatista NO ve el DNI** ni ningún otro dato que no sea
estrictamente necesario en una emergencia. Esto fue una decisión de diseño
explícita, no un olvido.

---

## 10. Registro de accesos (auditoría)

Cada vez que un rescatista consulta a un participante, el sistema guarda
un registro: a quién consultó, por qué medio lo encontró (QR, DNI o Código
PULSO) y en qué momento. Esto no se usa todavía para nada visible (no hay
una pantalla que muestre este historial), pero la estructura ya está lista
para el día que se necesite auditar accesos o dar permisos por rol.

---

## 11. El panel de Admin

Pantalla de prueba (sin login todavía) que muestra:

- Total de participantes
- Cuántos se registraron en los últimos 7 días
- Cuántos declararon alergias / medicación / enfermedades
- Una tabla con: Nombre, DNI, Código PULSO, Grupo sanguíneo, Última
  actualización
- Un buscador que filtra la tabla por nombre, DNI o Código PULSO

---

## 12. Datos de prueba (seed)

Hay un comando (`npm run seed`) que carga participantes ficticios para
poder probar el sistema sin cargar datos a mano. Si se corre más de una
vez, no duplica nada (si el DNI ya existe, lo salta). Los participantes de
prueba son:

1. **Marina Sosa Ibáñez** — DNI 38.456.123, 29 años, grupo O+, alérgica a
   la penicilina.
2. **Lucas Fernández** — DNI 40.222.789, 34 años, grupo A+, alérgico al
   maní, asmático, usa Salbutamol.
3. **Valentina Torres** — DNI 41.789.456, 22 años, grupo B-, sin alergias
   ni medicación declaradas.
4. **Sofía Gómez** — DNI 42.345.678, 19 años, sin ningún dato de salud
   cargado. Se agregó a propósito para poder ver cómo se ve la pantalla
   cuando alguien no declaró nada (por ejemplo, debe decir "Sin alergias
   declaradas" en vez de dejar el espacio vacío o mostrar un error).

---

## 13. Cómo correr el proyecto

```bash
npm install              # instala las dependencias
cp .env.example .env      # crea el archivo de configuración local
# completar en .env: SUPABASE_URL y SUPABASE_SERVICE_KEY (ver sección 16)
npm run migrate            # crea las tablas en Supabase (una sola vez)
npm run seed                # carga los participantes de prueba
npm start                    # levanta el servidor
```

Después abrís `http://localhost:3000` en el navegador. Desde ahí hay
enlaces a las tres pantallas (Participante, Rescatista, Admin).

Para desarrollar con reinicio automático al guardar cambios: `npm run dev`.

---

## 14. Decisiones técnicas que vale la pena recordar

- **Por qué se usó `node:sqlite` al principio (Etapas 1-3)**: para evitar
  depender de herramientas de compilación que esta máquina no tiene
  instaladas. Funcionó bien mientras el proyecto corría solo en esta
  máquina.
- **Por qué se migró a Supabase en la Etapa 4**: al querer publicar el
  proyecto en Vercel, apareció el límite real de SQLite: Vercel no tiene
  disco persistente (cada vez que se "despierta" una función arranca de
  cero), así que un archivo `.sqlite` local no sirve para producción.
  Supabase da una base Postgres real, accesible por internet, sin tener
  que administrar un servidor de base de datos aparte.
- **Por qué el QR usa el mismo UUID interno y no un "token" aparte**: el
  UUID ya es aleatorio y no se puede adivinar, así que agregar un token
  extra hubiera sido complejidad de más para este MVP. Si más adelante se
  necesita poder "invalidar" un QR sin tocar el resto del perfil (por
  ejemplo, si alguien pierde el celular con el QR guardado), ahí sí
  convendría separar un token del ID interno — pero eso queda para el
  futuro.
- **Por qué el escaneo de QR con la cámara usa una función del navegador
  (`BarcodeDetector`) en vez de una librería**: es una función que ya trae
  el navegador (Chrome/Android la soportan), así que no hace falta sumar
  ninguna dependencia extra. Si el navegador no la soporta (por ejemplo
  Safari), se avisa y se puede seguir usando la búsqueda manual por DNI o
  Código PULSO — nada se rompe, solo se pierde ese atajo.
- **Los campos viejos de la etapa 2** (como "nombre del evento", "número de
  dorsal", "cobertura médica") se dejaron en la base de datos por si se
  necesitan más adelante, pero el formulario nuevo de PULSO no los usa. No
  se borró nada de lo que ya existía.
- **Durante las pruebas de esta etapa se encontró y corrigió un error
  real**: al editar parcialmente un participante (por ejemplo, cambiarle
  solo la medicación), el sistema borraba por accidente el resto de los
  datos que no se habían tocado. Ya está arreglado y probado.

---

## 15. Qué queda pendiente para más adelante

Esto es lo que el usuario pidió explícitamente **no** tocar todavía:

- Gestión de eventos y organizaciones (hoy PULSO no distingue "a qué
  evento" pertenece cada participante).
- Pagos.
- NFC.
- Aplicación móvil nativa.
- API pública (para que otros sistemas se conecten a PULSO).
- Que el participante pueda editar su propio perfil desde su pantalla (hoy
  la API lo permite por atrás, pero no hay un botón "editar" en la pantalla
  de perfil).

---

## 16. Estado del deploy (Vercel + Supabase) — Etapa 4

**Recursos creados:**

| Cosa | Dónde |
|---|---|
| Proyecto Supabase | https://supabase.com/dashboard/project/ktkcanwkzghkcusrwswv |
| Repo GitHub | https://github.com/7upfrancisco-hub/pulso_app (rama `main`) |
| Equipo Vercel | "ffff", proyecto `pulso-app` |

Las credenciales reales (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`) están en
el archivo `.env` local (no se sube a git) y cargadas como variables de
entorno en el proyecto de Vercel. No están repetidas en este documento a
propósito, para no duplicar un secreto en más lugares de los necesarios.

**Lo que ya está hecho (confirmado, no solo "debería andar"):**
- Código migrado de SQLite a Supabase (modelos y controllers async).
- `api/index.js` + `vercel.json` para que Vercel sirva la app de Express
  como función serverless.
- Repo inicializado, primer commit, pusheado a GitHub.
- **Tablas creadas en Supabase** (`participants`, `access_logs`,
  `schema_migrations`) — confirmado corriendo una query real, no solo
  mirando la pantalla del SQL Editor.
- **`npm run seed` corrido contra Supabase con éxito**: los 4 participantes
  de prueba (Marina, Lucas, Valentina, Sofía) ya están cargados en la base
  de la nube, con sus Códigos PULSO generados.
- **Probado localmente de punta a punta contra Supabase** (`npm start`
  apuntando a `.env` con las credenciales reales): `/health` responde
  `db: connected`, la búsqueda de rescate por DNI devuelve los datos
  correctos, y `/api/admin/stats` devuelve las métricas esperas (4
  participantes, 2 con alergias, 1 con medicación, 1 con antecedentes).
  Es decir: **el backend contra Supabase funciona end-to-end en local.**
  Lo único que falta es el deploy en sí.

**Deploy terminado y confirmado en producción** (2026-08-19/20): el
proyecto quedó importado en Vercel con dominio
`https://pulso-app-gamma.vercel.app`, las variables de entorno cargadas
con los nombres correctos (en inglés: `PORT`, `NODE_ENV`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `PUBLIC_BASE_URL`), y `/health` responde
`db: connected` en producción. En el camino aparecieron y se resolvieron
dos problemas reales (no solo de config a mano, sino bugs/errores
concretos):
- La versión de Node que usaba Vercel no coincidía con la esperada
  (`engines.node` tenía un rango `>=22.5.0` que Vercel interpretaba
  distinto a npm/nvm local) → se fijó a `"22.x"` exacto.
- El valor cargado de `SUPABASE_URL` en Vercel apuntaba a
  `ktkcanwkzghkcusrwswv.supabase.com` (dominio del dashboard) en vez de
  `ktkcanwkzghkcusrwswv.supabase.co` (dominio real del proyecto) → typo
  de un caracter que rompía toda la conexión con un error genérico
  (`TypeError: fetch failed`). Para encontrarlo se agregó diagnóstico
  extra a `/health` (cadena de causas + host configurado, sin exponer la
  key) — queda en el código, es útil para diagnosticar futuras fallas de
  conexión sin tener que adivinar.

Los 6 flujos de la sección "Cómo probar cada flujo" ya se probaron a mano
contra la URL pública de Vercel (registro, DNI duplicado rechazado,
búsqueda por DNI/Código en `/rescatista`, panel `/admin`). El escaneo de
QR *desde el navegador* (botón "Escanear QR") no funciona en desktop ni
se probó a fondo en celular porque quedó reemplazado por el enfoque de la
Etapa 5 (ver sección 17): abrir el link del QR con la cámara nativa del
teléfono no depende de esa función del navegador y ya sirve como camino
principal.

---

## 17. Login real por rol — Etapa 5

**Por qué esta etapa**: hasta la Etapa 4, las tres pantallas (Participante,
Rescatista, Admin) eran de acceso libre — cualquiera podía entrar a
cualquiera con solo clickear un link en la home. El usuario pidió
reemplazar eso por login de verdad, con una condición clave: el link del
QR (la forma en que un rescatista real encuentra a un participante) tenía
que seguir funcionando **sin login**, porque en una emergencia real puede
no haber ningún Rescatista registrado cerca — cualquier persona que
encuentre al participante tiene que poder abrir el QR con la cámara de su
celular y ver la ficha al instante.

**Cómo quedó resuelta esa tensión** (login sí, pero sin trabar la
emergencia): el link del QR (`/r/:id`) ya era, desde la Etapa 3, una URL
con un UUID no adivinable — tener el QR físico (pulsera/cartel) en la mano
YA prueba que quien lo escanea encontró al participante. Por eso:
- Abrir el QR (`token=` en `/api/participants/rescue`) → **sigue sin
  login**, cualquiera puede verlo.
- La búsqueda manual en `/rescatista` (por DNI o Código PULSO a mano,
  `dni=`/`pulso_code=` en el mismo endpoint) → **sí exige login de
  Rescatista o Admin**, porque ese camino no prueba presencia física y es
  el que se presta a "espiar" datos de salud de cualquiera.

**Modelo de cuentas:**
- Cada cuenta vive en **Supabase Auth** (email + contraseña) — no se
  reinventó el guardado de contraseñas ni las sesiones a mano.
- Tabla nueva `profiles` (migración `0004_profiles.sql`, con Row Level
  Security activado) vincula esa cuenta a un **DNI** (único) y un
  **rol** (`participante` / `rescatista` / `admin`); si es participante,
  también a su fila en `participants`.
- **El login del día a día es con DNI + contraseña, no con email.** El
  email solo se pide una vez, al crear la cuenta, para que Supabase Auth
  tenga con qué autenticar puertas adentro — el usuario nunca lo vuelve a
  ver ni escribir. El backend resuelve DNI → email antes de validar la
  contraseña.
- **Participante**: se auto-registra en `/registro` (ahora pide también
  email + contraseña). Al enviar, se crea en este orden: la ficha de
  salud (`participants`), la cuenta (Supabase Auth), el perfil
  (`profiles`) — y si un paso falla, se deshacen los anteriores (no debe
  quedar una ficha sin cuenta ni una cuenta sin ficha).
- **Rescatista y Admin**: **no hay auto-registro**. Las crea un Admin ya
  existente desde un formulario nuevo en `/admin` ("Crear cuenta de
  Rescatista o Admin"), porque implican acceso a datos de salud de
  cualquier participante — no es algo que deba poder pedirse solo.
- **Bootstrap del primer admin**: como nadie puede entrar a `/admin` sin
  ya ser admin, hay un script aparte para crear el primero a mano:
  `ADMIN_DNI=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run seed:admin`
  (una sola vez, local o contra producción).
- Los 4 participantes de prueba que carga `npm run seed` (Marina, Lucas,
  Valentina, Sofía) **no tienen cuenta de login** — son solo fichas de
  salud para probar la búsqueda del rescatista, no se puede loguear "como"
  ellos.

**Sesión larga a propósito**: la cookie de sesión dura **60 días** para
los tres roles. Fue un pedido explícito: un rescatista tiene que poder
actuar de inmediato ante una emergencia, sin perder tiempo re-logueándose.

**Un bug real que apareció y se resolvió durante esta etapa** (vale la
pena recordarlo si en el futuro aparecen errores raros de "permiso
denegado" en Supabase): el cliente de Supabase compartido
(`src/db/connection.js`, usado con la service role key para casi todo el
backend) **no se puede usar también para `auth.signInWithPassword`**.
Ese método pisa la sesión interna del cliente que lo llama; si se llama
sobre el cliente compartido, después de un login cualquiera, el servidor
entero queda actuando con los permisos limitados de ESE usuario logueado
en vez de con permisos de servidor — silenciosamente, hasta que algo
protegido por RLS empieza a fallar. Se resolvió armando un cliente
descartable y de un solo uso solo para verificar contraseñas
(`src/db/authClient.js`), que nunca toca el cliente compartido.

**Archivos nuevos**: `src/db/migrations/0004_profiles.sql`,
`src/models/profile.model.js`, `src/utils/session.js` (cookie de sesión
firmada a mano con `node:crypto`, sin sumar dependencias como
`jsonwebtoken` o `cookie-parser`), `src/middleware/auth.middleware.js`,
`src/controllers/auth.controller.js`, `src/routes/auth.routes.js`,
`src/db/authClient.js`, `src/db/seedAdmin.js`, `public/js/login.js`,
`public/js/logout.js`.

**Probado de punta a punta en local contra Supabase real** (no solo
lectura de código): registro de participante, login con DNI+contraseña,
contraseña incorrecta rechazada con mensaje genérico, perfil propio
visible solo con sesión (401 sin ella), admin crea rescatista, rescatista
logueado busca por DNI, página `/admin` redirige a un rescatista que
intenta entrar (a su propia home, no a un error crudo), y — clave — que
el cliente compartido de Supabase siga funcionando con permisos de
servidor después de que alguien se loguee (ahí es donde estaba el bug de
`authClient.js`). Los datos de prueba usados para esto ya se borraron de
la base real.

**Pendiente / no incluido en esta etapa** (para no sobre-alcanzar el
pedido original):
- No hay pantalla de "olvidé mi contraseña" (Supabase Auth la trae
  incorporada, pero no se conectó ninguna vista para eso).
- No hay UI para que un admin cambie el rol de alguien o borre una cuenta
  una vez creada (solo alta, vía `POST /api/admin/users`).
- El botón "Escanear QR" desde el navegador (`/rescatista`) sigue
  dependiendo de `BarcodeDetector`, que no anda en desktop ni en todos los
  celulares — el camino recomendado y ya probado sigue siendo abrir el QR
  con la cámara nativa del teléfono, no el botón de la web (ver sección
  16).
