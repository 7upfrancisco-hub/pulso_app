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
3. **Etapa 3 (la actual) — Pivot a PULSO, MVP completo de punta a punta:**
   se reusó toda la base de las etapas anteriores (nada se reescribió de
   cero) y se agregó todo lo específico de PULSO: Código PULSO, declaración
   jurada, QR, búsqueda por DNI/código/QR, vista de rescate, dashboard de
   admin, y datos de prueba.

---

## 3. Tecnología usada

- **Node.js + Express**: el servidor y las rutas de la API.
- **SQLite**, a través del módulo `node:sqlite` que ya viene incluido en
  Node (no una librería externa). Se eligió así porque la librería más
  común (`better-sqlite3`) necesita compilar código en C++ y esta máquina
  no tiene las herramientas de compilación instaladas (Visual Studio Build
  Tools). El módulo nativo de Node resuelve lo mismo sin ese problema.
- **`qrcode`** (librería chica, sin compilación) para generar la imagen del
  QR.
- **HTML + CSS + JavaScript puro** en el frontend. Sin React, Vue, Angular,
  Bootstrap ni TypeScript — tal como pidió el usuario desde el inicio.

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
  Cuando el servidor arranca, aplica automáticamente los que falten. Esto
  permite que la base de datos "evolucione" de forma prolija y ordenada, en
  vez de editarla a mano.
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
npm run seed               # carga los participantes de prueba
npm start                  # levanta el servidor
```

Después abrís `http://localhost:3000` en el navegador. Desde ahí hay
enlaces a las tres pantallas (Participante, Rescatista, Admin).

Para desarrollar con reinicio automático al guardar cambios: `npm run dev`.

---

## 14. Decisiones técnicas que vale la pena recordar

- **Por qué `node:sqlite` y no otra librería de SQLite**: para evitar
  depender de herramientas de compilación que esta máquina no tiene
  instaladas. Si en algún momento se cambia de máquina o se sube a un
  servidor, esto sigue funcionando igual porque no depende de compilar
  nada.
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

- Login / autenticación real para los 3 roles (hoy cualquiera puede entrar
  a cualquier pantalla).
- Gestión de eventos y organizaciones (hoy PULSO no distingue "a qué
  evento" pertenece cada participante).
- Pagos.
- NFC.
- Aplicación móvil nativa.
- API pública (para que otros sistemas se conecten a PULSO).
- Que el participante pueda editar su propio perfil desde su pantalla (hoy
  la API lo permite por atrás, pero no hay un botón "editar" en la pantalla
  de perfil).
