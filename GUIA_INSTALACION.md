# Guía de instalación — App de Asistencia

Sigue estos pasos en orden. Cada uno toma pocos minutos. No necesitas saber programar.

---

## Parte 1 — Crear la base de datos (Supabase)

1. Entra a **https://supabase.com** y crea una cuenta gratis (puedes usar tu cuenta de Google).
2. Dale clic a **"New project"**.
   - Ponle un nombre, por ejemplo `asistencia-iglesia`.
   - Crea una contraseña para la base de datos y **guárdala en un lugar seguro** (no es la misma que usarán los líderes).
   - Elige la región más cercana a tu país.
3. Espera 1-2 minutos a que el proyecto termine de crearse.
4. En el menú lateral izquierdo, ve a **SQL Editor**.
5. Dale clic a **"New query"**.
6. Abre el archivo `setup_base_datos.sql` (incluido en este proyecto), copia todo su contenido y pégalo en el editor.
7. Dale clic a **"Run"**. Si no aparece nada en rojo, ¡quedó lista tu base de datos!

---

## Parte 2 — Crear las cuentas de los líderes

1. En el menú lateral, ve a **Authentication → Users**.
2. Dale clic a **"Add user"** → **"Create new user"**.
3. Escribe el correo y una contraseña para cada líder que necesite acceso.
4. Marca la opción de **"Auto Confirm User"** para que no necesite confirmar por email.
5. Repite esto por cada líder.

> Más adelante, si quieres, podemos agregar una pantalla para que un administrador cree líderes desde la misma app, sin entrar a Supabase.

---

## Parte 3 — Conectar la app con tu base de datos

1. En Supabase, ve a **Settings** (ícono de engranaje) → **API**.
2. Copia el valor de **"Project URL"**.
3. Copia el valor de **"anon public"** (es una clave larga).
4. Abre el archivo `js/config.js` de este proyecto y reemplaza:
   ```js
   const SUPABASE_URL = "PEGA_AQUI_TU_PROJECT_URL";
   const SUPABASE_ANON_KEY = "PEGA_AQUI_TU_ANON_KEY";
   ```
   con tus valores reales.

---

## Parte 4 — Subir la app a GitHub Pages (para tener una página web)

1. Crea una cuenta gratis en **https://github.com** si no tienes una.
2. Crea un repositorio nuevo (botón verde **"New"**), por ejemplo llamado `asistencia-iglesia`. Puede ser público.
3. Sube **todos los archivos de esta carpeta** (`index.html`, la carpeta `css`, la carpeta `js`) a ese repositorio. Las dos formas más fáciles:
   - Arrastrando los archivos directamente en la página web de GitHub (botón "Add file" → "Upload files"), o
   - Si ya usas Git, con los comandos normales de `git add`, `git commit`, `git push`.
4. Una vez subidos, ve a **Settings → Pages** dentro de tu repositorio.
5. En "Source", elige la rama `main` y la carpeta `/ (root)`. Dale **Save**.
6. Espera 1-2 minutos. GitHub te dará una dirección como:
   `https://tu-usuario.github.io/asistencia-iglesia/`
7. ¡Esa es la dirección que comparte con tus líderes!

---

## Parte 5 — Primer uso

1. Abre la dirección de tu app.
2. Inicia sesión con uno de los correos/contraseñas que creaste en la Parte 2.
3. Ve a la pestaña **"Niños"** y agrega a los primeros niños (ya quedaron creados 3 grupos de ejemplo: Pequeños, Primaria, Preadolescentes — puedes editarlos en Supabase, tabla `grupos`, si quieres otros nombres o rangos de edad).
4. Ve a la pestaña **"Pasar lista"** y empieza a marcar asistencia.

---

## ¿Qué hacer si algo no funciona?

- **"Correo o contraseña incorrectos"**: revisa que el usuario esté creado en Supabase (Parte 2) y que tenga "Auto Confirm User" marcado.
- **La lista de niños no carga / pantalla en blanco**: revisa que copiaste bien la URL y la clave en `js/config.js` (Parte 3), sin espacios extra.
- **No veo cambios después de subir archivos a GitHub**: espera 2-3 minutos, GitHub Pages tarda un poco en actualizar, y prueba refrescando con Ctrl+Shift+R (fuerza recarga sin caché).

Cuando tengas esto funcionando, este mismo patrón (interfaz simple + Supabase + GitHub Pages) lo puedes reutilizar para cualquier otro instrumento de tu trabajo de M&E.
